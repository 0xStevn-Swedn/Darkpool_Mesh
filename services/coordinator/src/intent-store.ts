import { Intent } from "./types.js";

/**
 * In-memory intent store.
 * v1: dedup by intentId, drop expired intents on lookup.
 * Day 3: this is where matching logic will live.
 */
export class IntentStore {
  private intents: Map<string, Intent> = new Map();

  /**
   * Add an intent. Returns true if new, false if duplicate.
   */
  add(intent: Intent): boolean {
    if (this.intents.has(intent.intentId)) return false;
    this.intents.set(intent.intentId, intent);
    return true;
  }

  /**
   * All currently-valid (non-expired) intents.
   */
  active(): Intent[] {
    const now = new Date();
    const valid: Intent[] = [];
    for (const intent of this.intents.values()) {
      if (new Date(intent.expiresAt) > now) {
        valid.push(intent);
      }
    }
    return valid;
  }

  /**
   * Remove expired intents from the store.
   * Called periodically.
   */
  prune(): number {
    const now = new Date();
    let removed = 0;
    for (const [id, intent] of this.intents) {
      if (new Date(intent.expiresAt) <= now) {
        this.intents.delete(id);
        removed++;
      }
    }
    return removed;
  }

  size(): number {
    return this.intents.size;
  }

  /**
   * Find a compatible counterparty intent for the given one.
   * Returns null if no match exists.
   *
   * Compatibility rules:
   * - Opposite sides (send vs receive)
   * - Same network and amount
   * - They name each other via agentId / recipientHint
   * - Both unexpired
   */
  findMatch(intent: Intent): Intent | null {
    const oppositeSide = intent.side === "send" ? "receive" : "send";
    const now = new Date();

    for (const candidate of this.intents.values()) {
      if (candidate.intentId === intent.intentId) continue;
      if (candidate.side !== oppositeSide) continue;
      if (candidate.network !== intent.network) continue;
      if (candidate.amount !== intent.amount) continue;
      if (candidate.agentId !== intent.recipientHint) continue;
      if (candidate.recipientHint !== intent.agentId) continue;
      if (new Date(candidate.expiresAt) <= now) continue;
      return candidate;
    }

    return null;
  }

  /**
   * Remove an intent by id. Returns true if it existed.
   */
  remove(intentId: string): boolean {
    return this.intents.delete(intentId);
  }
}