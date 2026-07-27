---
name: disk-hygiene-manager
description: Disk space maintenance, test asset hygiene, and storage reclamation workflow for Phalanx Duel. Use when storage usage is high, artifacts directory exceeds 2 GB, after heavy QA playthrough matrix runs, during system diagnostics, or when asked to clean up testing assets, logs, database dumps, and build caches.
---

# Disk Hygiene & Asset Management

Use this skill to maintain storage hygiene across Phalanx Duel test assets, playthrough logs, visual regression snapshots, database backups, and build caches.

## When to Run

- **After heavy QA runs**: Runs like `pnpm qa:matrix`, `pnpm qa:playthrough:matrix`, `pnpm qa:api:load-test`, or `pnpm qa:gallery` generate large screenshot/log directories under `artifacts/`.
- **When `pnpm diagnostics` warns**: `report-diagnostics.sh` warns when `artifacts/` size exceeds 2 GB.
- **Before long dev sessions**: Keep storage dense and inner loops fast.

## Available Tooling & Commands

All disk hygiene actions run via `pnpm maint:clean-disk` wrappers:

```bash
# 1. Preview cleanable files without deleting anything
rtk pnpm maint:clean-disk:dry

# 2. Run standard cleanup (7-day retention for artifacts, purges old backups & root deployment logs)
rtk pnpm maint:clean-disk

# 3. Aggressive cleanup (purge artifacts older than 1 or 3 days)
rtk bash bin/maint/clean-disk.sh --days 1 --force

# 4. Full machine reclamation (includes Docker system prune and global pnpm store prune)
rtk pnpm maint:clean-disk:full
```

## What Gets Cleaned Automatically

1. **Test & QA Artifacts (`artifacts/*`)**:
   - Runs older than 72 hours are consolidated into `artifacts/<name>/YYYY/MM/DD` and compressed into `.tar.gz` archives.
   - Runs older than retention threshold (default: 7 days) are purged.
   - Empty non-default archive folders are automatically deleted.
2. **Database Backups (`backups/*`)**:
   - Old development and staging SQL dumps (`.sql`) older than retention threshold are purged.
3. **Deployment Logs (`deploy-staging-*.log`, `server*.log`)**:
   - Stale root deployment and server log files are removed.

## Safety & Best Practices

- Always run `rtk pnpm maint:clean-disk:dry` first if unsure about what files will be removed.
- Core baseline assets (such as `tut-foundations-*.mp4`, `STEAM_READY_BUNDLE.md`, `tournament-accounts.json`) are preserved.
