/**
 * Demo: Agent A publishes a SEND intent.
 *
 * Reads two env vars:
 *   AGENT_AXL_URL          — agent's local AXL node API (default: Bob @ 9012)
 *   COORDINATOR_PUBKEY     — pubkey of the AXL node the coordinator listens on
 *
 * Optional:
 *   COUNTERPARTY_PUBKEY    — defaults to a hardcoded synthetic peer
 *   COUNTERPARTY_EVM       — EVM payout address (defaults to RECIPIENT env, or a placeholder)
 *   AMOUNT                 — human-readable, defaults "0.001"
 *   NETWORK                — defaults "sepolia"
 */

import { Agent } from "../src/index.js";

const AGENT_AXL_URL = process.env.AGENT_AXL_URL ?? "http://127.0.0.1:9012";
const COORDINATOR_PUBKEY = process.env.COORDINATOR_PUBKEY ?? "";
const COUNTERPARTY_PUBKEY =
  process.env.COUNTERPARTY_PUBKEY ??
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const COUNTERPARTY_EVM =
  process.env.COUNTERPARTY_EVM ??
  process.env.RECIPIENT ??
  "0x0000000000000000000000000000000000000001";
const AMOUNT = process.env.AMOUNT ?? "0.001";
const NETWORK = process.env.NETWORK ?? "sepolia";

async function main() {
  if (!COORDINATOR_PUBKEY) {
    console.error("FATAL: COORDINATOR_PUBKEY env var not set.");
    console.error('Get it with: curl -s http://127.0.0.1:9002/topology | jq -r .our_public_key');
    process.exit(1);
  }

  const agent = new Agent({
    axlUrl: AGENT_AXL_URL,
    coordinatorPubkey: COORDINATOR_PUBKEY,
    label: "agent-A",
  });

  await agent.publishIntent({
    network: NETWORK,
    side: "send",
    amount: AMOUNT,
    recipientHint: COUNTERPARTY_PUBKEY,
    settlementAddress: "0x0000000000000000000000000000000000000001",
  });
}

main().catch((err) => {
  console.error("[agent-A] fatal:", err);
  process.exit(1);
});