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

echo ""
echo "🔍 Scanning for cleanable items older than $DAYS days..."

CLEANABLE_COUNT=0
CLEANABLE_BYTES=0

eval "$(python3 -c "
import os, time, re, sys
from datetime import datetime, timedelta

repo_root = '$REPO_ROOT'
days = $DAYS
now = datetime.now()
purge_cutoff = now - timedelta(days=days)

def get_date(name, path):
    match = re.search(r'(\d{4})-(\d{2})-(\d{2})', name)
    if match:
        try: return datetime.strptime(match.group(0), '%Y-%m-%d')
        except ValueError: pass
    match = re.search(r'(\d{13})', name)
    if match:
        ts = int(match.group(1)) / 1000.0
        return datetime.fromtimestamp(ts)
    try:
        return datetime.fromtimestamp(os.path.getmtime(path))
    except OSError:
        return now

count = 0
total_bytes = 0

art_dir = os.path.join(repo_root, 'artifacts')
if os.path.exists(art_dir):
    for entry in os.listdir(art_dir):
        if entry.startswith('.'): continue
        p = os.path.join(art_dir, entry)
        if os.path.isdir(p):
            for sub in os.listdir(p):
                if sub.startswith('.'): continue
                sub_p = os.path.join(p, sub)
                dt = get_date(sub, sub_p)
                if dt < purge_cutoff:
                    count += 1
                    if os.path.isdir(sub_p):
                        for r, d, f in os.walk(sub_p):
                            for fname in f:
                                try: total_bytes += os.path.getsize(os.path.join(r, fname))
                                except OSError: pass
                    else:
                        try: total_bytes += os.path.getsize(sub_p)
                        except OSError: pass

for extra in ['backups', 'logs']:
    ext_dir = os.path.join(repo_root, extra)
    if os.path.exists(ext_dir):
        for sub in os.listdir(ext_dir):
            if sub.startswith('.'): continue
            sub_p = os.path.join(ext_dir, sub)
            dt = get_date(sub, sub_p)
            if dt < purge_cutoff:
                count += 1
                if os.path.isdir(sub_p):
                    for r, d, f in os.walk(sub_p):
                        for fname in f:
                            try: total_bytes += os.path.getsize(os.path.join(r, fname))
                            except OSError: pass
                else:
                    try: total_bytes += os.path.getsize(sub_p)
                    except OSError: pass

print(f'CLEANABLE_COUNT={count}')
print(f'CLEANABLE_BYTES={total_bytes}')
")"

# Convert bytes to human readable
HUMAN_CLEANABLE=$(awk -v bytes="$CLEANABLE_BYTES" 'BEGIN {
  if (bytes >= 1073741824) printf "%.2f GB", bytes/1073741824;
  else if (bytes >= 1048576) printf "%.2f MB", bytes/1048576;
  else if (bytes >= 1024) printf "%.2f KB", bytes/1024;
  else printf "%d B", bytes;
}')

echo "Found $CLEANABLE_COUNT item(s) to clean (~$HUMAN_CLEANABLE)."

if [ "$DRY_RUN" = "true" ]; then
  echo ""
  echo "📋 [DRY-RUN] Summary of actions that would be performed:"
  echo "  - Consolidate & compress artifacts: python3 bin/maint/consolidate_artifacts.py --purge-days $DAYS"
  echo "  - Purge $CLEANABLE_COUNT old artifact/backup/log items older than $DAYS days (~$HUMAN_CLEANABLE)"
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
if [ "$FORCE" != "true" ] && [ "$CLEANABLE_COUNT" -gt 0 ]; then
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

# 2. Clean old backups & logs older than DAYS
python3 -c "
import os, shutil, time, re
from datetime import datetime, timedelta

repo_root = '$REPO_ROOT'
purge_cutoff = datetime.now() - timedelta(days=$DAYS)

for extra in ['backups', 'logs']:
    ext_dir = os.path.join(repo_root, extra)
    if os.path.exists(ext_dir):
        for sub in os.listdir(ext_dir):
            if sub.startswith('.'): continue
            sub_p = os.path.join(ext_dir, sub)
            mtime = os.path.getmtime(sub_p)
            if datetime.fromtimestamp(mtime) < purge_cutoff:
                print(f'  Removing old item: {extra}/{sub}')
                if os.path.isdir(sub_p):
                    shutil.rmtree(sub_p)
                else:
                    os.remove(sub_p)
" 2>/dev/null || true

# 3. Remove identified root log files
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
