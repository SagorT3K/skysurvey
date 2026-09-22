# SkySurvey

A get-paid-to survey platform: users take surveys sourced from a survey router,
earn coins, and redeem them for PayPal cash or gift cards. Built with Next.js 16
(App Router), Prisma and Tailwind CSS.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Database](https://img.shields.io/badge/database-SQLite%20%7C%20PostgreSQL-336791?style=flat-square)](prisma/schema.prisma)

Deployed: <https://skysurvey.vercel.app>

## Features

| Area | What it does |
| --- | --- |
| Accounts | Email signup with a hashed verification code by mail (Brevo), login with httpOnly JWT cookies, optional Cloudflare Turnstile / reCAPTCHA on signup |
| Dashboard | Live surveys as individual router offers or one survey wall, attempt tracking per user |
| Earnings | Coin ledger, daily check-in bonus, level progression, leaderboard, referral links |
| Rewards | Redeem coins for PayPal cash or gift cards, admin approval queue, hold period before payout |
| Routing | `SurveyAttempt.txId` is echoed back by the router so completions and reversals map to the right attempt; every callback is stored in `PostbackLog` and shown at `/admin/postbacks` |
| Trust & safety | Bot user-agent screening, optional proxy/VPN lookup, optional accounts-per-IP limit, flagged-account review queue that blocks withdrawals until cleared |
| Notifications | In-app notification bell (plus optional email) and post-survey feedback/ratings |
| Admin | `/admin` panel for users, redemptions, router status, postback log and business config (coin rate, reward share, hold period, bonuses, fraud limits) |

They are backed by 13 Prisma models — from `User`, `Survey`, `SurveyAttempt` and
`RedeemRequest` through `CoinTransaction`, `PostbackTxn`, `Notification`, `Config` and
`ActivityLog`. Survey routers (CPX Research, Torox, inBrain, BitLabs …) are configured
entirely through environment variables; see [PROVIDERS-SETUP.md](PROVIDERS-SETUP.md) for the
verified per-router notes.

## Hosting: this app cannot run on GitHub Pages

GitHub Pages serves static files only. This project needs a Node server, because:

- 11 API routes handle signup, login, survey entry, redemptions and admin actions
- the router postback endpoint (`/api/postback/[provider]`) must receive
  server-to-server callbacks — a static host has nowhere for them to land
- the dashboard, rewards and admin pages are server-rendered per request
- sessions are httpOnly JWT cookies set by the server
- data lives in a database via Prisma

A static export fails outright:

```
Error: Page "/api/admin/redeems/[id]" is missing "generateStaticParams()"
so it cannot be used with "output: export" config.
```

Deploy to a host that runs Node instead:

| Host | Database | Cost |
| --- | --- | --- |
| **Any VPS** (`docker-compose.yml`) | The SQLite file, in a Docker volume | Paid, or free on Oracle Cloud Always Free |
| **Fly.io** (`fly.toml`) | The SQLite file, on a Fly volume | Pay as you go |
| Vercel | Hosted Postgres (Neon free tier) | Free, but Hobby is non-commercial use only |

Render's free plan cannot host this app: free services get no persistent disk, so
SQLite is impossible, and free Render Postgres databases are deleted 30 days
after creation.

### Deploying to a VPS

The most capable option: a real server, no serverless limits, SQLite works as-is.
`docker-compose.yml` runs the app plus Caddy, which fetches a Let's Encrypt
certificate automatically once `DOMAIN` points at the server.

```bash
# on the server
curl -fsSL https://raw.githubusercontent.com/SagorT3K/skysurvey/main/scripts/vps-setup.sh | bash

git clone https://github.com/SagorT3K/skysurvey.git && cd skysurvey
cp .env.example .env          # set JWT_SECRET, ADMIN_PASSWORD, DOMAIN
docker compose up -d --build
docker compose logs -f app
```

`scripts/vps-setup.sh` installs Docker, opens TCP 80/443 on the host firewall and
adds swap. On Oracle Cloud specifically, opening the ports takes **two** changes
and missing either one looks identical from outside:

- the subnet's security list needs stateful ingress rules for TCP 80 and 443
- the instance's own iptables chain allows only TCP 22 by default and ends in a
  `REJECT`, so a rule appended with `-A` lands after it and silently never
  matches — the script inserts before that line instead

Do not use `ufw` on an OCI Ubuntu image; Oracle warns it can leave the instance
unable to boot. Never run `iptables -F` either, as that removes the iSCSI rules
protecting the boot volume.

The database lives in the `skysurvey-data` volume, so `docker compose down` and
rebuilds do not lose it. Back it up with:

```bash
docker compose exec app sh -c 'cat /data/skysurvey.db' > backup-$(date +%F).db
```

### Deploying to Fly.io

`Dockerfile`, `fly.toml` and `docker-entrypoint.sh` are committed, and the SQLite
database lives on a Fly volume at `/data`, so no separate database is needed.

```bash
flyctl auth login

fly apps create skysurvey --org personal
fly volumes create skysurvey_data --size 1 --region sin --yes

fly secrets set \
  JWT_SECRET="$(openssl rand -hex 32)" \
  ADMIN_EMAIL="you@example.com" \
  ADMIN_PASSWORD="a-strong-password"

# --ha=false is required: fly deploy otherwise starts two machines for high
# availability, and each would get its own volume with its own copy of the data.
# --remote-only builds on Fly, so no local Docker is needed.
fly deploy --remote-only --ha=false
fly open
```

On first boot the entrypoint applies the schema with `prisma db push` and seeds
the config, admin account and demo surveys. Both steps are idempotent, so later
restarts leave existing data alone. Fly release commands run without volumes
attached, which is why this happens at container start rather than as a
`release_command`.

**This app must stay on one machine.** SQLite allows a single writer, and two Fly
machines would get two independent volumes whose data silently diverges. Deploy
with `--ha=false`, do not run `fly scale count 2`, and to grow beyond one machine
move to Postgres first.

### Deploying to Vercel

Vercel is not a static host either — it runs the full app — but its filesystem is
read-only, so SQLite is out and a hosted Postgres is required. The datasource
block is patched at build time from `DATABASE_PROVIDER`, because Prisma does not
accept `env()` for the provider; the schema itself validates against Postgres
unchanged, and no query in `src/` uses raw SQL.

1. Create a Neon project (its free plan is permanent and needs no card) and copy
   **both** connection strings. They differ by `-pooler` in the hostname:
   the pooled one is for the app, because serverless functions open many
   short-lived connections; the direct one is for schema operations.
2. Create the tables and demo rows once, from your machine:

   ```bash
   DATABASE_PROVIDER=postgresql \
   DATABASE_URL="<pooled>" \
   DATABASE_URL_UNPOOLED="<direct>" \
   npm run db:push

   DATABASE_PROVIDER=postgresql DATABASE_URL="<pooled>" \
   ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="a-strong-password" \
   npm run db:seed
   ```

3. Import this repository on Vercel; leave the build command alone, since
   `npm run build` already runs `prisma generate`. Set these variables:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_PROVIDER` | `postgresql` |
   | `DATABASE_URL` | the **pooled** connection string |
   | `DATABASE_URL_UNPOOLED` | the **direct** connection string |
   | `JWT_SECRET` | a long random string, not the local one |

Append `connect_timeout=15` to both connection strings. Neon's free compute
scales to zero and takes a few seconds to wake, which otherwise surfaces as a
`P1001` "can't reach database server" error on the first request.

Note that Vercel's Hobby plan is documented as non-commercial, personal use only,
so it suits testing rather than a site that earns router revenue.

Local development is unaffected either way: `DATABASE_PROVIDER` defaults to
`sqlite`, so the committed schema and `prisma/dev.db` keep working.

### Admin account

The seed reads `ADMIN_EMAIL` and `ADMIN_PASSWORD`. With `NODE_ENV=production` and
no `ADMIN_PASSWORD` set it refuses to run rather than create an account with the
password published in this repository. Locally it falls back to
`admin@skysurvey.com` / `Admin@123`.

## Local development

```bash
npm install
cp .env.example .env      # then fill in JWT_SECRET
npx prisma db push
node prisma/seed.js
npm run dev
```

| Script | What it runs |
| --- | --- |
| `npm run dev` | `next dev` |
| `npm run build` | patches the datasource from `DATABASE_PROVIDER`, runs `prisma generate`, then `next build` |
| `npm start` | `next start` (production server) |
| `npm run lint` | ESLint |
| `npm run db:push` | `prisma db push` against whichever provider `DATABASE_PROVIDER` selects |
| `npm run db:seed` | `prisma/seed.js` — business config, the admin account and demo surveys (idempotent) |

### Project structure

```
skysurvey/
├── src/app/                 pages (dashboard, rewards, leaderboard, profile, legal …),
│                            the /admin panel, and the API route handlers
├── src/components/          UI components + admin components
├── src/lib/                 auth, captcha, config, ledger, score, fraud, mailer,
│                            providers, redeem, notify, live-surveys
├── prisma/schema.prisma     13 models; dev.db is the local SQLite file
├── prisma/seed.js           config + admin + demo surveys
├── scripts/                 Neon helpers, VPS setup, one-off maintenance tasks
├── docker-compose.yml       app + Caddy (automatic Let's Encrypt) for VPS deploys
├── Dockerfile / fly.toml    Fly.io deploy — SQLite on a volume
└── PROVIDERS-SETUP.md       per-router integration notes
```

## Configuration

Business settings (coin rate, reward share, hold period, bonuses, fraud limits)
live in the `Config` table and are editable at `/admin/config`. Router
credentials and fraud-vendor keys are environment variables — see
[.env.example](.env.example).

## Survey router integration

Surveys are `provider = "mock"` until a router approves your publisher
application. Once you have credentials:

1. Fill in the `PROVIDER_*` variables for that router and list its key in `PROVIDERS`.
2. Give the router your postback URL: `https://your-domain/api/postback/<key>`.
3. Insert surveys with `provider` set to the same key.

Entry links carry `SurveyAttempt.txId`, which the router echoes back in the
postback so completions and reversals map to the right attempt. Every callback is
recorded in `PostbackLog` and visible at `/admin/postbacks`.

The postback route is unauthenticated by design — routers call it without a
session — so **the signature check is the access control**. Never run a provider
with `SIG_MODE=none` outside local testing, and set `IP_ALLOWLIST` when the
router publishes its source IPs.

## Fraud screening

Survey entry is screened before an attempt is created: bot user agents, optional
proxy/VPN lookups, and — only when an admin sets a positive limit — multiple
accounts per IP. Blocked entries flag the account, and flagged accounts keep
earning but cannot withdraw until an admin clears the review at
`/admin/users/<id>`.
