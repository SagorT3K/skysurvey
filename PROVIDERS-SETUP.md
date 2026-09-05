# Real Survey Provider Setup Guide

The app already has a complete provider layer (`src/lib/providers.ts`) and a generic
postback endpoint (`/api/postback/[provider]`). To go live you only need to:

1. Sign up as a publisher with each router (free) and copy your credentials.
2. Add the env vars below in **Vercel → Project → Settings → Environment Variables**.
3. Paste the postback URL into each router's dashboard.
4. Create survey rows (seed or import) pointing at the router.

---

## Postback URL (same shape for every router)

```
https://skysurvey.vercel.app/api/postback/<provider-key>?txId={txId}&payout={payout}&status={status}
```

Replace `<provider-key>` with the key you chose (e.g. `bitlabs`), and the query
param names with whatever the router actually sends — you map them via the
`PROVIDER_<KEY>_P_*` env vars below. Check `/admin/postbacks` after the first
callback to confirm it was accepted.

---

## 1. BitLabs  (provider key: `bitlabs`)

- **Signup:** https://www.bitlabs.ai/ → *Become a publisher*. Approval is usually instant.
- **Where to find keys:** dashboard → your app → *API key* / *Hash key*.
- **Postback config:** dashboard → *Postback settings* → set the URL above.

```env
PROVIDERS=bitlabs
PROVIDER_BITLABS_LABEL=BitLabs
PROVIDER_BITLABS_PUBLISHER_ID=<uid from dashboard>
PROVIDER_BITLABS_API_KEY=<api key>
PROVIDER_BITLABS_SECRET=<hash key>
PROVIDER_BITLABS_ENTRY_URL=https://web.bitlabs.ai/?uid={userId}&api_key={apiKey}&tx_id={txId}
# BitLabs signs callbacks with an md5 "hash" param — confirm the exact
# template in their docs before going live:
PROVIDER_BITLABS_SIG_MODE=md5
PROVIDER_BITLABS_SIG_PARAM=hash
PROVIDER_BITLABS_SIG_TEMPLATE={transaction_id}{uid}{currency_amount}{status}{secret}
PROVIDER_BITLABS_P_TXID=transaction_id
PROVIDER_BITLABS_P_PAYOUT=currency_amount
PROVIDER_BITLABS_P_STATUS=status
```

## 2. CPX Research  (provider key: `cpx`)

- **Signup:** https://www.cpx-research.com/main/ → *Publishers*. Small review before approval.
- **Where to find keys:** dashboard → *API credentials* (`api_key`, `app_id`, secure hash).
- CPX also exposes a **survey list API** (`get-surveys`) — once the key works we can
  sync real per-survey inventory into the `Survey` table instead of one wall entry.

```env
PROVIDERS=bitlabs,cpx          # append to the same list
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

## 3. YourSurveys / ProBit  (provider key: `probit`)

- **Signup:** https://www.yoursurveys.com/ → publisher / API access request.
- Approval takes a little longer; they email you publisher credentials.

```env
PROVIDERS=bitlabs,cpx,probit
PROVIDER_PROBIT_LABEL=YourSurveys
PROVIDER_PROBIT_PUBLISHER_ID=<publisher id>
PROVIDER_PROBIT_API_KEY=<api key>
PROVIDER_PROBIT_SECRET=<shared secret>
PROVIDER_PROBIT_ENTRY_URL=<from their integration email — template with {userId}/{txId}>
PROVIDER_PROBIT_SIG_MODE=md5    # confirm mode/params in their docs
```

## 4. Others

`TrayiStats`, `Pollfish`, `inBrain.ai` and friends all follow the same pattern —
the provider layer is fully env-driven, so any router with an entry link and a
signed postback plugs in without code changes. Signup links are listed on
`/admin/providers`.

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

With a wall-style router (BitLabs) one `Survey` row is enough — users click it and
see the router's full wall:

```
provider=bitlabs, externalId=wall, title="Surveys by BitLabs",
cpiCents=<average>, country=ALL, liveUrl=<router url>, isActive=true
```

Per-survey routers (CPX) should be synced from their list API into individual
rows — that sync can be added once your API key is live.
