# Putting IPONexa online

This guide takes you from nothing to a live site, one step at a time. No
server experience is needed: every command is meant to be copied and pasted.

**What you will set up**

| Piece | Service | Approx. cost |
|---|---|---|
| Server (runs the website, database and automatic data refresh) | AWS Lightsail, Mumbai, Ubuntu 24.04, 2 GB plan | about US$12 / month |
| Speed, security and HTTPS | Cloudflare, free plan | free |
| Website address | a domain, e.g. `iponexa.in` | about ₹500–900 / year |

Prices change; check the Lightsail pricing page when you sign up. Lightsail
often runs a free trial on its smaller plans.

**Time needed:** about 1–2 hours the first time.

**Before you start:** the latest code must be on GitHub
(`github.com/iponexa3-design/Nexa`), because the server downloads it from there.

---

## Step 1 – Buy a domain

Buy a domain from any registrar (GoDaddy, Hostinger, Namecheap, BigRock…).
You only need the domain itself; skip any hosting or email add-ons.

## Step 2 – Create the server on AWS Lightsail

1. Go to <https://lightsail.aws.amazon.com> and create an AWS account
   (a card is required; you are billed monthly).
2. Click **Create instance**.
3. **Region:** choose **Mumbai (ap-south-1)**.
4. **Platform:** Linux/Unix. **Blueprint:** *OS Only* → **Ubuntu 24.04 LTS**.
5. **Plan:** the **2 GB RAM** plan.
6. Name it `iponexa` and click **Create instance**. Wait until it shows *Running*.
7. Open the instance → **Networking** tab:
   - Click **Attach static IP** → create one. This IP address never changes;
     write it down (e.g. `13.233.x.x`).
   - Under **IPv4 Firewall**, make sure **HTTP (80)** and **HTTPS (443)** are
     allowed (add them if missing). SSH (22) is already there.
8. Open the **Snapshots** tab → turn on **Automatic snapshots** (daily backup
   of the whole server, including the database; costs a little extra).

## Step 3 – Connect to the server

On the instance page, click **Connect using SSH**. A black terminal window
opens in your browser. All the commands below are typed there.

## Step 4 – Download the code onto the server

The GitHub repository is private, so the server needs permission to read it.

1. Create a key on the server (press Enter at every question):
   ```bash
   ssh-keygen -t ed25519 -C "iponexa-server"
   cat ~/.ssh/id_ed25519.pub
   ```
2. Copy the line it prints (starts with `ssh-ed25519`).
3. On GitHub, open the repository → **Settings** → **Deploy keys** →
   **Add deploy key**. Title: `Lightsail server`. Paste the line.
   Leave *Allow write access* **unticked**. Save.
4. Back in the server terminal:
   ```bash
   cd ~
   git clone git@github.com:iponexa3-design/Nexa.git iponexa
   cd iponexa
   ```
   Type `yes` if it asks whether to trust github.com.

## Step 5 – Install everything (one command)

Replace `iponexa.in` with your domain:

```bash
sudo bash deploy/setup-server.sh iponexa.in
```

This takes 5–10 minutes. It installs Node.js, the PostgreSQL database, Nginx
and PM2, creates the database with a random password, writes the settings
file `.env.local`, turns on the firewall and sets the app to start again
automatically if the server restarts.

## Step 6 – Add your IPO Alert API key

```bash
nano .env.local
```

Find the line `IPO_API_KEY=` and paste your key after the `=`.
Save with **Ctrl + O**, **Enter**, then exit with **Ctrl + X**.

> Generate a fresh key in the IPO Alert dashboard for the server. Never paste
> keys into chats, emails or GitHub.

## Step 7 – Build and start the website

```bash
bash deploy/update.sh
```

Takes a few minutes. When it finishes, `pm2 status` should show `iponexa` as
**online**. Then load the last 45 days of IPO history once:

```bash
npm run backfill
```

From now on the server refreshes IPOs, GMP, subscription and listing prices
by itself every 3 hours.

## Step 8 – Connect the domain through Cloudflare

1. Create a free account at <https://dash.cloudflare.com> → **Add a site** →
   enter your domain → choose the **Free** plan.
2. Cloudflare shows two **nameservers**. At your domain registrar, replace the
   existing nameservers with these two. (This can take a few minutes to a few
   hours to take effect; Cloudflare emails you when it is active.)
3. In Cloudflare → **DNS** → **Records**, add:
   - Type **A**, Name **@**, IPv4 address = your static IP, Proxy **on** (orange cloud)
   - Type **A**, Name **www**, IPv4 address = your static IP, Proxy **on**

## Step 9 – Turn on HTTPS

1. In Cloudflare → **SSL/TLS** → **Origin Server** → **Create Certificate**.
   Keep the defaults (15 years) and click **Create**.
2. On the server, create the folder and the two files:
   ```bash
   sudo mkdir -p /etc/ssl/cloudflare
   sudo nano /etc/ssl/cloudflare/origin.pem
   ```
   Paste the **Origin Certificate**, save (Ctrl + O, Enter) and exit (Ctrl + X).
   ```bash
   sudo nano /etc/ssl/cloudflare/origin.key
   ```
   Paste the **Private Key**, save and exit.
3. Switch the server to HTTPS:
   ```bash
   sudo bash deploy/enable-https.sh iponexa.in
   ```
4. In Cloudflare → **SSL/TLS** → **Overview**, set the mode to **Full (strict)**.
5. In Cloudflare → **SSL/TLS** → **Edge Certificates**, turn on
   **Always Use HTTPS**.

Open `https://your-domain` in a browser: the site is live.

---

## Everyday tasks

| Task | Command (in the server terminal, inside `~/iponexa`) |
|---|---|
| Publish new code (after pushing to GitHub) | `bash deploy/update.sh` |
| Is the site running? | `pm2 status` |
| See recent logs and errors | `pm2 logs iponexa --lines 100` |
| Restart the site | `pm2 restart iponexa` |
| Refresh IPO data right now | `npm run refresh:live` |
| Enter a listing price by hand | `npm run listing:set -- <slug> <price>` |

## If something goes wrong

- **Site shows "502 Bad Gateway":** the app is not running. Run `pm2 status`,
  then `pm2 logs iponexa --lines 100` to see why, and `bash deploy/update.sh`
  to rebuild and restart.
- **Cloudflare error 526 (invalid SSL certificate):** the origin certificate
  files are missing or were pasted incorrectly. Repeat Step 9.
- **Old data on the GMP Tracker** (a yellow "last refreshed" warning): check
  `pm2 logs iponexa` for "Scheduled IPO refresh failed" messages; a common
  cause is an expired or wrong `IPO_API_KEY` in `.env.local` (fix it, then run
  `pm2 restart iponexa --update-env`).
- **Server ran out of disk:** Lightsail → instance → *Storage*; old logs can be
  cleared with `pm2 flush`.

## Before launching publicly

- Check the IPO Alert terms (and any attribution they require) and the NSE/BSE
  website terms for commercial use of the data shown on the site.
- Keep Lightsail automatic snapshots on; they are your backup.
