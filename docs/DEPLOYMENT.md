# Putting IPONexa online

IPONexa runs on one small server in India with Cloudflare in front of it.
Most of the setup is automated from the project computer; the steps that
need a person (accounts, payment, a domain) are marked **You**.

| Piece | Service | Approx. cost |
|---|---|---|
| Server (website, database, automatic data refresh) | DigitalOcean droplet, Bangalore, 2 GB, Ubuntu 24.04 | about US$12 / month + backups |
| Speed, security and HTTPS | Cloudflare, free plan | free |
| Website address | a domain, e.g. `iponexa.in` | about ₹500–900 / year |

Prices change; check each provider when signing up.

---

## 1. Create the server

**You** (once, about 10 minutes):

1. Sign up at <https://www.digitalocean.com> and add a card or PayPal.
2. Left menu **API** → **Generate New Token** → name `iponexa`, expiration
   **30 days**, scopes **Full Access** → **Generate Token**.
3. Copy the token (starts with `dop_v1_`), paste it into Notepad and save it
   as `C:\Users\regun\Downloads\digitalocean-token.txt`.

**Automated** (run from the project folder on this computer):

```bash
node deploy/provision-digitalocean.mjs
```

It creates, or reuses if they already exist: an SSH login key, the
Bangalore droplet with weekly backups and an `ubuntu` admin user, and a
firewall that allows only SSH, HTTP and HTTPS. It finishes by printing
`SERVER_IP=…`.

## 2. Install the site

```bash
bash deploy/install-on-server.sh <SERVER_IP>
```

This logs into the server with `~/.ssh/iponexa_server`, downloads the code
from GitHub (`main`), runs `deploy/setup-server.sh` (Node.js, PostgreSQL,
Nginx, PM2, firewall, settings), copies the IPO Alert key from the local
`.env.local`, builds and starts the site, and loads the last 45 days of IPO
data. The site is then live at `http://<SERVER_IP>`, and refreshes IPOs, GMP,
subscription and listing prices by itself every 3 hours.

## 3. Connect the domain (Cloudflare)

**You:**

1. Buy a domain (Cloudflare Registrar, GoDaddy, Hostinger, Namecheap…).
2. Create a free account at <https://dash.cloudflare.com> → **Add a site** →
   your domain → **Free** plan. If the domain was bought elsewhere, replace its
   nameservers at the registrar with the two Cloudflare shows.
3. Cloudflare → **DNS** → **Records**: add type **A**, name **@**, value =
   `SERVER_IP`, proxy **on**; and the same with name **www**.

Then on the server, switch the settings from the IP to the domain:

```bash
ssh -i ~/.ssh/iponexa_server ubuntu@<SERVER_IP>
cd ~/iponexa
sed -i 's|^NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=https://yourdomain.in|' .env.local
bash deploy/update.sh
```

## 4. Turn on HTTPS

1. Cloudflare → **SSL/TLS** → **Origin Server** → **Create Certificate**
   (defaults, 15 years).
2. On the server, save the two parts it shows:
   ```bash
   sudo mkdir -p /etc/ssl/cloudflare
   sudo nano /etc/ssl/cloudflare/origin.pem   # paste "Origin Certificate", Ctrl+O, Enter, Ctrl+X
   sudo nano /etc/ssl/cloudflare/origin.key   # paste "Private Key", save the same way
   sudo bash deploy/enable-https.sh yourdomain.in
   ```
3. Cloudflare → **SSL/TLS** → **Overview** → mode **Full (strict)**; then
   **Edge Certificates** → turn on **Always Use HTTPS**.

---

## Everyday tasks

Log in first: `ssh -i ~/.ssh/iponexa_server ubuntu@<SERVER_IP>`, then `cd ~/iponexa`.

| Task | Command |
|---|---|
| Publish new code (after it is merged into `main` on GitHub) | `bash deploy/update.sh` |
| Is the site running? | `pm2 status` |
| Recent logs and errors | `pm2 logs iponexa --lines 100` |
| Restart the site | `pm2 restart iponexa` |
| Refresh IPO data now | `npm run refresh:live` |
| Enter a listing price by hand | `npm run listing:set -- <slug> <price>` |

## If something goes wrong

- **Site shows "502 Bad Gateway":** the app is not running. Check
  `pm2 logs iponexa --lines 100`, then run `bash deploy/update.sh`.
- **Cloudflare error 526:** the origin certificate files are missing or were
  pasted incorrectly; repeat step 4.
- **Yellow "last refreshed … hours ago" warning on the GMP Tracker:** look for
  "Scheduled IPO refresh failed" in `pm2 logs iponexa`. A common cause is an
  expired `IPO_API_KEY` in `.env.local`; fix it and run
  `pm2 restart iponexa --update-env`.
- **Disk filling up:** `pm2 flush` clears old logs.

## Security notes

- The DigitalOcean token expires after 30 days; that is intended. Create a new
  one only if the server needs to be re-provisioned.
- Generate a fresh IPO Alert key for production and never paste keys into
  chats, emails or GitHub.
- The GitHub repository is public: anyone can read the code (it contains no
  secrets). Make it private under GitHub → Settings if preferred; the server
  would then need a deploy key to download updates.
- Before launching publicly, check the IPO Alert terms and the NSE/BSE website
  terms for commercial use of the data shown on the site.
