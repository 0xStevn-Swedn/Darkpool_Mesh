# Coordinator

The matcher and dispatcher for Darkpool Mesh. Listens to an AXL node for inbound intents, matches compatible ones, and (later) fires KeeperHub executions.

## Status

Listens and parses intents only. Matching land, then KeeperHub dispatch lands.

## Run

```bash
cd services/coordinator
npm install
npm run dev
```

The coordinator polls Alice's AXL HTTP API at `http://127.0.0.1:9002` by default. Override with `AXL_URL=http://127.0.0.1:9012 npm run dev` to talk to Bob's node instead.

## Architecture (v1)

- One coordinator process attached to one AXL node (Alice by default)
- Receives intents from any peer in the mesh via `GET /recv`
- Stores them in memory keyed by intentId
- Match compatible `send` ↔ `receive` pairs
- Fire `POST /api/execute/transfer` against KeeperHub

The coordinator role is designed to be swappable. v2 would let any node attempt matches; v1 ships with one matcher for demo reliability.

## Intent shape

See `src/types.ts`. Intents are JSON objects sent as the raw body of `POST /send` to the coordinator's AXL pubkey.