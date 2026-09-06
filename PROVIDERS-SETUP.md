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

## 1. CPX Research  (provider key: `cpx`) — **registered, app created**

- **Signup:** https://publisher.cpx-research.com/index.php?page=register — open
  registration, small review before approval.
- **Account status:** registered; app **SkySurvey** created, **App ID `35940`**.
- **Where to find the keys:** dashboard → *Apps* → *Edit App SkySurvey* → the
  **INFO** tab. The app id is in the blue "YOUR APP ID IS" badge; the app's
  secure hash is the 32-character string inside the *Example PHP* snippet at the
  bottom (`md5($user_id.'-<secure hash>')`).
- CPX also exposes a **per-user survey list API** (`get-surveys`, documented
  under the *Api* integration card on the app page). It needs **no API key** —
  same `app_id` + `secure_hash` as the wall — and is wired up via
  `PROVIDER_CPX_SURVEYS_URL` above, so each live offer renders as its own
  dashboard card.

### Two things CPX still requires before the app goes live

The Edit App page shows both as red warnings until they are done:

1. **Postback Settings tab** — paste `https://skysurvey.vercel.app/api/postback/cpx`
   and append CPX's own macros. Read the macro names off that tab and map them
   into the `PROVIDER_CPX_P_*` / `PROVIDER_CPX_SIG_*` vars below; the values in
   this file are the expected shape, not verified output.
2. **Reward Settings tab** — CPX needs the coin-per-USD conversion. SkySurvey
   pays `cpiCents` → coins via the config share percent, so set CPX's currency
   name to `Coins` and its rate to match `COINS_PER_USD` in the admin config.

### Entry URL

CPX's dashboard gives the wall URL under *Frame* integration. `secure_hash`
there is **not** the raw app secret — it is `md5(extUserId + "-" + appSecureHash)`,
which is what `ENTRY_HASH_MODE`/`ENTRY_HASH_TEMPLATE` compute into `{entryHash}`.

```env
PROVIDERS=cpx
PROVIDER_CPX_LABEL=CPX Research
PROVIDER_CPX_PUBLISHER_ID=35940
# NOTE: CPX has no API key. Both the wall and the get-surveys API authenticate
# with app_id + secure_hash, which the SECRET below already covers.
PROVIDER_CPX_SECRET=<app secure hash from the Example PHP snippet>
PROVIDER_CPX_ENTRY_URL=https://offers.cpx-research.com/index.php?app_id={publisherId}&ext_user_id={userId}&secure_hash={entryHash}&subid_1={txId}
PROVIDER_CPX_ENTRY_HASH_MODE=md5
PROVIDER_CPX_ENTRY_HASH_TEMPLATE={userId}-{secret}
# Per-user survey list (CPX API doc, "Api" integration card). Renders each live
# offer as its own dashboard card; auth = app_id + secure_hash, targeting
# sharpens with the user's IP and user agent. Max cache 120 seconds.
PROVIDER_CPX_SURVEYS_URL=https://live-api.cpx-research.com/api/get-surveys.php?app_id={publisherId}&ext_user_id={userId}&output_method=api&ip_user={ip}&user_agent={userAgent}&limit={limit}&secure_hash={entryHash}
PROVIDER_CPX_SURVEYS_LIMIT=12
# --- postback mapping: confirmed from CPX Postback Settings tab (placeholder list) ---
# Main Postback URL pasted there:
# https://skysurvey.vercel.app/api/postback/cpx?status={status}&trans_id={trans_id}
#   &user_id={user_id}&sub_id={subid_1}&sub_id_2={subid_2}&amount_local={amount_local}
#   &amount_usd={amount_usd}&offer_id={offer_id}&hash={secure_hash}&ip_click={ip_click}
PROVIDER_CPX_SIG_MODE=md5
PROVIDER_CPX_SIG_PARAM=hash
# CPX doc: "the hash is a md5 hash: md5({trans_id}-yourappsecurehash)"
PROVIDER_CPX_SIG_TEMPLATE={trans_id}-{secret}
PROVIDER_CPX_P_TXID=sub_id            # subid_1 carries our SurveyAttempt txId
PROVIDER_CPX_P_PAYOUT=amount_usd
PROVIDER_CPX_P_STATUS=status
PROVIDER_CPX_STATUS_OK=1
# CPX reverses fraud completions in 15-60 days with status -2 (their doc says
# "the status will change to -2"); map both spellings to be safe.
PROVIDER_CPX_STATUS_REVERSE=2,-2
# CPX postback whitelist IPs (from their INFORMATION box) — enable once clientIp
# on Vercel is confirmed to pass the real source IP:
# PROVIDER_CPX_IP_ALLOWLIST=188.40.3.73,157.90.97.92,2a01:4f8:d0a:30ff::2
```

`subid_1={txId}` is what ties a CPX completion back to our `SurveyAttempt`; if
CPX echoes it under a different name, point `PROVIDER_CPX_P_TXID` at that name
instead. Verify with one real completion in `/admin/postbacks` before trusting it.


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
