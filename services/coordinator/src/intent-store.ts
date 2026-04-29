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
}