#!/usr/bin/env bash
# qa/visual-regression/generate-linux-baselines.sh
# Generate Linux Playwright visual baselines using the official Playwright Docker image.
#
# Prerequisites:
#   - Docker running (Colima or native)
#   - Dev server and client running on host (ports 3001 and 5173)
#
# Strategy: Mount the repo read-only with a tmpfs overlay for node_modules so
# the container's Linux-native pnpm install doesn't clobber the host's Darwin
# deps. Only the snapshot output directory is mounted read-write.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SNAP_DIR="$SCRIPT_DIR/tests/visual.spec.ts-snapshots"

PW_VERSION="$(node -e "console.log(require('$REPO_ROOT/package.json').devDependencies['@playwright/test'].replace('^',''))")"
IMAGE="mcr.microsoft.com/playwright:v${PW_VERSION}-noble"

echo "==> Using Playwright image: $IMAGE"
echo "==> Repo root: $REPO_ROOT"

# Verify host services are reachable
curl -sf "http://127.0.0.1:3001/health" >/dev/null 2>&1 || {
  echo "ERROR: Server on port 3001 not reachable. Run: pnpm --filter @phalanxduel/server dev" >&2
  exit 1
}
curl -sf "http://127.0.0.1:5173" >/dev/null 2>&1 || {
  echo "ERROR: Client on port 5173 not reachable. Run: pnpm --filter @phalanxduel/client dev --host 127.0.0.1" >&2
  exit 1
}
echo "==> Host services verified on ports 3001 and 5173"

# Get LAN IP dynamically
HOST_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || hostname -I | awk '{print $1}')
if [ -z "$HOST_IP" ]; then
  echo "ERROR: Could not determine host LAN IP" >&2
  exit 1
fi
echo "==> Host IP: $HOST_IP"

# Write temp Playwright config on host (will be visible inside container via mount)
TEMP_CONFIG="$REPO_ROOT/.pw-linux-baselines.config.ts"
trap 'rm -f "$TEMP_CONFIG"' EXIT

cat > "$TEMP_CONFIG" << CONFIGEOF
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./qa/visual-regression/tests",
  fullyParallel: true,
  timeout: 60000,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://$HOST_IP:5173",
    trace: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.015,
    },
  },
  snapshotPathTemplate: "{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}-{projectName}-{platform}{ext}",
});
CONFIGEOF

echo "==> Wrote temp config"

# Run Playwright inside Linux container
# Key: mount repo read-only, overlay node_modules with a tmpfs so pnpm install
# writes Linux-native binaries there without touching the host, and mount the
# snapshot directory read-write so baselines are persisted.
docker run --rm \
  -v "$REPO_ROOT:/work" \
  -w /work \
  -v /work/node_modules \
  -v /work/engine/node_modules \
  -v /work/server/node_modules \
  -v /work/shared/node_modules \
  -v /work/client/node_modules \
  -v /work/rules/node_modules \
  -e "CI=true" \
  -e "PLAYWRIGHT_BASE_URL=http://$HOST_IP:5173" \
  "$IMAGE" \
  bash -c 'set -euo pipefail
echo "==> Inside container: $(uname -a)"
corepack enable
corepack pnpm install --frozen-lockfile
echo "==> Running Playwright --update-snapshots"
npx playwright test -c /work/.pw-linux-baselines.config.ts --update-snapshots || true
echo "==> Generated snapshots:"
find /work/qa/visual-regression/tests -name "*-linux*" -type f 2>/dev/null || echo "(none found)"
'

echo ""
echo "==> Done. Check qa/visual-regression/tests/visual.spec.ts-snapshots/ for Linux baselines."
