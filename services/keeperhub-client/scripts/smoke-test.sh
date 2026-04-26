#!/usr/bin/env bash
# KeeperHub direct-execution smoke test.
# Sends a small native transfer from the org wallet to RECIPIENT and prints the result.

set -euo pipefail

# --- Load env ---
REPO_ROOT="$(git rev-parse --show-toplevel)"
if [ -f "$REPO_ROOT/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env.local"
  set +a
else
  echo "Missing .env.local at repo root" >&2
  exit 1
fi

: "${KEEPERHUB_API_KEY:?KEEPERHUB_API_KEY not set}"
: "${KEEPERHUB_API_BASE:?KEEPERHUB_API_BASE not set}"

# --- Inputs ---
NETWORK="${NETWORK:-sepolia}"
RECIPIENT="${RECIPIENT:?Set RECIPIENT to your personal wallet address (0x...)}"
AMOUNT="${AMOUNT:-0.001}"

echo "Network:   $NETWORK"
echo "Recipient: $RECIPIENT"
echo "Amount:    $AMOUNT ETH"
echo

# --- Fire the transfer ---
RESPONSE=$(curl -sS -X POST "$KEEPERHUB_API_BASE/api/execute/transfer" \
  -H "X-API-Key: $KEEPERHUB_API_KEY" \
  -H "Content-Type: application/json" \
  -d @- <<JSON
{
  "network": "$NETWORK",
  "recipientAddress": "$RECIPIENT",
  "amount": "$AMOUNT"
}
JSON
)

echo "Initial response:"
echo "$RESPONSE" | python3 -m json.tool || { echo "$RESPONSE"; exit 1; }
echo

# --- Extract execution id ---
EXEC_ID=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('executionId') or '')")

if [ -z "$EXEC_ID" ]; then
  echo "No executionId in response. Likely an error above. Aborting." >&2
  exit 1
fi

echo "Execution ID: $EXEC_ID"
echo "Fetching status..."
echo

# --- One status call (sync execution; no need to loop hard) ---
sleep 2
STATUS_RESPONSE=$(curl -sS "$KEEPERHUB_API_BASE/api/execute/$EXEC_ID/status" \
  -H "X-API-Key: $KEEPERHUB_API_KEY")

echo "Status response:"
echo "$STATUS_RESPONSE" | python3 -m json.tool

# --- Surface the explorer link if present ---
TX_LINK=$(echo "$STATUS_RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('transactionLink') or '')")
TX_HASH=$(echo "$STATUS_RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('transactionHash') or '')")

if [ -n "$TX_HASH" ]; then
  echo
  echo "✓ Transaction hash: $TX_HASH"
  [ -n "$TX_LINK" ] && echo "  Explorer:        $TX_LINK"
fi