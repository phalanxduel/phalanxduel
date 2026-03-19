---
title: "PNPM Scripts — When to Use"
description: "Decision guidance for root pnpm scripts. Command implementations live in package.json; this captures non-obvious choices not derivable from script definitions."
status: active
updated: "2026-03-15"
audience: agent
authoritative_source: "package.json"
related:
  - .github/CONTRIBUTING.md
  - docs/system/DEFINITION_OF_DONE.md
---

# PNPM Scripts — When to Use

The full command list is in `package.json`. This document covers decision logic only.

## check:quick vs check:ci

`pnpm check:quick` — fast local validation: lint, typecheck, schema/rules/flags/docs drift, markdown lint. **Does not build or run tests.**

`pnpm check:ci` — required when the change:

- crosses package boundaries
- depends on generated build output
- modifies shared schemas or generated artifacts
- changes runtime behavior across client/server boundaries

`check:ci` adds build, test, and format checks on top of `check:quick`. Both run via Husky pre-commit; `check:ci` matches what CI runs.

## Schema and Rules

- `pnpm schema:gen` — regenerate shared JSON Schema artifacts. Run after editing `shared/src/schema.ts`.
- `pnpm schema:check` — verify artifacts are current. Run before committing schema-touching changes.
- `pnpm rules:check` — verify rules docs, runtime FSM consistency, and event log coverage. Runs two scripts:
  `verify-doc-fsm-consistency.ts` (FSM/rules alignment) and `verify-event-log.ts` (confirms every action type
  reachable from the engine produces a non-empty `PhalanxEvent[]`). Run for any turn-lifecycle, state-machine,
  or event derivation change.

## QA Playthroughs

- `pnpm qa:playthrough` — single headless simulation. Use for quick smoke testing.
- `pnpm qa:playthrough:verify` — matrix run plus anomaly verification. **Required before marking gameplay or rules changes done.**

## Documentation Artifacts

`pnpm docs:artifacts` refreshes `dependency-graph.svg` and `KNIP_REPORT.md`. Treat this as part of the normal docs workflow, not optional — run after structural changes (new packages, exports added/removed). `pnpm docs:check` rebuilds and fails if artifacts drift; this runs in CI.

## Maintenance and AI Support

`pnpm fix` — **Recommended for AI Agents.** This is a "self-healing" script that runs a comprehensive suite of fixers:
- `eslint --fix` for code logic and style.
- `prettier --write` for consistent formatting.
- `actionlint` for GitHub Actions correctness.
- `taplo fmt` for TOML configuration files.
- Custom `sed` sanitizers for common AI artifacts (e.g., removing `...` placeholders).

Run `pnpm fix` before every commit to ensure the workspace remains hardened and clean.

## deps:prune-store

Mutates the local pnpm store cache. Appropriate in CI and occasional local maintenance — **not for the fast inner loop.**
