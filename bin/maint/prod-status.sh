#!/usr/bin/env bash
set -euo pipefail

echo "== GitHub Actions Pipeline =="
gh run list -L 3
echo ""

echo "== Game Server (play.phalanxduel.com) =="
curl -s https://play.phalanxduel.com/health || echo "Unreachable"
echo -e "\n\n== Admin Server (phalanxduel-admin.fly.dev) =="
curl -s https://phalanxduel-admin.fly.dev/health || echo "Unreachable"
echo -e "\n"
