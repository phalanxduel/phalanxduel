#!/usr/bin/env zsh
#
# phalanx-qa.zsh — Bootstrap and launch the Phalanx dev environment in tmux.
#
# Usage: ./bin/phalanx-qa.zsh
#
# What it does:
#   1. Kills any existing phalanx-qa tmux session (fresh start every time)
#   2. Installs dependencies (pnpm install)
#   3. Runs tests, typecheck, and lint to verify the codebase is healthy
#   4. Creates a tmux session "phalanx-qa" with panes:
#      - Top:    game server (pnpm dev:server)
#      - Bottom: vite client (pnpm dev:client)
#   5. Attaches to the session
#
# To exit: Ctrl-B then type ":kill-session" or just close the terminal.

set -euo pipefail

SESSION="phalanx-qa"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$PROJECT_DIR"

# --- Kill existing session if present ---
if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "Killing existing tmux session: $SESSION"
  tmux kill-session -t "$SESSION"
fi

# --- Pre-flight checks ---
echo "==> Installing dependencies..."
pnpm install

echo ""
echo "==> Running tests..."
pnpm test

echo ""
echo "==> Type checking..."
pnpm typecheck

echo ""
echo "==> Linting..."
pnpm lint

echo ""
echo "==> All checks passed. Starting tmux session: $SESSION"
echo ""

# --- Create tmux session with two panes ---
# Use {first} and {top}/{bottom} tokens so the script works regardless of
# base-index / pane-base-index settings in the user's tmux.conf.
tmux new-session -d -s "$SESSION" -c "$PROJECT_DIR"
tmux split-window -v -t "${SESSION}:{first}" -c "$PROJECT_DIR"

# --- Start server in top pane, client in bottom pane ---
tmux send-keys -t "${SESSION}:{first}.{top}" "pnpm dev:server" Enter
tmux send-keys -t "${SESSION}:{first}.{bottom}" "pnpm dev:client" Enter

# --- Select the top pane (server) as default ---
tmux select-pane -t "${SESSION}:{first}.{top}"

# --- Attach ---
tmux attach-session -t "$SESSION"
