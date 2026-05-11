---
id: TASK-297
title: 'TASK-297 - Ops: Write scripts/maint/db-backup.sh — reusable production-safe backup tool'
status: Done
assignee: []
created_date: '2026-05-10'
updated_date: '2026-05-10'
labels:
  - ops
  - database
  - safety
dependencies: []
priority: high
milestone: m-13
---

## Description

No pg_dump backup script exists. This is the shared safety foundation required before any schema migration touches staging or production.

Create `scripts/maint/db-backup.sh` that:
- Accepts `--env <local|staging|production>` and `--output-dir <path>` (default: `./backups`)
- Reads DATABASE_URL from environment
- Runs `pg_dump --no-owner --no-acl --format=plain` to a timestamped file: `phalanx_<env>_<YYYYMMDD_HHMMSS>.sql`
- Verifies dump: file exists, size > 10 KB, contains "PostgreSQL database dump" header
- Prints: full output path, file size, table count spot-check
- Exits 1 on failure with clear error; exits 0 on success
- `backups/` added to `.gitignore`

## Acceptance Criteria

- [ ] AC-1: Running against local dev DB creates a file > 10 KB that exits 0
- [ ] AC-2: `head -3 <output-file>` contains "-- PostgreSQL database dump"
- [ ] AC-3: Script prints a line like "Tables in dump: N"
- [ ] AC-4: Unset DATABASE_URL → exits 1 with message containing "DATABASE_URL"
- [ ] AC-5: Bad connection string → exits 1 with message containing "connection" or "failed"
- [ ] AC-6: `git status` does not show backup file as untracked

## Definition of Done

- [ ] `scripts/maint/db-backup.sh` created and executable
- [ ] Tested against local dev DB: output file created and verified
- [ ] `backups/` added to `.gitignore`
- [ ] AC-4 and AC-5 manually verified
- [ ] Pure bash + pg_dump — no npm packages required
- [ ] Committed on main
