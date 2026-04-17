#!/usr/bin/env bash
# bin/maint/utilization-report.sh
# Cross-references knip static analysis with runtime log frequency.

set -euo pipefail

REPORT_FILE="docs/system/UTILIZATION_REPORT.md"
mkdir -p docs/system

{
  echo "# System Utilization & Dead Code Report"
  echo "Generated at: $(date)"
  echo ""

  echo "## 1. Runtime Event Frequency (Last 5000 lines)"
  echo "| Event Name | Frequency | Status |"
  echo "|------------|-----------|--------|"

  LOG_FILE="server.log"

  if [ -f "$LOG_FILE" ]; then
    # Group events by name from JSON logs
    grep -o '\"name\":\"[^\"]*\"' "$LOG_FILE" | cut -d':' -f2 | tr -d '\"' | sort | uniq -c | sort -rn | while read -r count name; do
      echo "| $name | $count | ACTIVE |"
    done
  else
    echo "| (No log file found) | 0 | N/A |"
  fi

  echo ""
  echo "## 2. Static Analysis: Unused Exports (via Knip)"
  echo "Cross-referencing with runtime logs to identify truly dead code."
  echo ""
  echo "| File | Export | Internal Refs | Log Hits | Recommendation |"
  echo "|------|--------|---------------|----------|----------------|"

  # Run knip and parse output
  pnpm knip --no-exit-code | grep "Unused export" | head -n 50 | while read -r line; do
    FILE=$(echo "$line" | cut -d: -f1)
    NAME=$(echo "$line" | awk '{print $NF}')
    
    if [ -z "$NAME" ]; then continue; fi
    
    LOG_HIT=0
    if [ -f "$LOG_FILE" ]; then
      LOG_HIT=$(grep -c "$NAME" "$LOG_FILE" || echo 0)
    fi
    
    REC="DELETE"
    if [ "$LOG_HIT" -gt 0 ]; then
      REC="KEEP (Dynamic Usage)"
    fi
    
    echo "| $FILE | $NAME | 0 | $LOG_HIT | $REC |"
  done

  echo ""
  echo "## 3. Deployment Health"
  if [ -f fly.toml ]; then
    APP_NAME=$(grep 'app =' fly.toml | cut -d'=' -f2 | tr -d '\" ')
    echo "- **Fly.io App**: $APP_NAME"
  fi
  echo ""
  echo "Report generated successfully in $REPORT_FILE."
} > "$REPORT_FILE"
