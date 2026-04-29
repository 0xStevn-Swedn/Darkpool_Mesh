import { ReceivedMessage } from "./types.js";

/**
 * Thin wrapper around the AXL HTTP API on the local node.
 * One instance per AXL node we want to talk to.
 */
export class AxlClient {
  constructor(private readonly baseUrl: string) {}

  /**
   * Returns this node's pubkey + peer state.
   */
  async topology(): Promise<{ our_public_key: string; peers: unknown[] }> {
    const res = await fetch(`${this.baseUrl}/topology`);
    if (!res.ok) throw new Error(`topology: ${res.status} ${res.statusText}`);
    return (await res.json()) as { our_public_key: string; peers: unknown[] };
  }

  /**
   * Polls /recv exactly once.
   * Returns null on 204 (no message). Returns ReceivedMessage on 200.
   */
  async recvOnce(): Promise<ReceivedMessage | null> {
    const res = await fetch(`${this.baseUrl}/recv`);
    if (res.status === 204) return null;
    if (!res.ok) throw new Error(`recv: ${res.status} ${res.statusText}`);

    const fromPeerId = res.headers.get("x-from-peer-id") ?? "";
    const body = Buffer.from(await res.arrayBuffer());
    return { fromPeerId, body, receivedAt: new Date() };
  }

  /**
   * Long-poll /recv on a loop. Calls handler() for each message.
   * Quiet bursts: sleep 500ms after a 204 to avoid hot-spinning.
   */
  async recvLoop(handler: (msg: ReceivedMessage) => Promise<void>, signal?: AbortSignal): Promise<void> {
    while (!signal?.aborted) {
      try {
        const msg = await this.recvOnce();
        if (msg) {
          await handler(msg);
        } else {
          await sleep(500);
        }
      } catch (err) {
        console.error("recvLoop error:", err);
        await sleep(2000); // back off on errors
      }
    }
  }

  /**
   * Send raw bytes to a peer.
   */
  async send(destPubkey: string, body: string | Uint8Array): Promise<void> {
    const res = await fetch(`${this.baseUrl}/send`, {
      method: "POST",
      headers: { "X-Destination-Peer-Id": destPubkey },
      body,
    });
    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`send: ${res.status} ${res.statusText} - ${errorBody}`);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
