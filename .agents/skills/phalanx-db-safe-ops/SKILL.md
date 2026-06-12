---
name: phalanx-db-safe-ops
description: Enforce Phalanx Duel database environment isolation before any database, migration, seed, psql, Drizzle, Postgres, PgHero, server test, admin data, MCP data/admin tool, or DATABASE_URL-related command. Use when Codex might run tests with a database, inspect or mutate Postgres, run migrations, seed admin users, query transaction logs, investigate schema drift, or touch server/db code.
---

# Phalanx DB Safe Ops

Use this before any database command. The ambient shell
`DATABASE_URL=postgresql:///my` is not a project database.

## Required Reading

Read `docs/agents/skills/database-environment-isolation.md` before running DB
commands. For schema or migration work, also read:

- `docs/quality/high-signal-surfaces.md`
- `docs/reference/environment-variables.md`
- `docs/ops/runbook.md` for production incidents

## Command Rules

Use the wrappers:

```bash
rtk bash bin/maint/with-dev-postgres.sh <command>
rtk bash bin/maint/with-test-postgres.sh <command>
```

Examples:

```bash
rtk bash bin/maint/with-dev-postgres.sh pnpm --filter @phalanxduel/server db:migrate
rtk pnpm --filter @phalanxduel/server test
rtk bash bin/maint/with-test-postgres.sh vitest run tests/my.test.ts
rtk pnpm verify:db:isolation
```

The server package test scripts are already wired through the test wrapper.
Still verify before inventing a new command.

## Never Do This

- Do not pass `DATABASE_URL=postgresql:///my` to project commands.
- Do not run `vitest`, `tsx`, `pnpm`, migrations, or psql against a database
  unless the dev/test role and database are explicit.
- Do not use production credentials in local command examples or prompts.
- Do not bypass guard scripts to make a command shorter.

## Stop Conditions

Stop and ask before proceeding if:

- a command would drop, truncate, purge, or rewrite live data
- environment identity is ambiguous
- production schema/data recovery is involved
- the wrapper rejects the database identity

Report the database context, wrapper used, and verification command in the
completion evidence.
