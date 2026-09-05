# Real Survey Provider Setup Guide

The app already has a complete provider layer (`src/lib/providers.ts`) and a generic
postback endpoint (`/api/postback/[provider]`). To go live you only need to:

1. Sign up as a publisher with each router (free) and copy your credentials.
2. Add the env vars below in **Vercel → Project → Settings → Environment Variables**.
3. Paste the postback URL into each router's dashboard.
4. Create survey rows (seed or import) pointing at the router.

---

## Which routers to apply to (verified 2026-09)

**Start today (no traffic minimum, self-serve):**

| Router | Key | Signup |
|---|---|---|
| CPX Research ⭐ best first | `cpx` | https://publisher.cpx-research.com/index.php?page=register |
| Torox (runs OfferToro) | `torox` | https://torox.io/register/ |
| inBrain.ai | `inbrain` | https://publisher.inbrain.ai/account/signup |
| TheoremReach | `theoremreach` | https://publishers.theoremreach.com/sign_up |
| AdGate Media (later, once live) | `adgate` | https://dash.adgatemedia.com/account/signup |

**BitLabs — NOT yet.** They require 50,000+ monthly active users plus a live
platform, approval is sales-led, a rejection is permanent (no reapply), and
their minimum payout is $100. Revisit at ~50k MAU: https://www.bitlabs.ai/

**Dead:** YourSurveys.com (domain parked, product defunct) — ignore older guides.

---

## Postback URL (same shape for every router)

```
https://skysurvey.vercel.app/api/postback/<provider-key>
```

Replace `<provider-key>` with the key you chose (e.g. `cpx`), and map the query
param names the router actually sends via the `PROVIDER_<KEY>_P_*` env vars
below. Check `/admin/postbacks` after the first callback to confirm it was
accepted.

---

## 1. CPX Research  (provider key: `cpx`) — apply first

- **Signup:** https://publisher.cpx-research.com/index.php?page=register — open
  registration, small review before approval.
- **Where to find keys:** dashboard → *API credentials* (`api_key`, `app_id`,
  secure hash).
- CPX also exposes a **survey list API** (`get-surveys`) — once the key works we
  can sync real per-survey inventory into the `Survey` table instead of one
  wall entry.

```env
PROVIDERS=cpx
PROVIDER_CPX_LABEL=CPX Research
PROVIDER_CPX_PUBLISHER_ID=<app id>
PROVIDER_CPX_API_KEY=<api key>
PROVIDER_CPX_SECRET=<secure hash>
PROVIDER_CPX_ENTRY_URL=https://www.cpx-research.com/survey/?app_id={publisherId}&ext_user_id={userId}&secure_hash={apiKey}&surveys=full
PROVIDER_CPX_SIG_MODE=sha256   # CPX uses sha256 "secure_hash" — verify in docs
PROVIDER_CPX_SIG_PARAM=secure_hash
PROVIDER_CPX_SIG_TEMPLATE={transaction_id}{user_id}{currency_amount}{status}{secret}
PROVIDER_CPX_P_TXID=transaction_id
PROVIDER_CPX_P_PAYOUT=currency_amount
PROVIDER_CPX_P_STATUS=status
```

## 2. Torox / OfferToro  (provider key: `torox`)

- **Signup:** https://torox.io/register/ — self-serve, no commitment, monthly
  auto payouts via bank/PayPal.
- Copy the postback URL into their dashboard and map their param names below.

```env
PROVIDERS=cpx,torox
PROVIDER_TOROX_LABEL=Torox
PROVIDER_TOROX_PUBLISHER_ID=<publisher id>
PROVIDER_TOROX_API_KEY=<api key>
PROVIDER_TOROX_SECRET=<secret>
PROVIDER_TOROX_ENTRY_URL=<wall link from their docs, template with {userId}/{txId}>
# Map signature + postback params from their integration docs before going live.
```

## 3. inBrain.ai  (provider key: `inbrain`)

- **Signup:** https://publisher.inbrain.ai/account/signup — survey wall via
  link / iframe / SDK / API.

