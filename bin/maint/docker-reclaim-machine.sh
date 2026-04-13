#!/usr/bin/env bash
set -euo pipefail

FORCE=false
if [ "${1:-}" == "-f" ]; then
  FORCE=true
fi

if [ "$FORCE" != "true" ]; then
  echo "⚠️  CRITICAL: This will DESTROY all unused Docker data machine-wide."
  echo "Included: all unused containers, networks, images, and volumes."
  echo ""
  echo "👉 To proceed, run with the force flag:"
  echo "   bin/maint/docker-reclaim-machine.sh -f"
  echo "   OR"
  echo "   pnpm docker:reclaim:machine -- -f"
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
