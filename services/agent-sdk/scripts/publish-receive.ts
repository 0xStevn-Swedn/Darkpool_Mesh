/**
 * Demo: Agent B publishes a RECEIVE intent that matches Agent A.
 *
 * Same env vars as publish-send.ts but inverts side and pubkey roles:
 *   - agentId is the synthetic counterparty (not Bob's actual pubkey)
 *   - recipientHint points back at Bob's pubkey
 *
 * In a real deployment, Agent B would run on its own AXL node with its own pubkey.
 * For demo purposes we publish from the same node, but treat the synthetic peer
 * as the logical agent identity. The coordinator's matcher only looks at the
 * intent payload (agentId / recipientHint), not the AXL sender.
 */

import { Agent } from "../src/index.js";

const AGENT_AXL_URL = process.env.AGENT_AXL_URL ?? "http://127.0.0.1:9012";
const COORDINATOR_PUBKEY = process.env.COORDINATOR_PUBKEY ?? "";
const SYNTHETIC_AGENT_B =
  process.env.AGENT_B_PUBKEY ??
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const RECIPIENT_EVM =
  process.env.RECIPIENT ?? "0x17F0d66ADAB761087cD97aBB30c3bA4924B30C1c";
const AMOUNT = process.env.AMOUNT ?? "0.001";
const NETWORK = process.env.NETWORK ?? "sepolia";

async function main() {
  if (!COORDINATOR_PUBKEY) {
    console.error("FATAL: COORDINATOR_PUBKEY env var not set.");
    process.exit(1);
  }

  // Agent B: publishes from Bob's AXL node, but uses the synthetic identity
  // for the matching layer (different agentId from Agent A).
  const agent = new Agent({
    axlUrl: AGENT_AXL_URL,
    coordinatorPubkey: COORDINATOR_PUBKEY,
    label: "agent-B",
  });

  // For the receive intent, we want the intent.agentId to be the synthetic peer
  // (so it matches Agent A's recipientHint), and intent.recipientHint to be
  // Agent A's pubkey. We override Agent's auto-fill by going one level deeper.
  const myPubkey = await agent.pubkey(); // This is actually Bob's pubkey
  const intentInput = {
    network: NETWORK,
    side: "receive" as const,
    amount: AMOUNT,
    recipientHint: myPubkey, // points back at Bob (Agent A's actual sender)
    settlementAddress: RECIPIENT_EVM,
  };

  // Slightly hacky: we want intent.agentId = SYNTHETIC_AGENT_B, but the SDK
  // auto-fills it with the AXL pubkey. Override by going through publishIntent
  // and post-processing... actually simpler: do it inline here, since this is
  // a demo of two logical agents on one mesh node. Real deployments would
  // run two separate AXL nodes.
  const { Agent: _AgentClass } = await import("../src/index.js");
  const customAgent = new (class extends _AgentClass {
    async pubkey(): Promise<string> {
      return SYNTHETIC_AGENT_B;
    }
  })({
    axlUrl: AGENT_AXL_URL,
    coordinatorPubkey: COORDINATOR_PUBKEY,
    label: "agent-B",
  });

  await customAgent.publishIntent(intentInput);
}

main().catch((err) => {
  console.error("[agent-B] fatal:", err);
  process.exit(1);
});