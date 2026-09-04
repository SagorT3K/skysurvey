# SkySurvey

A get-paid-to survey platform: users take surveys sourced from a survey router,
earn coins, and redeem them for PayPal cash or gift cards. Built with Next.js 16
(App Router), Prisma and Tailwind CSS.

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
provider is patched at build time from `DATABASE_PROVIDER`, because Prisma does
not accept `env()` for it; the schema itself validates against Postgres unchanged.

1. Create a free Postgres database (Neon or Supabase) and copy its connection string.
2. Import this repository on Vercel; leave the build command alone, since
   `npm run build` already runs `prisma generate`.
3. Set `DATABASE_PROVIDER=postgresql`, `DATABASE_URL=<connection string>` and a
   fresh `JWT_SECRET`.
4. Create the tables and demo rows once, from your machine:

   ```bash
   DATABASE_PROVIDER=postgresql DATABASE_URL="<connection string>" npm run db:push
   DATABASE_PROVIDER=postgresql DATABASE_URL="<connection string>" npm run db:seed
   ```

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

Survey entry is screened before an attempt is created: bot user agents, request
velocity per user, multiple accounts per IP, and an optional proxy/VPN lookup.
Blocked entries flag the account, and flagged accounts keep earning but cannot
withdraw until an admin clears the review at `/admin/users/<id>`.
