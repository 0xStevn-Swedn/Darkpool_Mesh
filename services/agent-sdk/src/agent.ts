import * as crypto from "node:crypto";
import { Intent, IntentInput } from "./types.js";

export interface AgentConfig {
  /** AXL node HTTP API URL, e.g. http://127.0.0.1:9012 */
  axlUrl: string;
  /** AXL pubkey of the coordinator we send intents to */
  coordinatorPubkey: string;
  /** Optional human-readable label for log lines */
  label?: string;
}

/**
 * Agent: tiny SDK around AXL for publishing settlement intents.
 *
 * Usage:
 *   const agent = new Agent({ axlUrl, coordinatorPubkey });
 *   await agent.publishIntent({ network: "sepolia", side: "send", ... });
 */
export class Agent {
  private myPubkey: string | null = null;

  constructor(private readonly config: AgentConfig) {}

  /** Returns this agent's own AXL pubkey (cached after first call). */
  async pubkey(): Promise<string> {
    if (this.myPubkey) return this.myPubkey;
    const res = await fetch(`${this.config.axlUrl}/topology`);
    if (!res.ok) throw new Error(`topology: ${res.status} ${res.statusText}`);
    const data = (await res.json()) as { our_public_key: string };
    this.myPubkey = data.our_public_key;
    return this.myPubkey;
  }

  /** Build, then publish, an intent to the coordinator. Returns the intent. */
  async publishIntent(input: IntentInput): Promise<Intent> {
    const myPubkey = await this.pubkey();
    const ttl = input.ttlSeconds ?? 300;

    const intent: Intent = {
      intentId: crypto.randomUUID(),
      agentId: myPubkey,
      network: input.network,
      side: input.side,
      amount: input.amount,
      recipientHint: input.recipientHint,
      settlementAddress: input.settlementAddress,
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
    };

    this.log(
      `→ publishing ${intent.side} ${intent.amount} ${intent.network} (${intent.intentId.slice(0, 8)})`,
    );

    const res = await fetch(`${this.config.axlUrl}/send`, {
      method: "POST",
      headers: { "X-Destination-Peer-Id": this.config.coordinatorPubkey },
      body: JSON.stringify(intent),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`AXL /send failed: ${res.status} ${errorBody}`);
    }

    const sentBytes = res.headers.get("x-sent-bytes") ?? "?";
    this.log(`✓ sent ${sentBytes} bytes to coordinator`);

    return intent;
  }

  private log(msg: string): void {
    const tag = this.config.label ? `[${this.config.label}]` : "[agent]";
    console.log(`${tag} ${msg}`);
  }
}