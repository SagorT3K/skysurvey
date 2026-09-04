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

| Host | Works with the current SQLite setup | Notes |
| --- | --- | --- |
| Render, Railway, Fly.io | Yes, with a persistent disk | No code changes needed |
| Vercel | No | Serverless filesystem is read-only; switch Prisma to Postgres first |

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
