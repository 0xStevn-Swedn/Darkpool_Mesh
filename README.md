# 🌑 Darkpool Mesh

> Private settlement layer for AI agents. Encrypted intents, matched off-chain, settled with proof.

AI agents are starting to move money on-chain, and every transaction they send goes through the public mempool. MEV bots watch, front-run, and extract value. The two existing options for an agent -- public mempool or centralized relay -- both break down at scale. Darkpool Mesh is the missing third option.

Agents broadcast encrypted intents over a peer-to-peer mesh with no central server. A coordinator pairs compatible intents off-chain. Matched pairs settle through a Turnkey-backed execution layer with retry logic and full audit trails. The mempool never sees the order.

Built solo for the [OpenAgent hackathon](https://ethglobal.com/events/agents) (April 24 – May 6, 2026).

---

## What works today

- ✅ **Two AXL nodes** peer over an encrypted Yggdrasil mesh -- confirmed cross-node messaging in both directions
- ✅ **Coordinator service** receives intents, validates, dedupes, and matches compatible pairs off-chain
- ✅ **KeeperHub Direct Execution** dispatches matched pairs to a Turnkey-backed wallet, returns a Sepolia tx hash in ~9 seconds
- ✅ **Agent SDK** lets any TypeScript agent publish intents in 5 lines
- ✅ **One-command demo** -- `npm run demo` runs the full pipeline end-to-end

Sample run from a recent local execution: tx [`0xf10b6c...e37ddf`](https://sepolia.etherscan.io/tx/0xf10b6cbcc64b178aaed602e4a2a87771f9f978924b31d91c88124506d1e37ddf) settled in 9 seconds, gas 21,000.

---

## Architecture

Three layers, each handling one concern:

| Layer | Tech | What it does |
|---|---|---|
| **Mesh transport** | [Gensyn AXL](https://github.com/gensyn-ai/axl) | End-to-end encrypted P2P, no central server |
| **Matching** | This repo (`services/coordinator`) | Pairs compatible intents off-chain |
| **Settlement** | [KeeperHub](https://docs.keeperhub.com) Direct Execution | Turnkey signing, retry, gas optimization, audit trail |

The coordinator role is implemented as a swappable interface. v1 ships with one matcher for demo reliability; the protocol supports any peer playing the matcher role (v3 roadmap).

For deeper architecture notes, see [`docs/architecture.md`](docs/architecture.md).

---

## Quickstart

Five steps. Should take under 5 minutes.

### 1. Prerequisites

- Linux or macOS
- Go 1.25+ (for AXL)
- Node 20+
- A KeeperHub account with an API key ([app.keeperhub.com](https://app.keeperhub.com))
- A funded Sepolia wallet on the KeeperHub side (any faucet, ~0.01 ETH is plenty)

### 2. Build the AXL node binary

```bash
git clone https://github.com/gensyn-ai/axl.git ~/projects/axl
cd ~/projects/axl
make build
```

This produces `~/projects/axl/node`. The demo runner expects it there; override with `AXL_BINARY=...` if needed.

### 3. Clone and configure

```bash
git clone https://github.com/0xStevn-Swedn/Darkpool_Mesh.git
cd Darkpool_Mesh

# Create .env.local from the template
cp .env.example .env.local
# Edit .env.local and paste your KeeperHub API key into KEEPERHUB_API_KEY
```

### 4. Generate AXL keys (one-time, per machine)

```bash
cd infra/axl/alice && openssl genpkey -algorithm ed25519 -out private.pem
cd ../bob          && openssl genpkey -algorithm ed25519 -out private.pem
cd ../../..
```

### 5. Install and run

```bash
# Install all the pieces
( cd services/coordinator && npm install )
( cd services/agent-sdk   && npm install )

# Run the full demo
npm run demo
```

Within ~60 seconds you should see a `🌑 Darkpool Mesh demo · settled` banner with a Sepolia tx hash and explorer link. Press Ctrl+C to shut everything down.

For a video-friendly version with all four streams (Alice, Bob, coordinator, agent shell) visible side-by-side in a tmux session:

```bash
npm run demo:tmux
```

---

## Components
Darkpool_Mesh/
├── infra/axl/                 # Per-node AXL configs (Alice listener, Bob dialer)
├── services/
│   ├── coordinator/           # Match + dispatch service (TypeScript)
│   ├── agent-sdk/             # Agent SDK for publishing intents
│   └── keeperhub-client/      # Smoke test for KeeperHub direct execution
├── scripts/
│   ├── demo.sh                # Headless one-command demo
│   └── demo-tmux.sh           # 4-pane tmux session demo
├── docs/                      # Setup, architecture, sponsor feedback
└── assets/                    # Logo, cover, screenshots, video slides

Each component has its own README with usage and limitations.

---

## How an intent flows through the system

1. **Agent publishes**. `Agent.publishIntent({ side, amount, recipientHint, settlementAddress })` builds a JSON intent (with a UUID, agent's AXL pubkey, and a TTL), then POSTs it to the coordinator's AXL pubkey over the mesh.
2. **Coordinator receives**. Polls AXL `GET /recv`, parses the bytes as an Intent, validates the shape, dedupes by intentId, and stores it in memory.
3. **Coordinator matches**. On every new intent, scans the store for a compatible counterparty: opposite sides, equal amount and network, mutual recipient hint, both unexpired.
4. **Coordinator dispatches**. On match, calls KeeperHub `POST /api/execute/transfer`. Both intents are removed from the store so they can't double-spend.
5. **KeeperHub settles**. Turnkey signs from the org wallet, broadcasts with retry, returns an execution ID. The coordinator polls `GET /api/execute/{id}/status` for the tx hash and explorer link.

End-to-end timing on local Sepolia testnet: ~9 seconds from second intent published to tx mined.

---

## Sponsor integration

**Gensyn AXL** powers the entire transport layer. Two AXL nodes peer locally over Yggdrasil; the coordinator polls one node's HTTP API for inbound intents. See `services/coordinator/src/axl-client.ts`.

**KeeperHub** powers the entire execution layer. The matcher's job ends at `keeperhub.transfer()`; the rest (signing, retry, gas, audit) is KeeperHub's. See `services/coordinator/src/keeperhub-client.ts`.

Two real bugs found and documented during integration, both filed in [`docs/feedback.md`](docs/feedback.md):
- KeeperHub's Direct Execution endpoints reject `X-API-Key` despite the docs, accept Bearer
- AXL's `tcp_port` config field binds to the per-node Yggdrasil IPv6, so two local nodes must share the value

---

## Roadmap

| Version | Focus |
|---|---|
| **v1 (today)** | Native ETH transfers, single coordinator, one mesh |
| **v2** | ERC-20 swaps via `/api/execute/contract-call`, encrypted intents on the wire |
| **v3** | Permissionless matching: any peer can match, earns a fee, slashable |

---

## License

MIT.