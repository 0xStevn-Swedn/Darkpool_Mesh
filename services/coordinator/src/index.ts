import { AxlClient } from "./axl-client.js";
import { IntentStore } from "./intent-store.js";
import { Intent, ReceivedMessage } from "./types.js";

const AXL_URL = process.env.AXL_URL ?? "http://127.0.0.1:9002";

async function main() {
  console.log(`[coordinator] starting, talking to AXL at ${AXL_URL}`);

  const axl = new AxlClient(AXL_URL);
  const store = new IntentStore();

  const topology = await axl.topology();
  console.log(`[coordinator] AXL node pubkey: ${topology.our_public_key}`);
  console.log(`[coordinator] peers connected: ${topology.peers.length}`);

  // Periodic intent pruning, every 10s
  const pruneTimer = setInterval(() => {
    const removed = store.prune();
    if (removed > 0) {
      console.log(`[coordinator] pruned ${removed} expired intents (${store.size()} remaining)`);
    }
  }, 10_000);

  // Graceful shutdown
  const controller = new AbortController();
  process.on("SIGINT", () => {
    console.log("\n[coordinator] shutting down...");
    clearInterval(pruneTimer);
    controller.abort();
    process.exit(0);
  });

  // Main event loop: poll AXL /recv forever
  await axl.recvLoop(async (msg) => {
    handleMessage(msg, store);
  }, controller.signal);
}

function handleMessage(msg: ReceivedMessage, store: IntentStore): void {
  const text = msg.body.toString("utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.log(`[coordinator] non-JSON message from ${msg.fromPeerId.slice(0, 12)}...: "${text}"`);
    return;
  }

  if (!isIntent(parsed)) {
    console.log(`[coordinator] JSON but not an Intent from ${msg.fromPeerId.slice(0, 12)}...:`, parsed);
    return;
  }

  const isNew = store.add(parsed);
  if (!isNew) {
    console.log(`[coordinator] duplicate intent ${parsed.intentId} (ignored)`);
    return;
  }

  console.log(
    `[coordinator] intent ${parsed.intentId} from ${msg.fromPeerId.slice(0, 12)}...: ` +
    `${parsed.side} ${parsed.amount} ${parsed.network} → ${parsed.recipientHint.slice(0, 12)}...`
  );
  console.log(`[coordinator] intent count: ${store.size()}`);
}

/**
 * Minimal runtime check that an unknown value looks like an Intent.
 * we'll move to a real validator (zod or similar).
 */
function isIntent(x: unknown): x is Intent {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.intentId === "string" &&
    typeof o.agentId === "string" &&
    typeof o.network === "string" &&
    (o.side === "send" || o.side === "receive") &&
    typeof o.amount === "string" &&
    typeof o.recipientHint === "string" &&
    typeof o.expiresAt === "string"
  );
}

main().catch((err) => {
  console.error("[coordinator] fatal:", err);
  process.exit(1);
});
