## Documentation gaps

### Direct Execution doc says `X-API-Key`, but endpoints actually require `Authorization: Bearer`

**Page:** https://docs.keeperhub.com → API → Direct Execution

**The doc says:**
> All direct execution endpoints require an API key passed in the `X-API-Key` header.

**Actual behavior:** sending `X-API-Key: $KEEPERHUB_API_KEY` to `POST /api/execute/transfer` returns `401 Unauthorized` with body `{"error":"Unauthorized"}`. The same request with `Authorization: Bearer $KEEPERHUB_API_KEY` returns `202` and successfully executes the transfer.

**Reproduction:** identical curl invocations against `POST /api/execute/transfer`, only the auth header differs.

**Why this hurts:** I spent ~30 minutes debugging a 401 that I assumed was a key/scope/wallet-config issue, because the docs were explicit about the header name. Both the API Overview page (https://docs.keeperhub.com/api) and the read endpoints (e.g. `GET /api/workflows`) accept Bearer, so it's surprising that Direct Execution claims to require something different.

**Suggested fix:** update the Direct Execution doc to either accept both, or document Bearer as the canonical scheme (consistent with the rest of the API).

**Date observed:** Apr 26, 2026.