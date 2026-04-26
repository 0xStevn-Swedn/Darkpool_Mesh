# Local Setup

This document lists the exact steps to run Darkpool Mesh locally. Updated as components come online.

## Prerequisites

- Ubuntu 22.04+ (or any Linux with Go 1.25+ and Node 20+)
- Go 1.25 or later
- Node.js 20 or later
- A KeeperHub account and API key
- A funded Base Sepolia wallet for testnet

## Components

- [x] AXL nodes (P2P mesh) -- see [infra/axl/README.md](../infra/axl/README.md)
- [ ] KeeperHub MCP server (execution layer)
- [ ] Coordinator service (matching layer)
- [ ] Agent SDK (intent broadcast)
- [ ] Demo dashboard

## Verified milestones

### AXL two-node mesh

Apr 26, 2026. Confirmed locally:

- Alice (listener) and Bob (dialer) start clean from configs in `infra/axl/{alice,bob}/`
- Both `/topology` endpoints list the other node as a peer
- `POST /send` + `GET /recv` round-trip succeeds in both directions
- Bob -> Alice: 14 bytes delivered, `X-Sent-Bytes` matches `/recv` `Content-Length`
- Alice -> Bob: 21 bytes delivered, same match
- This satisfies Gensyn's "communication across separate AXL nodes" requirement

### Known AXL quirks

- `tcp_port` must match across local nodes (it binds to the per-node Yggdrasil IPv6, not localhost). See `fix(axl): align bob's tcp_port to 7000` for details.
- The `X-From-Peer-Id` header on inbound `/recv` truncates trailing bytes and pads with `0xff`. Delivery is unaffected; the field can't currently be relied on for exact source identification. To be reported upstream.
