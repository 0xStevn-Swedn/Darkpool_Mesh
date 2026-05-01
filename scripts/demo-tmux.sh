#!/usr/bin/env bash
# Darkpool Mesh — tmux-based demo with live panes.
# Useful for recording the demo video: every component visible at once.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AXL_BINARY="${AXL_BINARY:-$HOME/projects/axl/node}"

if ! command -v tmux >/dev/null; then
  echo "tmux not installed (sudo apt install tmux)"
  exit 1
fi

SESSION="darkpool-mesh"

# Kill old session if any
tmux kill-session -t "$SESSION" 2>/dev/null || true

# Create the session with the coordinator pane
tmux new-session -d -s "$SESSION" -n demo \
  "cd $REPO_ROOT/services/coordinator && \
   echo '⏳ waiting for AXL nodes...' && \
   sleep 3 && \
   set -a && source $REPO_ROOT/.env.local && set +a && \
   npm run dev"

# Top-right: Alice
tmux split-window -h -t "$SESSION:demo" \
  "cd $REPO_ROOT/infra/axl/alice && $AXL_BINARY -config node-config.json"

# Top-right bottom: Bob
tmux split-window -v -t "$SESSION:demo.1" \
  "cd $REPO_ROOT/infra/axl/bob && $AXL_BINARY -config node-config.json"

# Bottom-left: agent commands shell (where you type publish:send / publish:receive)
tmux split-window -v -t "$SESSION:demo.0" \
  "cd $REPO_ROOT/services/agent-sdk && \
   echo '⏳ waiting for AXL...' && \
   sleep 5 && \
   export COORDINATOR_PUBKEY=\$(curl -s http://127.0.0.1:9002/topology | jq -r .our_public_key) && \
   echo '' && \
   echo '═══ Agent SDK ready ═══' && \
   echo 'COORDINATOR_PUBKEY exported.' && \
   echo '' && \
   echo 'Run:' && \
   echo '  npm run publish:send' && \
   echo '  npm run publish:receive' && \
   echo '' && \
   exec bash"

# Layout: tiled is fine for 4 panes
tmux select-layout -t "$SESSION:demo" tiled

# Drop the user into the agent shell pane
tmux select-pane -t "$SESSION:demo.1"

tmux attach-session -t "$SESSION"