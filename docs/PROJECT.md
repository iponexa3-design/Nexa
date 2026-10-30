# IPONexa – Project Handbook

The single reference for how IPONexa works, how it is hosted, and how to run,
change and recover it. Keep it up to date when anything here changes.

**Live site:** <https://iponexa.com> · **Last reviewed:** 25 Oct 2026

---

## Contents

1. [What IPONexa is](#1-what-iponexa-is)
2. [Services and accounts](#2-services-and-accounts)
3. [Pages and features](#3-pages-and-features)
4. [How the data works](#4-how-the-data-works)
5. [Code map](#5-code-map)
6. [Configuration (.env.local)](#6-configuration-envlocal)
7. [Working on the code locally](#7-working-on-the-code-locally)
8. [Deploying changes](#8-deploying-changes)
9. [Operations runbook](#9-operations-runbook)
10. [Backups and recovery](#10-backups-and-recovery)
11. [Troubleshooting](#11-troubleshooting)
12. [Security](#12-security)
13. [Decisions and known limitations](#13-decisions-and-known-limitations)
14. [Open items](#14-open-items)

---

## 1. What IPONexa is

An Indian IPO information site: every Mainboard and SME IPO with its grey
market premium (GMP), indicative listing estimates, subscription figures,
and the actual listing-day result once it lists.

- **Stack:** Next.js 16 (App Router, React 19, TypeScript, Tailwind CSS 4),
  PostgreSQL via Prisma 7, Vitest for tests.
- **Hosting:** one DigitalOcean server in Bangalore running the site, the
  database and a daily data refresh.
- **Principle:** never show a made-up number. Missing data is shown as "—"
  (never 0), estimates are labelled as indicative, and actual listing results
  are never replaced by estimates.

## 2. Services and accounts

No passwords or keys are stored in this document or in the repository.

| Service | What it is used for | Where to manage it |
|---|---|---|
| **GoDaddy** | Domains `iponexa.com` (main) and `iponexa.in` (redirects to iponexa.com) | dcc.godaddy.com → Domain Portfolio → DNS |
| **DigitalOcean** | The server ("droplet" `iponexa`, Bangalore `blr1`, 2 GB, Ubuntu 24.04, IP **159.89.167.205**), firewall, weekly droplet backups | cloud.digitalocean.com |
| **IPO Alert** (api.ipoalerts.in) | IPO list and GMP data. Paid plan: **5,000 API calls / month** | IPO Alert dashboard (usage, API keys) |
| **NSE / BSE** | Free public daily price files ("bhavcopy") for listing prices; NSE bid details for subscription; NSE issue information for each IPO's registrar | No account |
| **Let's Encrypt** | Free HTTPS certificates for iponexa.com, iponexa.in and their www names, auto-renewing | Managed on the server by certbot |
| **Google Analytics 4** | Visitor statistics, Measurement ID **G-M69FL95KVH** | analytics.google.com |
| **Google AdSense** | Advertising income, publisher ID **ca-pub-8432429701323264** (Auto ads; placements chosen in the AdSense dashboard) | adsense.google.com |
| **GitHub** | Private code repository `iponexa3-design/Nexa` (backup copy; the server does not pull from it) | github.com |

**DNS (GoDaddy):** iponexa.com `A @ → 159.89.167.205`, `CNAME www → iponexa.com`; iponexa.in `A @ → 159.89.167.205` (and www). Nginx redirects iponexa.in, www.iponexa.in and www.iponexa.com to https://iponexa.com; Let's Encrypt certificates cover all four names.

## 3. Pages and features

| Page | Path | What it shows |
|---|---|---|
| Home | `/` | Hero with counts linking to tracker tabs, "This week in IPOs" calendar, Open / Awaiting listing / Upcoming / Recently listed sections (grid or list view), each showing 12 IPOs with a "Show more" button for the next 12, and a search box that filters all of them |
| Page search | Home, Open / Upcoming / Recently listed, Allotment Status | "Search IPOs on this page" box that filters the IPOs shown on that page as you type, with a link to search all IPOs in the GMP Tracker (which has its own search) |
| GMP Tracker | `/gmp-tracker` | All IPOs in tabs (All, Open, Upcoming, Awaiting listing, Listed), search, Mainboard/SME filter, table or grid view, status colours, compare selection. Listed tab: listing results with a 30/45-day summary strip |
| Subscription | `/ipo-subscription` | Every open, awaiting-listing and recently listed IPO with QIB, NII (above/below Rs 10 lakh), retail, employees, shareholders and total, update time and source; tabs, search, table on desktop and cards on phones |
| Open / Upcoming / Recently listed | `/open-ipos`, `/upcoming-ipos`, `/recently-listed-ipos` | One category each, grid or list view, 12 at a time with "Show more", page search |
| Compare IPO | `/compare?ipos=a,b,c` | 2 or 3 IPOs side by side (issue details, GMP estimate, actual listing) |
| Allotment Status | `/ipo-allotment-status` | Open, awaiting-listing and recently listed (10 days) IPOs with allotment date, stage (out / today / on date) and buttons to the registrar's official allotment page plus BSE / NSE; list of all major registrars and the exchange checks |
| IPO detail | `/ipo/<slug>` | "IPO at a glance" summary written from the page's own data (`buildIpoSummary`), unique meta description, canonical URL, Issue details, dates (allotment date from the issue schedule), allotment status box with registrar link, timeline, GMP and estimate (not listed yet), subscription with a day-wise table (Day 1, 2, 3: QIB, NII, NII above/below Rs 10 lakh, retail, employees, shareholders, total; the last NSE snapshot of each day, recorded by the half-hourly update, so days before deployment or server downtime are missing), actual listing performance (listed), strengths/risks, documents |
| Contact Us | `/contact` (footer link) | Form: name, email, optional subject, message. Saved in the `contact_messages` table and emailed to iponexa3@gmail.com when SMTP is configured (Reply goes to the visitor). Spam trap field and 5 messages / hour per visitor |
| Privacy policy | `/privacy` | What is collected (Google Analytics only after cookie consent, server logs), advertising (AdSense), linked from the footer and the cookie notice |
| About | `/about` | What the site is, every data source and update schedule, how missing/old data is handled, what IPONexa is not (not SEBI-registered), advertising, corrections. Who runs the site appears only once `siteConfig.operator` is filled in |
| Disclaimer / Terms of use | `/disclaimer`, `/terms` | Information-only disclaimer (GMP unofficial, estimates not guaranteed, data may be delayed); terms of use. Linked from every page footer |
| IPO Guides | `/guides`, `/guides/<slug>` | Four original guides: GMP, subscription (QIB/NII/retail), allotment (T+3, retail lottery), listing-gain calculation. Content lives in `src/content/guides.tsx` |
| 404 page | any unknown path | Custom "page not found" with links to the main pages (noindex, HTTP 404) |
| ads.txt | `/ads.txt` | Authorises Google AdSense to sell ads on the site (`google.com, pub-8432429701323264, DIRECT, f08c47fec0942fa0`) |
| Sitemap / robots | `/sitemap.xml`, `/robots.txt` | All pages and guides, plus IPO detail pages that have real data (refreshed daily). Announced IPOs without a price band or dates, and closed IPOs with no listing date more than 10 days after closing, are left out and marked `noindex, follow` until real data arrives (`isIpoIndexable` in `src/services/ipo-summary.ts`) |
| Refresh endpoint | `/api/cron/refresh-ipos` | Protected trigger for a data refresh (`Authorization: Bearer <CRON_SECRET>`); not used by the current server, which has its own scheduler |

Status colours: Open green, Upcoming blue, Awaiting listing violet, Listed amber.
Gains are green, losses red, missing values grey "—".

## 4. How the data works

### 4.1 Sources

| Data | Source | Cost |
|---|---|---|
| IPO list, dates, price band, lot size, issue size, documents | IPO Alert `/ipos` (statuses open, upcoming, closed, listed, announced; 3 per page) | Paid calls |
| GMP (daily figure) | IPO Alert `/ipos/<slug>/gmp` | 1 paid call per IPO |
| Subscription (QIB / NII / retail) | NSE issue information `/api/ipo-detail`, table `activeCat` = **BSE + NSE combined** bids (the official figure; NSE's `bidDetails` / `ipo-bid-details` count only NSE bids and understate mainboard IPOs by about half, as does the IPO Alert snapshot). Updated every 30 min for open IPOs and stamped with NSE's "updated as on" time. Combined figures always win. SME issues on NSE: NSE's official overall figure (`demandGraphALL`, series `SME`; NSE publishes no category multiples for SME). SME issues listed only on BSE: no subscription figures (BSE's API blocks automated access) | Free |
| Listing price + final issue price | NSE/BSE end-of-day bhavcopy files on the listing date | Free |
| Registrar (for allotment links) | NSE issue information (`/api/ipo-detail`), looked up once per IPO during the daily refresh; SME IPOs listed only on BSE are not on NSE and show BSE's check instead | Free |

### 4.2 Daily refresh and the API budget

- Separately, **subscription figures of open IPOs** are updated from NSE every
  30 minutes, Monday to Friday 10:00–19:30 IST (free, no IPO Alert calls; a
  figure NSE has not changed is not stored again).
- The server refreshes **once a day at 20:00 IST** (after the exchanges publish
  listing prices and the day's GMP is in). Restarts never trigger extra runs;
  failed runs are retried at most 3 times that day.
- One refresh uses about **25 IPO Alert calls** (≈17 list pages + ≈8 GMP calls,
  only for IPOs not yet listed), i.e. ≈750 a month.
- A hard cap of **4,500 calls / month** (`IPO_API_MONTHLY_BUDGET`) stops all
  IPO Alert calls once reached; the site keeps showing saved data. Usage is
  counted on the server in `.data/ipoalerts-usage.json` (calendar month, IST).
- The GMP Tracker shows a yellow warning if data is more than 30 hours old.

### 4.3 Rules that decide what is shown

- **Status comes from dates (IST):** upcoming → open → awaiting listing
  (closed, not yet listed) → listed. It changes on time without an API call.
- **Price basis for estimates:** the final issue price when known (from NSE's
  listing-day file), otherwise the **upper end of the price band**, marked
  "upper band".
- **Estimates:** est. listing = issue price + GMP; est. gain/share = GMP;
  est. gain/lot = GMP × lot size; GMP % = GMP ÷ issue price × 100.
- **Listed IPOs** show only actual listing results (listing price = the
  exchange's listing-day opening price); their GMP is no longer shown or fetched.
- **Listing price matching** accepts a row only if it is provably the first
  trading day: NSE previous close equals the issue price (mainboard) or the
  symbol did not trade the day before (NSE SME); BSE previous close is 0.
- **Lists show** listed IPOs for **45 days** after listing (older ones stay in
  the database and on their detail pages). Rights issues, OFS, debt/bonds and
  stale "closed" records without a listing date are excluded. Undated
  "announced" placeholders are hidden once the real IPO appears.

## 5. Code map

```
src/app/                    Pages (App Router) and /api/cron/refresh-ipos
src/components/gmp/         GMP Tracker (tables, cards, summary strip), indicators
src/components/ipo/         IPO cards, list rows, grid/list switch, sections
src/components/home/        Homepage calendar
src/components/layout/      Header, navigation, footer, Google Analytics, AdSense, cookie notice
src/services/
  calculations.ts           Price basis, estimates, actual listing gains, GMP freshness
  gmp-tracker.ts            Derived figures, filters, sorting, listed summary, 45-day window
  ipo-query-service.ts      Reads the database for every page
  ipo-ingest-service.ts     Saves IPOs, GMP, subscription (never overwrites known values with blanks)
  ipo-refresh-service.ts    One full refresh (IPO Alert + NSE + listing prices)
  listing-price-service.ts  Listing prices from NSE/BSE files
src/providers/              IPO Alert adapter (paging, budget), NSE/BSE bhavcopy reader
src/jobs/refresh-scheduler.ts  Daily 20:00 IST scheduler (started from src/instrumentation.ts)
src/utils/api-budget.ts     Monthly API call counter and cap
prisma/                     Database schema and migrations
scripts/                    refresh-live, backfill, set-listing-price
deploy/                     Server setup, deploy, update, rollback, backups, Nginx configs
```

Database tables: `ipos`, `gmp_history` (one row per new GMP value),
`subscriptions`, `data_sources`.

## 6. Configuration (.env.local)

Settings live in `.env.local` (never committed). Template: `.env.example`.
On the server: `/home/ubuntu/iponexa/.env.local`.

| Setting | Server value | Purpose |
|---|---|---|
| `DATABASE_URL` | local PostgreSQL | Database connection |
| `IPO_DATA_PROVIDER` | `http` | Use IPO Alert (`manual` = local JSON file) |
| `IPO_API_BASE_URL` / `IPO_API_KEY` | api.ipoalerts.in / *secret* | IPO Alert access |
| `IPO_API_STATUSES` | `open,upcoming,closed,listed,announced` | Lists to fetch |
| `IPO_API_PAGE_LIMIT` | `3` | Results per call (plan maximum) |
| `IPO_API_CLOSED_LOOKBACK_DAYS` | `7` | How far back to read recently closed IPOs |
| `IPO_API_MONTHLY_BUDGET` | `4500` | Hard monthly call cap (0 = unlimited) |
| `IPO_REFRESH_SCHEDULER` | `on` | Daily refresh on the server (`off` locally) |
| `IPO_REFRESH_DAILY_AT` | `20:00` | Refresh time, IST |
| `CRON_SECRET` | *secret* | Protects `/api/cron/refresh-ipos` |
| `NEXT_PUBLIC_SITE_URL` | `https://iponexa.com` | Site address used in links (build time) |
| `NEXT_PUBLIC_GA_ID` | `G-M69FL95KVH` | Google Analytics (build time) |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | `ca-pub-8432429701323264` | Google AdSense (build time); unset = no ads, no ads.txt entry needed |
| `SMTP_USER` / `SMTP_PASS` | iponexa3@gmail.com / *Gmail app password* | Sends contact-form emails; unset = messages are only saved in the database |
| `SMTP_HOST` / `SMTP_PORT` / `CONTACT_TO_EMAIL` | defaults `smtp.gmail.com` / `465` / `SMTP_USER` | Optional overrides for the mail server and recipient |

`NEXT_PUBLIC_*` values are baked in at build time: run a deploy after changing them.
Other settings take effect after `pm2 restart iponexa --update-env`.

## 7. Working on the code locally

Prerequisites: Node.js 24, a local PostgreSQL database, `.env.local` filled in
(copy `.env.example`).

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run dev                 # http://localhost:3000
```

Checks (all must pass before deploying):

```bash
npx tsc --noEmit            # types
npm run lint                # lint
npm test                    # unit tests (Vitest)
npm run build               # production build
```

Useful data commands: `npm run refresh:live` (one full refresh),
`npm run backfill -- 45` (load the last N days), `npm run listing:set -- <slug> <price>`,
`npm run registrars:fill` (look up registrars on NSE now instead of at the next refresh).
`npm run subscriptions:refresh -- 30` (re-fetch combined subscription figures for IPOs of the last N days).

## 8. Deploying changes

Deployment is **manual on purpose**: nothing goes live unless someone runs a
deploy. Merging on GitHub does not change the live site.

### 8.1 The process

1. Make the change on a branch, commit it.
2. From the project computer, run:
   ```bash
   bash deploy/deploy.sh
   ```
   It refuses uncommitted changes, runs type-check, lint and tests, sends the
   commit to the server's git repository over SSH (`ubuntu@159.89.167.205:iponexa.git`,
   key `~/.ssh/iponexa_server`), runs `deploy/update.sh` there, and checks
   `/`, `/gmp-tracker` and `/compare` return 200.
3. Push the branch to GitHub and merge it into `main` (pull request) so the
   backup copy matches what is live.

`deploy/update.sh` on the server: pull code → install packages → **back up the
database** → apply migrations → build → restart → record the version in
`.data/deploy-history`. The site is unavailable for a few seconds while it restarts.

### 8.2 Rolling back

If a deploy causes a problem:

```bash
ssh -i ~/.ssh/iponexa_server ubuntu@159.89.167.205
cd ~/iponexa
bash deploy/rollback.sh             # the version deployed before the current one
bash deploy/rollback.sh <commit>    # or a specific version from .data/deploy-history
```

Rollback rebuilds the older code; it does **not** undo database migrations
(restore a backup for that, section 10). Fix the problem, then deploy again.

### 8.3 Setting up a new server from scratch

Only needed if the server is lost or replaced.

1. Create a DigitalOcean API token, save it to a file, then
   `node deploy/provision-digitalocean.mjs <token-file>` (creates the droplet,
   firewall, `ubuntu` user and SSH access; prints `SERVER_IP`).
2. Send the code to the new server:
   ```bash
   ssh -i ~/.ssh/iponexa_server ubuntu@<IP> "git init -q --bare ~/iponexa.git"
   GIT_SSH_COMMAND="ssh -i ~/.ssh/iponexa_server" git push ubuntu@<IP>:iponexa.git main
   ssh -i ~/.ssh/iponexa_server ubuntu@<IP> "git clone -q -b main ~/iponexa.git ~/iponexa"
   ```
3. `bash deploy/install-on-server.sh <IP> iponexa.com` — installs Node.js,
   PostgreSQL, Nginx, PM2, firewall, nightly backups, writes `.env.local`,
   copies the IPO Alert key from the local `.env.local`, builds, starts and
   loads 45 days of data.
4. Point the domain's `A @` record to the new IP, then on the server:
   `sudo certbot --nginx -d iponexa.com -d www.iponexa.com --redirect`.
5. Restore the latest database backup if data should be kept (section 10).

## 9. Operations runbook

Log in: `ssh -i ~/.ssh/iponexa_server ubuntu@159.89.167.205`, then `cd ~/iponexa`.

| Task | Command |
|---|---|
| Is the site running? | `pm2 status` |
| Recent logs and errors | `pm2 logs iponexa --lines 100` |
| Restart the site | `pm2 restart iponexa --update-env` |
| Refresh data now (uses ≈25 API calls) | `npm run refresh:live` |
| API calls used this month | `cat .data/ipoalerts-usage.json` |
| Last daily refresh | `cat .data/refresh-state.json` and `pm2 logs iponexa \| grep "Daily IPO refresh"` |
| Enter a listing price by hand | `npm run listing:set -- <slug> <price>` |
| Listed IPOs still missing a price | `npm run listing:set -- missing` |
| Deployed versions | `cat .data/deploy-history` |
| Database backups | `ls -lh ~/backups` and `cat ~/backups/backup.log` |
| Certificate status | `sudo certbot certificates` |
| Disk / memory | `df -h /` · `free -m` |

Visitor statistics: Google Analytics → Reports → Realtime (live) and Reports →
Engagement (daily). Ad blockers hide visits from browsers that use them.
Analytics uses Consent Mode: cookies are set only after a visitor clicks
"Accept" in the cookie notice; without consent GA gets cookieless signals only.

Advertising: Google AdSense with Auto ads. The site loads the AdSense script,
the `google-adsense-account` verification meta tag and `/ads.txt`; where and how
many ads appear is set in AdSense → Ads → By site. The same Consent Mode choice
applies: without "Accept", AdSense shows non-personalised ads only. The consent
defaults are an inline script at the top of `<body>` so they always run before
any Google script. Earnings: AdSense → Reports.

Scheduled jobs on the server (`crontab -l`): nightly database backup (21:00
UTC). `deploy/auto-domain-redirect.sh` can be scheduled the same way for any
future extra domain: it waits for the DNS change, obtains a certificate,
redirects to https://iponexa.com and removes itself (used for iponexa.in).

## 10. Backups and recovery

| Backup | When | Kept | Where |
|---|---|---|---|
| Database dump | Daily 02:30 IST (cron) and before every deploy | 14 days | `~/backups/iponexa-YYYYMMDD-HHMM.sql.gz` on the server |
| Whole server | Weekly | DigitalOcean default | DigitalOcean → Droplet → Backups |

**Restore the database** (replaces current data; take a fresh backup first):

```bash
cd ~/iponexa
bash deploy/backup-db.sh                         # safety copy of the current state
pm2 stop iponexa
URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2- | sed 's/?.*//')
psql "$URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
gunzip -c ~/backups/iponexa-YYYYMMDD-HHMM.sql.gz | psql "$URL"
pm2 start iponexa
```

Backups live on the same server; the weekly DigitalOcean backup covers the
case of losing the whole server. Copying backups off the server is an open item.

## 11. Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Site shows **502** | App not running or just restarting. Wait 30 s; then `pm2 logs iponexa --lines 100`, `pm2 restart iponexa`, or `bash deploy/update.sh` |
| Yellow "last refreshed … hours ago" on the tracker | Daily refresh failed or budget reached. Check `pm2 logs iponexa \| grep refresh` and `.data/ipoalerts-usage.json`; a common cause is an expired `IPO_API_KEY` |
| "Monthly API budget … reached" in logs | 4,500 calls used; refresh resumes next month. Raise `IPO_API_MONTHLY_BUDGET` only if the plan allows |
| A listed IPO has no listing price | Exchange file missing that day or listing date wrong at the source: `npm run listing:set -- <slug> <price>` |
| Site works in one browser, not another | That browser cached the old (pre-launch) address: close it fully, clear its DNS cache (`edge://net-internals/#dns` / `chrome://net-internals/#dns`) and cached files |
| Google Analytics shows nothing | Check Reports → Realtime while visiting from a phone without an ad blocker; the "no data received" banner can lag up to 48 h |
| No ads showing | Normal until Google approves the site (AdSense → Sites, can take days to weeks) and Auto ads is on; ad blockers hide ads; check `/ads.txt` is reachable |
| HTTPS certificate error | `sudo certbot renew` then `sudo systemctl reload nginx` |

## 12. Security

- Secrets exist only in `.env.local` (server and project computer), never in
  Git, chat or documents. Rotate the IPO Alert key if it is ever exposed.
- Server access is by SSH key only (`~/.ssh/iponexa_server` on the project
  computer). Firewall allows only SSH, HTTP and HTTPS; the database is not
  reachable from outside.
- The app runs as the `ubuntu` user behind Nginx, bound to 127.0.0.1:3000.
- DigitalOcean API tokens are only needed to create a new server; delete them
  afterwards.
- Before scaling up or monetising, review the IPO Alert terms and the NSE/BSE
  website terms for commercial use of the data (the site now carries ads),
  and have the privacy policy at `/privacy` reviewed (Google Analytics and
  AdSense use cookies; India's DPDP Act applies).

## 13. Decisions and known limitations

- **Daily refresh** (not hourly) keeps IPO Alert usage around 750 calls/month on
  a 5,000-call plan; GMP changes only once a day at the source anyway.
- **Listing prices are available the evening of the listing day** (when the
  exchanges publish their files), not at the 10 am open.
- **Upper-band assumption:** where the final issue price is not published
  (mostly BSE-only issues), gains are measured against the upper price band.
- **Announced IPOs** have no dates or prices until the issue is scheduled.
- **History window:** lists show 45 days of listed IPOs; older records are kept.
- **Single server, single process:** a deploy causes a few seconds of downtime;
  the daily scheduler must run in exactly one process.
- **Manual deployment** is a deliberate choice; automatic deploys from GitHub
  can be added later (GitHub Actions + a server deploy key).

## 14. Open items

- Check the domains are not listed for sale on Afternic.
- Create a fresh IPO Alert API key and put it on the server; correct
  `.data/ipoalerts-usage.json` to the real count from the IPO Alert dashboard.
- Register the site in Google Search Console and submit
  `https://iponexa.com/sitemap.xml`. Have the privacy policy reviewed.
- Create a Gmail app password for iponexa3@gmail.com and set `SMTP_USER` /
  `SMTP_PASS` on the server so contact messages are emailed (until then they
  are saved in `contact_messages` only).
- Copy database backups off the server (e.g. DigitalOcean Spaces).
