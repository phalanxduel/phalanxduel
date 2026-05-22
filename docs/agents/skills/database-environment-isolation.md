---
title: "Database Environment Isolation"
description: "Non-negotiable rules for which database every command must use. Violations can cause permanent data loss. Read this before running any database command."
status: active
updated: "2026-05-22"
audience: agent
severity: critical
related:
  - bin/maint/with-dev-postgres.sh
  - bin/maint/with-test-postgres.sh
  - scripts/ci/verify-db-isolation.sh
  - server/tests/db-isolation.test.ts
---

# Skill: Database Environment Isolation

## The Rule (Non-Negotiable)

| Context | Database | Postgres role | Wrapper script |
|---|---|---|---|
| Development / local server | `phalanxduel_development` | `phalanx_dev` | `bin/maint/with-dev-postgres.sh` |
| Test suite / CI | `phalanxduel_test` | `phalanx_test` | `bin/maint/with-test-postgres.sh` |

**Never cross these.** The wrong database in a test command runs
`DROP SCHEMA IF EXISTS public CASCADE` against development data.

## What the Ambient Shell Has

The shell profile sets `DATABASE_URL=postgresql:///my`. This is a valid
PostgreSQL socket URL but points to a non-project database. **Never use it.**
Always pass database commands through the wrapper scripts below.

## Running Development Commands

```bash
# Correct: all dev commands go through with-dev-postgres.sh
bash bin/maint/with-dev-postgres.sh pnpm --filter @phalanxduel/server db:migrate
bash bin/maint/with-dev-postgres.sh tsx scripts/dump-routes.ts
```

The script:
1. Hard-pins `DATABASE_URL` to `postgresql://phalanx_dev:phx_dev_local@localhost:5432/phalanxduel_development`
2. Runs `_assert_dev_db` — exits immediately if the URL resolves to any other database

## Running Tests

```bash
# Correct: all test commands go through with-test-postgres.sh
pnpm --filter @phalanxduel/server test

# Or directly:
bash bin/maint/with-test-postgres.sh vitest run tests/my.test.ts
```

The script:
1. Creates `phalanxduel_test` if absent
2. Ensures `phalanx_test` owns the `public` schema and has `CREATE ON DATABASE`
3. Pre-installs `vector` extension (requires superuser — done before migrations)
4. Runs `_assert_test_db` — exits immediately if the URL resolves to any other database
5. Applies migrations then `exec`s the command

## Verifying Isolation

```bash
# Runs 20 structural assertions — no live DB needed
pnpm verify:db:isolation

# Runs live cross-connection rejection tests
pnpm --filter @phalanxduel/server test tests/db-isolation.test.ts
```

## What the Guards Catch

- `phalanxduel_test` rejects `phalanx_dev` credentials (postgres-level firewall)
- `phalanxduel_development` rejects `phalanx_test` credentials (postgres-level firewall)
- `with-dev-postgres.sh` exits if DATABASE_URL resolves to anything other than `phalanxduel_development`
- `with-test-postgres.sh` exits if DATABASE_URL resolves to anything other than `phalanxduel_test`
- `migrations-runner.test.ts` throws at describe-time if connected to wrong database

## Prohibited Patterns

```bash
# ❌ WRONG — uses ambient postgresql:///my or whatever DATABASE_URL is
DATABASE_URL="postgresql:///my" pnpm test
vitest run                   # without with-test-postgres.sh wrapper
pnpm --filter server test    # if server/package.json doesn't go through the wrapper

# ❌ WRONG — runs migrations against a wrong database
DATABASE_URL=postgresql:///my pnpm --filter @phalanxduel/server db:migrate
```

```bash
# ✅ CORRECT
bash bin/maint/with-test-postgres.sh vitest run tests/foo.test.ts
pnpm --filter @phalanxduel/server test   # already wired through the wrapper
```

## Docker / CI

- Docker `server`, `mcp`, `pghero`, `bot-agent` services use `phalanxduel_development`
- Docker `automation` service uses `phalanxduel_test`
- CI jobs set `DATABASE_URL=postgresql://phalanx_test:phx_test_local@localhost:5432/phalanxduel_test`
- CI "Setup database users" step creates `phalanx_test`, grants schema ownership, and pre-installs `vector`

## Why This Matters

`migrations-runner.test.ts` calls `DROP TABLE ... CASCADE` across all tables in
`public` to test migrations from a clean slate. If `DATABASE_URL` pointed at
`phalanxduel_development`, it would destroy all development data. The guards
exist because an AI agent in a previous session attempted to run tests against
`postgresql:///my` — which is a valid URL for a non-project personal database.