```env
PROVIDERS=cpx,torox,inbrain
PROVIDER_INBRAIN_LABEL=inBrain
PROVIDER_INBRAIN_PUBLISHER_ID=<publisher/account id>
PROVIDER_INBRAIN_API_KEY=<api key>
PROVIDER_INBRAIN_SECRET=<secret>
PROVIDER_INBRAIN_ENTRY_URL=<wall link from their dashboard, template with {userId}/{txId}>
```

## 4. Others

TheoremReach (`theoremreach`), AdGate Media (`adgate`), TrayiStats
(`trayistats`) and friends all follow the same pattern — the provider layer is
fully env-driven, so any router with an entry link and a signed postback plugs
in without code changes. Signup links are listed on `/admin/providers`.

## BitLabs  (provider key: `bitlabs`) — only at 50k+ MAU

- **Signup:** sales-led via https://www.bitlabs.ai/ (partnerships@bitlabs.ai);
  you get a personalized sign-up link, then verification takes 2–3 business days.
- **Requirements:** live platform + 50,000 monthly active users (both required).
  Rejection is permanent. Minimum payout $100, NET-30.

```env
PROVIDERS=<existing list>,bitlabs
PROVIDER_BITLABS_LABEL=BitLabs
PROVIDER_BITLABS_PUBLISHER_ID=<uid from dashboard>
PROVIDER_BITLABS_API_KEY=<api key>
PROVIDER_BITLABS_SECRET=<hash key>
PROVIDER_BITLABS_ENTRY_URL=https://web.bitlabs.ai/?uid={userId}&api_key={apiKey}&tx_id={txId}
PROVIDER_BITLABS_SIG_MODE=md5
PROVIDER_BITLABS_SIG_PARAM=hash
PROVIDER_BITLABS_SIG_TEMPLATE={transaction_id}{uid}{currency_amount}{status}{secret}
PROVIDER_BITLABS_P_TXID=transaction_id
PROVIDER_BITLABS_P_PAYOUT=currency_amount
PROVIDER_BITLABS_P_STATUS=status
```

---

## Param reference (any provider)

| Env var | Meaning | Default |
|---|---|---|
| `PROVIDER_<K>_ENTRY_URL` | Template the user's browser is sent to. Vars: `{publisherId} {apiKey} {userId} {txId} {surveyId} {externalId} {country} {ip}` | required |
| `PROVIDER_<K>_SIG_MODE` | `none` / `md5` / `sha1` / `sha256` / `hmac-sha256` | `none` |
| `PROVIDER_<K>_SIG_TEMPLATE` | What is hashed, e.g. `{txId}{payout}{secret}` | `{txId}{payout}{secret}` |
| `PROVIDER_<K>_P_TXID / _P_PAYOUT / _P_STATUS` | Postback param names | `txId / payout / status` |
| `PROVIDER_<K>_PAYOUT_UNIT` | `usd` or `cents` | `usd` |
| `PROVIDER_<K>_STATUS_OK` | Values meaning *completed* | `1,complete,completed` |
| `PROVIDER_<K>_STATUS_REVERSE` | Values meaning *reversal* | `2,reversal,reversed,chargeback` |
| `PROVIDER_<K>_STATUS_SCREEN` | Values meaning *screenout* | `3,screenout,disqualified` |
| `PROVIDER_<K>_IP_ALLOWLIST` | Optional comma-separated postback source IPs | empty |

⚠️ The exact param names, signature templates and status codes **must** be copied
from each router's own integration docs — a wrong mapping silently drops
completions. Always send a test postback from the router dashboard and check it
under **Admin → Router postbacks** before going live.

---

## Creating the survey rows

Wall-style routers (CPX full wall, Torox, inBrain) need one `Survey` row each —
users click it and see the router's full wall:

```
provider=cpx, externalId=wall, title="Surveys by CPX Research",
cpiCents=<average>, country=ALL, liveUrl=<router url>, isActive=true
```

Per-survey routers should be synced from their list API into individual rows —
that sync can be added once your API key is live (CPX supports this).
