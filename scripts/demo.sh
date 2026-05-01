#!/usr/bin/env bash
# Darkpool Mesh — end-to-end demo runner.
# Spins up two AXL nodes, the coordinator, and both agents.
# Watches the coordinator log until a MATCH + tx hash appears, then exits cleanly.

set -euo pipefail

# --- Resolve paths ---
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AXL_BINARY="${AXL_BINARY:-$HOME/projects/axl/node}"
ALICE_DIR="$REPO_ROOT/infra/axl/alice"
BOB_DIR="$REPO_ROOT/infra/axl/bob"
COORD_DIR="$REPO_ROOT/services/coordinator"
SDK_DIR="$REPO_ROOT/services/agent-sdk"

LOG_DIR="$REPO_ROOT/.demo-logs"
mkdir -p "$LOG_DIR"
ALICE_LOG="$LOG_DIR/alice.log"
BOB_LOG="$LOG_DIR/bob.log"
COORD_LOG="$LOG_DIR/coordinator.log"

# --- Prereq checks ---
echo "▶ Checking prereqs..."

if [ ! -x "$AXL_BINARY" ]; then
  echo "✗ AXL binary not found at $AXL_BINARY"
  echo "  Build it first: cd ~/projects/axl && make build"
  echo "  Or set AXL_BINARY=/path/to/node"
  exit 1
fi

if [ ! -f "$REPO_ROOT/.env.local" ]; then
  echo "✗ .env.local missing at repo root"
  echo "  Create it from .env.example and set KEEPERHUB_API_KEY"
  exit 1
fi

for cmd in jq curl; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "✗ $cmd is required (sudo apt install $cmd)"
    exit 1
  fi
done

if [ ! -f "$ALICE_DIR/private.pem" ] || [ ! -f "$BOB_DIR/private.pem" ]; then
  echo "✗ AXL keys missing. Generate them:"
  echo "    cd $ALICE_DIR && openssl genpkey -algorithm ed25519 -out private.pem"
  echo "    cd $BOB_DIR   && openssl genpkey -algorithm ed25519 -out private.pem"
  exit 1
fi

# --- Cleanup on exit ---
ALICE_PID=""
BOB_PID=""
COORD_PID=""

cleanup() {
  echo
  echo "▶ Cleaning up background processes..."
  for pid in "$COORD_PID" "$BOB_PID" "$ALICE_PID"; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  # Best-effort wait; suppress "Killed" job notices
  wait 2>/dev/null || true
  echo "✓ done"
}
trap cleanup EXIT INT TERM

# --- Wait helper ---
wait_for_url() {
  local url="$1"
  local label="$2"
  local max=30
  for i in $(seq 1 $max); do
    if curl -sSf "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.5
  done
  echo "✗ timed out waiting for $label at $url"
  return 1
}

# --- 1. Start Alice ---
echo
echo "▶ Starting Alice (AXL listener)..."
( cd "$ALICE_DIR" && "$AXL_BINARY" -config node-config.json ) >"$ALICE_LOG" 2>&1 &
ALICE_PID=$!
wait_for_url "http://127.0.0.1:9002/topology" "Alice" || exit 1
ALICE_PUBKEY=$(curl -s http://127.0.0.1:9002/topology | jq -r .our_public_key)
echo "✓ Alice up · pubkey ${ALICE_PUBKEY:0:16}..."

# --- 2. Start Bob ---
echo
echo "▶ Starting Bob (AXL dialer)..."
( cd "$BOB_DIR" && "$AXL_BINARY" -config node-config.json ) >"$BOB_LOG" 2>&1 &
BOB_PID=$!
wait_for_url "http://127.0.0.1:9012/topology" "Bob" || exit 1
BOB_PUBKEY=$(curl -s http://127.0.0.1:9012/topology | jq -r .our_public_key)
echo "✓ Bob up   · pubkey ${BOB_PUBKEY:0:16}..."

# Confirm Alice and Bob actually peered
sleep 1
PEERS=$(curl -s http://127.0.0.1:9002/topology | jq '.peers | length')
if [ "$PEERS" -lt 1 ]; then
  echo "✗ Alice has no peers yet — mesh is not ready"
  exit 1
fi
echo "✓ mesh connected · $PEERS peer(s)"

# --- 3. Start coordinator ---
echo
echo "▶ Starting coordinator..."
(
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env.local"
  set +a
  cd "$COORD_DIR"
  npm run dev
) >"$COORD_LOG" 2>&1 &
COORD_PID=$!

# Wait for coordinator to log "peers connected"
for i in $(seq 1 20); do
  if grep -q "peers connected" "$COORD_LOG" 2>/dev/null; then
    break
  fi
  sleep 0.5
done

if ! grep -q "peers connected" "$COORD_LOG"; then
  echo "✗ coordinator did not start. Last 20 lines of its log:"
  tail -20 "$COORD_LOG"
  exit 1
fi
echo "✓ coordinator up"

# --- 4. Publish intents ---
echo
echo "▶ Publishing matched intent pair..."

export COORDINATOR_PUBKEY="$ALICE_PUBKEY"
# AXL_URL for the agent SDK is Bob's node (the one not directly serving the coordinator)
export AGENT_AXL_URL="http://127.0.0.1:9012"

(
  cd "$SDK_DIR"
  npm run publish:send 2>&1 | sed 's/^/  /'
) || {
  echo "✗ agent-A failed"
  exit 1
}

sleep 2

(
  cd "$SDK_DIR"
  npm run publish:receive 2>&1 | sed 's/^/  /'
) || {
  echo "✗ agent-B failed"
  exit 1
}

# --- 5. Watch for match + tx hash ---
echo
echo "▶ Waiting for match + settlement..."
echo "  (tailing coordinator log)"
echo

TX_HASH=""
EXPLORER=""
for i in $(seq 1 60); do
  if grep -q "MATCHED" "$COORD_LOG"; then
    if grep -q "tx hash:" "$COORD_LOG"; then
      TX_HASH=$(grep -oE "0x[a-fA-F0-9]{64}" "$COORD_LOG" | tail -1)
      EXPLORER=$(grep -oE "https://[a-z.]+\.etherscan\.io/tx/0x[a-fA-F0-9]{64}" "$COORD_LOG" | tail -1)
      break
    fi
  fi
  sleep 1
done

# Print the relevant slice of the coordinator log so the user sees what happened
echo
echo "─── coordinator log (relevant slice) ──────────────────────────"
grep -E "intent|MATCHED|→|tx hash|explorer|payout|amount" "$COORD_LOG" | tail -30 || true
echo "───────────────────────────────────────────────────────────────"
echo

if [ -z "$TX_HASH" ]; then
  echo "✗ no tx hash detected after 60s. Inspect logs in $LOG_DIR"
  exit 1
fi

echo "🌑  Darkpool Mesh demo · settled"
echo "    tx hash:   $TX_HASH"
echo "    explorer:  $EXPLORER"
echo
echo "(Press Ctrl+C to shut down. Logs in $LOG_DIR)"

# Keep processes alive so the user can inspect, until Ctrl+C
sleep infinity