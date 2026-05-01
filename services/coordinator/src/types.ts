/**
 * The shape of an intent broadcast over AXL.
 * v1: native ETH only. v2 will add tokenAddress for ERC-20 swaps.
 */
export interface Intent {
  intentId: string;        // uuid for dedup
  agentId: string;         // AXL pubkey of the originating agent (64 hex chars)
  network: string;         // "sepolia" for now
  side: "send" | "receive";
  amount: string;          // human-readable (e.g. "0.001")
  recipientHint: string;   // AXL pubkey of intended counterparty (64 hex chars)
  settlementAddress: string;  // EVM address where settlement should land (0x...)
  expiresAt: string;       // ISO8601
  signature?: string;      // optional, v2 — intent provenance
}

/**
 * What we get back from AXL's GET /recv
 * Body is the raw bytes (possibly an Intent JSON, possibly something else).
 */
export interface ReceivedMessage {
  fromPeerId: string;      // X-From-Peer-Id header
  body: Buffer;
  receivedAt: Date;
}

/**
 * A pair of compatible intents that can settle together.
 */
export interface Match {
  matchId: string;       // uuid for the match itself
  send: Intent;          // the send-side intent
  receive: Intent;       // the receive-side intent
  matchedAt: Date;
}