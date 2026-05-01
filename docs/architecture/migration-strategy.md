---
title: "Migration Strategy Decision Record"
description: "Why we use a custom SQL runner over Drizzle's built-in migrator, and when to revisit."
status: active
updated: "2026-05-01"
audience: agent
---

# Migration Strategy Decision Record

## Decision

Keep the custom SQL-based migration runner (`server/src/db/migrate.ts`) backed by plain `.sql`
files and a `schema_migrations` table. Do not use Drizzle's built-in `migrate()`, dbmate, or
Prisma at this time.

## Context

In early 2026, production deployments experienced silent migration failures — Drizzle reported
"Migrations complete" even when the `match_actions` table was missing. Root causes:

1. Drizzle's JSON-snapshot approach (`drizzle/meta/_journal.json`) is fragile in Docker builds
   where the snapshot can become out of sync with the compiled output.
2. The Fly.io `release_command` runs the JS bundle; if the snapshot path resolves incorrectly,
   the migrator exits 0 without applying any migrations.
3. Drizzle's default migrator has no post-run verification — it does not confirm that the DB
   schema matches expectations after the run.

## Options Evaluated

| Option | Pros | Cons |
| --- | --- | --- |
| **Custom SQL runner (current)** | Full control, transparent SQL files, Rails-style `schema_migrations` table, checksum drift detection | More code to maintain |
| **Drizzle `migrate()`** | Integrated with ORM | JSON snapshot fragility, silent failure history, no count verification |
| **dbmate** | Language-agnostic binary, deterministic, zero Node.js deps | External binary in Docker image, separate from TS toolchain |
| **Prisma** | Mature migration engine, good tooling | Large dependency, full ORM switch required |

## Why Custom Runner

The custom runner (`migrate.ts` + `migrations.ts`) gives us:

- **Explicit `.sql` files** checked into `server/migrations/` — no generated JSON state.
- **Rails-style `schema_migrations` table** independent of any ORM snapshot.
- **SHA-256 checksum drift detection** — fails loudly if an applied migration was modified.
- **Directory existence guard** — fails immediately if the migrations folder is missing from
  the Docker image, catching deployment packaging errors before they reach the DB.
- **Post-run count verification** — asserts that the number of DB records equals the number
  of files on disk after every run.

## When to Revisit

Consider switching to dbmate if:

- The project adds multiple languages/services that all need migration access.
- The custom runner requires frequent maintenance.
- A language-agnostic binary simplifies the Dockerfile significantly.

Consider Prisma if:

- The team decides to adopt Prisma as the ORM (full switch, not incremental).

## Migration File Conventions

- Files live in `server/migrations/` and are named `NNNN_description.sql` (zero-padded integer prefix).
- Statements are separated by `--> statement-breakpoint` comment lines.
- Files are applied in lexicographic order.
- **Never modify a committed migration.** The checksum guard will reject it. Add a new migration instead.
