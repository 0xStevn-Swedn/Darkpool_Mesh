# KeeperHub client

Thin wrapper around KeeperHub's REST API. Used by the Darkpool Mesh coordinator to dispatch matched intents to KeeperHub's execution layer (Turnkey-backed wallet, retry logic, audit trail).

## Endpoints used

- `POST /api/execute/transfer` -- direct native/ERC-20 transfer
- `POST /api/execute/contract-call` -- direct contract function call
- `GET  /api/execute/{executionId}/status` -- fetch tx hash and explorer link

Auth header is `X-API-Key` (not Bearer).

## Status

In progress, direct-execution smoke test only.

## Smoke test

Send 0.001 testnet ETH from the org wallet to your personal wallet:

```bash
RECIPIENT=0xYourPersonalWallet ./scripts/smoke-test.sh
```

Requires `.env.local` at repo root with `KEEPERHUB_API_KEY` and `KEEPERHUB_API_BASE`.