# Agent SDK

Tiny TypeScript SDK for AI agents to publish settlement intents into the Darkpool Mesh.

## Install

```bash
cd services/agent-sdk
npm install
```

## Usage

```typescript
import { Agent } from "agent-sdk";

const agent = new Agent({
  axlUrl: "http://127.0.0.1:9012",
  coordinatorPubkey: "<coordinator AXL pubkey>",
  label: "my-agent",
});

await agent.publishIntent({
  network: "sepolia",
  side: "send",
  amount: "0.001",
  recipientHint: "<counterparty AXL pubkey>",
  settlementAddress: "0xYourEVMAddress",
});
```

The agent broadcasts the intent over the mesh to the coordinator. Once a compatible counterparty intent arrives, the coordinator matches them and dispatches settlement through KeeperHub.

## Demo scripts

```bash
# Get the coordinator's AXL pubkey (Alice in our local setup)
export COORDINATOR_PUBKEY=$(curl -s http://127.0.0.1:9002/topology | python3 -c "import json,sys;print(json.load(sys.stdin)['our_public_key'])")

# Publish a send-side intent (Agent A)
npm run publish:send

# Publish a matching receive-side intent (Agent B)
npm run publish:receive
```

Watch the coordinator terminal — you'll see the match fire and a Sepolia tx hash in under 10 seconds.

## Limitations (v1)

- The demo runs Agent A and Agent B on the same AXL node (Bob's). In production, each agent runs on its own AXL node with its own pubkey.
- No intent encryption yet -- the coordinator decrypts at match time. Future work.
- No signature on intents -- provenance is implicit through the AXL pubkey.