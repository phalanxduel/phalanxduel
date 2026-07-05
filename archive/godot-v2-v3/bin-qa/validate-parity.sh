#!/bin/bash
# Validate Godot v2 parity against established baseline
# Usage: pnpm qa:validate-parity [--verbose]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

VERBOSE=${1:-}
TIMESTAMP=$(date +%s)
REPORT_FILE="artifacts/diffs/parity-validation-${TIMESTAMP}.json"

echo "🔍 Validating Godot v2 Parity"
echo "════════════════════════════════════════════════════════════"

# Ensure build is up to date
echo "  → Building..."
pnpm build > /dev/null 2>&1 || exit 1

# Run baseline audit
echo "  → Running parity baseline..."
pnpm qa:parity:baseline > /dev/null 2>&1

# Extract latest baseline report
LATEST_BASELINE=$(find artifacts/parity-baseline-* -name baseline-report.json | sort -r | head -1)

if [ -z "$LATEST_BASELINE" ]; then
  echo "❌ No baseline found. Run 'pnpm qa:parity:baseline' first."
  exit 1
fi

# Parse baseline results
PASS_COUNT=$(jq '.summary.passCount' "$LATEST_BASELINE")
TOTAL_TESTS=$(jq '.summary.totalTests' "$LATEST_BASELINE")

echo ""
echo "📊 Parity Status"
echo "════════════════════════════════════════════════════════════"
echo "  Pass: $PASS_COUNT / $TOTAL_TESTS tests"

if [ "$PASS_COUNT" -eq "$TOTAL_TESTS" ]; then
  echo "  ✅ All parity tests passing!"
  EXIT_CODE=0
else
  echo "  ⚠️  Some parity gaps detected"
  echo ""
  echo "Identified gaps:"
  jq -r '.summary.warnings[]' "$LATEST_BASELINE" | while read -r warning; do
    echo "    - $warning"
  done
  EXIT_CODE=1
fi

echo ""
echo "Validation notes:"
jq -r '.validationNotes[]' "$LATEST_BASELINE" | while read -r note; do
  echo "  • $note"
done

echo ""
echo "📁 Baseline report: $LATEST_BASELINE"
echo "🔗 Validation details: $REPORT_FILE"

if [ -n "$VERBOSE" ] && [ "$VERBOSE" = "--verbose" ]; then
  echo ""
  echo "Detailed Results:"
  echo "════════════════════════════════════════════════════════════"
  jq '.testCases | to_entries[] | "\(.key): \(.value.comparison.match)"' "$LATEST_BASELINE"
fi

exit $EXIT_CODE
