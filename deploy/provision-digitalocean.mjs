// Creates the IPONexa server on DigitalOcean (Bangalore) through the official API.
//
//   node deploy/provision-digitalocean.mjs [path-to-token-file]
//
// Token file default: ~/Downloads/digitalocean-token.txt (never printed).
// Creates, or reuses if already there: the SSH key, a 2 GB Ubuntu 24.04
// droplet with weekly backups and an "ubuntu" sudo user, and a firewall
// allowing only SSH, HTTP and HTTPS. Prints the server's IP address.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const NAME = "iponexa";
const REGION = "blr1";
const SIZE = "s-1vcpu-2gb";
const IMAGE = "ubuntu-24-04-x64";

const tokenFile = process.argv[2] ?? join(homedir(), "Downloads", "digitalocean-token.txt");
const token = readFileSync(tokenFile, "utf8").trim();
const publicKey = readFileSync(join(homedir(), ".ssh", "iponexa_server.pub"), "utf8").trim();

async function api(method, path, body) {
  const response = await fetch(`https://api.digitalocean.com/v2${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(`${method} ${path} failed (${response.status}): ${data.message ?? text}`);
  return data;
}

const account = await api("GET", "/account");
console.log(`Account OK (status: ${account.account.status}, droplet limit: ${account.account.droplet_limit})`);
if (account.account.status !== "active") {
  throw new Error(`DigitalOcean account is "${account.account.status}", not active yet: ${account.account.status_message ?? ""}`);
}

const region = (await api("GET", "/regions")).regions.find((r) => r.slug === REGION);
if (!region?.available || !region.sizes.includes(SIZE)) throw new Error(`${SIZE} is not available in ${REGION}`);

// SSH key (reuse when the same key was uploaded before).
const fingerprintMatch = (await api("GET", "/account/keys?per_page=200")).ssh_keys.find(
  (key) => key.public_key.trim().split(" ").slice(0, 2).join(" ") === publicKey.split(" ").slice(0, 2).join(" "),
);
const sshKey = fingerprintMatch ?? (await api("POST", "/account/keys", { name: `${NAME}-setup`, public_key: publicKey })).ssh_key;
console.log(`SSH key ready (id ${sshKey.id})`);

// Droplet.
const userData = `#cloud-config
users:
  - default
  - name: ubuntu
    groups: sudo
    shell: /bin/bash
    sudo: "ALL=(ALL) NOPASSWD:ALL"
    ssh_authorized_keys:
      - ${publicKey}
`;
let droplet = (await api("GET", `/droplets?tag_name=${NAME}`)).droplets.find((d) => d.name === NAME);
if (droplet) {
  console.log(`Droplet "${NAME}" already exists (id ${droplet.id}); reusing it`);
} else {
  droplet = (
    await api("POST", "/droplets", {
      name: NAME,
      region: REGION,
      size: SIZE,
      image: IMAGE,
      ssh_keys: [sshKey.id],
      backups: true,
      monitoring: true,
      ipv6: true,
      tags: [NAME],
      user_data: userData,
    })
  ).droplet;
  console.log(`Droplet created (id ${droplet.id}); waiting for it to start...`);
}
for (let attempt = 0; attempt < 60 && droplet.status !== "active"; attempt++) {
  await new Promise((resolve) => setTimeout(resolve, 5000));
  droplet = (await api("GET", `/droplets/${droplet.id}`)).droplet;
}
if (droplet.status !== "active") throw new Error(`Droplet did not become active (status ${droplet.status})`);
const ip = droplet.networks.v4.find((n) => n.type === "public")?.ip_address;

// Firewall: SSH, HTTP, HTTPS in; everything out.
const firewalls = (await api("GET", "/firewalls")).firewalls;
if (!firewalls.some((f) => f.name === NAME)) {
  const anywhere = { addresses: ["0.0.0.0/0", "::/0"] };
  await api("POST", "/firewalls", {
    name: NAME,
    droplet_ids: [droplet.id],
    inbound_rules: ["22", "80", "443"].map((ports) => ({ protocol: "tcp", ports, sources: anywhere })),
    outbound_rules: ["tcp", "udp"].map((protocol) => ({ protocol, ports: "all", destinations: anywhere }))
      .concat([{ protocol: "icmp", destinations: anywhere }]),
  });
  console.log("Firewall created (SSH, HTTP, HTTPS only)");
}

console.log("==========================================");
console.log(`SERVER_IP=${ip}`);
console.log("==========================================");
