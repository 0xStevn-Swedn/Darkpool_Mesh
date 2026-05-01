/**
 * The shape of an intent broadcast over AXL.
 * Mirrors the coordinator's Intent type — kept in sync manually for now.
 * Future: extract to a shared package.
 */
export interface Intent {
  intentId: string;
  agentId: string;
  network: string;
  side: "send" | "receive";
  amount: string;
  recipientHint: string;
  settlementAddress: string;
  expiresAt: string;
  signature?: string;
}

/**
 * Inputs to Agent.publishIntent — fields the caller actually cares about.
 * The Agent fills in agentId (its AXL pubkey), intentId, expiresAt.
 */
export interface IntentInput {
  network: string;
  side: "send" | "receive";
  amount: string;
  recipientHint: string;       // counterparty AXL pubkey
  settlementAddress: string;   // EVM 0x... where settlement should land
  ttlSeconds?: number;         // defaults to 300
}