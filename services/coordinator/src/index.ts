import { AxlClient } from "./axl-client.js";
import { IntentStore } from "./intent-store.js";
import { KeeperHubClient } from "./keeperhub-client.js";
import { Intent, Match, ReceivedMessage } from "./types.js";
import * as crypto from "node:crypto";

const AXL_URL = process.env.AXL_URL ?? "http://127.0.0.1:9002";
const KEEPERHUB_API_BASE = process.env.KEEPERHUB_API_BASE ?? "https://app.keeperhub.com";
const KEEPERHUB_API_KEY = process.env.KEEPERHUB_API_KEY ?? "";

async function main() {
  console.log(`[coordinator] starting, talking to AXL at ${AXL_URL}`);

  if (!KEEPERHUB_API_KEY) {
    console.error("[coordinator] FATAL: KEEPERHUB_API_KEY not set in env.");
    console.error("[coordinator] Source .env.local before running, e.g.:");
    console.error("[coordinator]   set -a && source ../../.env.local && set +a && npm run dev");
    process.exit(1);
  }

  const axl = new AxlClient(AXL_URL);
  const keeperhub = new KeeperHubClient(KEEPERHUB_API_BASE, KEEPERHUB_API_KEY);
  const store = new IntentStore();

  const topology = await axl.topology();
  console.log(`[coordinator] AXL node pubkey: ${topology.our_public_key}`);
  console.log(`[coordinator] peers connected: ${topology.peers.length}`);
  console.log(`[coordinator] KeeperHub base: ${KEEPERHUB_API_BASE}`);

  const pruneTimer = setInterval(() => {
    const removed = store.prune();
    if (removed > 0) {
      console.log(`[coordinator] pruned ${removed} expired intents (${store.size()} remaining)`);
    }
  }, 10_000);

  const controller = new AbortController();
  process.on("SIGINT", () => {
    console.log("\n[coordinator] shutting down...");
    clearInterval(pruneTimer);
    controller.abort();
    process.exit(0);
  });

  await axl.recvLoop(async (msg) => {
    await handleMessage(msg, store, keeperhub);
  }, controller.signal);
}

async function handleMessage(msg: ReceivedMessage, store: IntentStore, keeperhub: KeeperHubClient): Promise<void> {
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
    `[coordinator] intent ${parsed.intentId.slice(0, 8)} from ${msg.fromPeerId.slice(0, 12)}...: ` +
    `${parsed.side} ${parsed.amount} ${parsed.network} → ${parsed.recipientHint.slice(0, 12)}...`
  );
  console.log(`[coordinator] intent count: ${store.size()}`);

  const counterparty = store.findMatch(parsed);
  if (counterparty) {
    const match = createMatch(parsed, counterparty);
    store.remove(parsed.intentId);
    store.remove(counterparty.intentId);
    await onMatch(match, keeperhub);
  }
}

function createMatch(a: Intent, b: Intent): Match {
  const send = a.side === "send" ? a : b;
  const receive = a.side === "receive" ? a : b;
  return {
    matchId: crypto.randomUUID(),
    send,
    receive,
    matchedAt: new Date(),
  };
}

/**
 * What happens when a match is found.
 */
async function onMatch(match: Match, keeperhub: KeeperHubClient): Promise<void> {
  console.log(`[coordinator] ✓ MATCHED ${match.matchId.slice(0, 8)}`);
  console.log(`            send:    ${match.send.intentId.slice(0, 8)} from ${match.send.agentId.slice(0, 12)}...`);
  console.log(`            receive: ${match.receive.intentId.slice(0, 8)} from ${match.receive.agentId.slice(0, 12)}...`);
  console.log(`            amount:  ${match.send.amount} ${match.send.network}`);
  console.log(`            payout:  ${match.receive.settlementAddress}`);

  try {
    const submission = await keeperhub.transfer({
      network: match.send.network,
      recipientAddress: match.receive.settlementAddress,
      amount: match.send.amount,
    });

    console.log(`[coordinator]   → submitted execution ${submission.executionId} (status: ${submission.status})`);

    // Fetch status to surface the tx hash + explorer link
    const final = await keeperhub.getStatus(submission.executionId);
    if (final.transactionHash) {
      console.log(`[coordinator]   → tx hash: ${final.transactionHash}`);
      console.log(`[coordinator]   → explorer: ${final.transactionLink}`);
    } else {
      console.log(`[coordinator]   → final status: ${final.status} (no hash yet)`);
    }
  } catch (err) {
    console.error(`[coordinator]   → KeeperHub dispatch failed:`, err);
  }
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
    typeof o.settlementAddress === "string" &&
    /^0x[a-fA-F0-9]{40}$/.test(o.settlementAddress) &&
    typeof o.expiresAt === "string"
  );
}

main().catch((err) => {
  console.error("[coordinator] fatal:", err);
  process.exit(1);
});
