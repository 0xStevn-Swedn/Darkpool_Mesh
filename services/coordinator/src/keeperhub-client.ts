/**
 * Thin wrapper around KeeperHub's Direct Execution API.
 * Auth: Bearer (note: docs say X-API-Key but that returns 401 — see docs/feedback.md).
 */

export interface TransferRequest {
  network: string;          // "sepolia", "base", etc.
  recipientAddress: string; // EVM 0x...
  amount: string;           // human-readable, e.g. "0.001"
}

export interface TransferResponse {
  executionId: string;
  status: "pending" | "running" | "completed" | "failed";
}

export interface ExecutionStatus {
  executionId: string;
  status: "pending" | "running" | "completed" | "failed";
  type?: string;
  transactionHash?: string;
  transactionLink?: string;
  gasUsedWei?: string;
  error?: string | null;
  network?: string;
  createdAt?: string;
  completedAt?: string;
}

export class KeeperHubClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  /**
   * Submit a native token transfer. KeeperHub signs from the org's
   * Turnkey-backed wallet and broadcasts with retry + gas optimization.
   */
  async transfer(req: TransferRequest): Promise<TransferResponse> {
    const res = await fetch(`${this.baseUrl}/api/execute/transfer`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`KeeperHub transfer failed: ${res.status} ${errorBody}`);
    }

    return (await res.json()) as TransferResponse;
  }

  /**
   * Fetch status (and tx hash, once mined) for a previously-submitted execution.
   */
  async getStatus(executionId: string): Promise<ExecutionStatus> {
    const res = await fetch(`${this.baseUrl}/api/execute/${executionId}/status`, {
      headers: { "Authorization": `Bearer ${this.apiKey}` },
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`KeeperHub status failed: ${res.status} ${errorBody}`);
    }

    return (await res.json()) as ExecutionStatus;
  }
}
