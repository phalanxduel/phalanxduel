#!/usr/bin/env bash
set -euo pipefail

FORCE=false
if [ "${1:-}" == "-f" ]; then
  FORCE=true
fi

if [ "$FORCE" != "true" ]; then
  echo "⚠️  WARNING: This will DESTROY all unused Docker data machine-wide."
  echo "It removes all unused containers, networks, images (both dangling and unreferenced), and volumes."
  echo "It also calls Colima prune if Colima is active."
  echo "Run with -f to execute."
  exit 1
fi

echo "🚨 Reclaiming machine-wide Docker resources..."

docker system prune -af --volumes
docker builder prune -af

if command -v colima &> /dev/null; then
  echo "🧹 Pruning Colima..."
  yes | colima prune || true
  colima ssh -- sudo fstrim -av || true
fi

echo "✅ Machine reclamation complete."
