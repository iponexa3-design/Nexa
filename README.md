# IPONexa

Indian IPO GMP tracker with indicative listing estimates and actual
listing-day results. Live at <https://iponexa.com>.

**Start here: [docs/PROJECT.md](docs/PROJECT.md)** — the project handbook
(services and accounts, features, how the data works, code map,
configuration, deploying, rollback, backups, troubleshooting).

## Quick start (local)

```bash
cp .env.example .env.local      # then fill in DATABASE_URL and the IPO Alert settings
npm ci
npx prisma generate
npx prisma migrate deploy
npm run dev                     # http://localhost:3000
```

## Common commands

| Command | Purpose |
|---|---|
| `npm test` / `npm run lint` / `npx tsc --noEmit` | Checks |
| `npm run build` | Production build |
| `npm run refresh:live` | One full data refresh |
| `npm run backfill -- 45` | Load the last 45 days of IPOs |
| `npm run listing:set -- <slug> <price>` | Enter a listing price by hand |
| `bash deploy/deploy.sh` | Deploy the current commit to the live server |
