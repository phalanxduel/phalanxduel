#!/usr/bin/env bash
set -euo pipefail

# Phalanx Duel - Disk Hygiene & Storage Maintenance Tooling
# Safe, configurable disk space cleanup for test artifacts, build outputs, log files, and caches.

DAYS=7
DRY_RUN=false
FULL=false
FORCE=false

usage() {
  cat <<EOF
Usage: bin/maint/clean-disk.sh [OPTIONS]

Options:
  -d, --days N    Retention period in days for test artifacts (default: 7)
  -n, --dry-run   Show what would be cleaned without deleting files
  -f, --full      Include Docker system prune and pnpm store prune
  -y, --force     Skip confirmation prompts
  -h, --help      Display this help message
EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -d|--days)
      DAYS="$2"
      shift 2
      ;;
    -n|--dry-run)
      DRY_RUN=true
      shift
      ;;
    -f|--full)
      FULL=true
      shift
      ;;
    -y|--force)
      FORCE=true
      shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Unknown option: $1"
      usage
      ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

echo "🧹 Phalanx Duel Disk Hygiene Check"
echo "==================================="
echo "Retention threshold: $DAYS days"
echo "Dry run mode: $DRY_RUN"
echo "Full reclamation: $FULL"
echo ""

# 1. Inspect Repo Artifacts
ARTIFACTS_DIR="$REPO_ROOT/artifacts"
if [ -d "$ARTIFACTS_DIR" ]; then
  TOTAL_ARTIFACTS_SIZE=$(du -sh "$ARTIFACTS_DIR" 2>/dev/null | awk '{print $1}')
  echo "📦 Current artifacts directory size: $TOTAL_ARTIFACTS_SIZE"
else
  echo "📦 No artifacts directory found."
fi

# 2. Identify root log files & temporary backups
LOG_FILES=$(find "$REPO_ROOT" -maxdepth 1 -name "deploy-staging-*.log" -o -name "*.log" 2>/dev/null || true)
BACKUP_DIRS=""
if [ -d "$REPO_ROOT/backups" ]; then BACKUP_DIRS="$BACKUP_DIRS $REPO_ROOT/backups"; fi
if [ -d "$REPO_ROOT/.kin" ]; then BACKUP_DIRS="$BACKUP_DIRS $REPO_ROOT/.kin"; fi

# Calculate age cutoff in seconds
CUTOFF_SEC=$(( DAYS * 86400 ))
NOW_SEC=$(date +%s)

echo ""
echo "🔍 Scanning for cleanable items older than $DAYS days..."

CLEANABLE_FILES=()
CLEANABLE_BYTES=0

# Scan artifacts subdirectories for old run directories/files
if [ -d "$ARTIFACTS_DIR" ]; then
  while IFS= read -r item; do
    if [ -z "$item" ]; then continue; fi
    # Get last modified time
    if [[ "$OSTYPE" == "darwin"* ]]; then
      MTIME=$(stat -f "%m" "$item" 2>/dev/null || echo "$NOW_SEC")
      SIZE=$(stat -f "%z" "$item" 2>/dev/null || echo 0)
    else
      MTIME=$(stat -c "%Y" "$item" 2>/dev/null || echo "$NOW_SEC")
      SIZE=$(stat -c "%s" "$item" 2>/dev/null || echo 0)
    fi
    AGE=$(( NOW_SEC - MTIME ))
    if [ "$AGE" -gt "$CUTOFF_SEC" ]; then
      CLEANABLE_FILES+=("$item")
      CLEANABLE_BYTES=$(( CLEANABLE_BYTES + SIZE ))
    fi
  done < <(find "$ARTIFACTS_DIR" -mindepth 2 -maxdepth 4 \( -type d -o -type f \) 2>/dev/null)
fi

# Add root logs
for log in $LOG_FILES; do
  if [ -f "$log" ]; then
    CLEANABLE_FILES+=("$log")
  fi
done

# Convert bytes to human readable
HUMAN_CLEANABLE=$(awk -v bytes="$CLEANABLE_BYTES" 'BEGIN {
  if (bytes >= 1073741824) printf "%.2f GB", bytes/1073741824;
  else if (bytes >= 1048576) printf "%.2f MB", bytes/1048576;
  else if (bytes >= 1024) printf "%.2f KB", bytes/1024;
  else printf "%d B", bytes;
}')

echo "Found ${#CLEANABLE_FILES[@]} item(s) to clean (~$HUMAN_CLEANABLE)."

if [ "$DRY_RUN" = "true" ]; then
  echo ""
  echo "📋 [DRY-RUN] Summary of actions that would be performed:"
  echo "  - Consolidate & compress artifacts: python3 bin/maint/consolidate_artifacts.py --purge-days $DAYS"
  echo "  - Purge ${#CLEANABLE_FILES[@]} old artifact/log items older than $DAYS days (~$HUMAN_CLEANABLE)"
  if [ -n "$LOG_FILES" ]; then
    echo "  - Remove root log files: $LOG_FILES"
  fi
  if [ "$FULL" = "true" ]; then
    echo "  - Execute Docker machine reclamation: bin/maint/docker-reclaim-machine.sh -f"
    echo "  - Prune global pnpm store: pnpm store prune"
  fi
  echo ""
  echo "Dry-run complete. No files were removed."
  exit 0
fi

# Execute cleanup
if [ "$FORCE" != "true" ] && [ ${#CLEANABLE_FILES[@]} -gt 0 ]; then
  read -p "Proceed with deleting cleanable items? [y/N] " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
fi

echo "Deleting cleanable items..."

# 1. Run consolidation python script with purge flag
if [ -f "$REPO_ROOT/bin/maint/consolidate_artifacts.py" ]; then
  python3 "$REPO_ROOT/bin/maint/consolidate_artifacts.py" --purge-days "$DAYS" || true
fi

# 2. Remove identified root log files
for log in $LOG_FILES; do
  if [ -f "$log" ]; then
    echo "  Removing log file: $log"
    rm -f "$log"
  fi
done

# 3. Full mode actions
if [ "$FULL" = "true" ]; then
  echo ""
  echo "🚀 Running Full Machine Reclamation..."
  if [ -f "$REPO_ROOT/bin/maint/docker-reclaim-machine.sh" ]; then
    bash "$REPO_ROOT/bin/maint/docker-reclaim-machine.sh" -f || true
  fi
  if command -v pnpm &>/dev/null; then
    echo "🧹 Pruning pnpm store..."
    pnpm store prune || true
  fi
fi

NEW_ARTIFACTS_SIZE=$(du -sh "$ARTIFACTS_DIR" 2>/dev/null | awk '{print $1}')
echo ""
echo "✅ Disk hygiene complete!"
echo "New artifacts directory size: $NEW_ARTIFACTS_SIZE (was $TOTAL_ARTIFACTS_SIZE)"
