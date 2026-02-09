# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Phalanx is a head-to-head combat card game for two or more players using a standard 52-card deck. This repository is a TypeScript monorepo (pnpm workspaces) containing the web multiplayer implementation. Game design notes and images from playtesting live in `resources/` and `images/`.

## Build / Test / Lint Commands

```bash
pnpm install              # install all workspace deps (uses lockfile)
pnpm test                 # run all unit + integration tests (vitest)
pnpm test:engine          # engine tests only
pnpm test:server          # server integration tests only
pnpm test:shared          # shared schema tests only
pnpm lint                 # eslint across all packages
pnpm typecheck            # tsc --noEmit in every package
pnpm build                # build all packages (client vite build)
pnpm schema:gen           # regenerate types.ts + JSON Schema from Zod
pnpm schema:check         # fail if generated schema artifacts are stale
pnpm rules:check          # fail if any rule ID in RULES.md lacks a test
pnpm dev:server           # start server with tsx watch (port 3001)
pnpm dev:client           # start vite dev server for client
pnpm otel:up / otel:down  # start/stop local observability stack (Docker)
```

## Workspace Packages

- **shared/** (`@phalanx/shared`) — Zod schemas (source of truth), generated TS types, JSON Schema snapshots, deterministic state hash utility. The hash module uses `node:crypto` and is exported separately via `@phalanx/shared/hash` (not browser-safe).
- **engine/** (`@phalanx/engine`) — Pure deterministic rules engine. No I/O, no transport, no randomness (RNG injected). All functions: state + action -> next state.
- **server/** (`@phalanx/server`) — Authoritative match server. Fastify + @fastify/websocket. OpenTelemetry tracing + metrics initialized at startup. Tests use supertest (BDD style).
- **client/** (`@phalanx/client`) — Web UI. Vite + TypeScript. Placeholder only; no gameplay.

## Architecture

Authoritative server pattern with event sourcing. The server validates all actions through the engine and broadcasts resulting state. The engine is pure/deterministic — same inputs always produce same outputs. See `docs/ARCHITECTURE.md`.

## Key Conventions

- **TDD-first**: every rule needs a rule ID in `docs/RULES.md` and a corresponding test before implementation. CI enforces this via `pnpm rules:check`.
- **Rule IDs**: format `PHX-<CATEGORY>-NNN` (e.g., `PHX-DEPLOY-001`). Must appear in at least one test file's `describe()` block.
- **Schema pipeline**: edit `shared/src/schema.ts` -> run `pnpm schema:gen` -> commit generated `shared/src/types.ts` + `shared/json-schema/*.json`. CI fails if stale.
- **Engine tests**: AAA style (Arrange / Act / Assert).
- **Server tests**: BDD style (describe/it with Given/When/Then language). Uses supertest against Fastify.
- **OpenTelemetry**: initialized in `server/src/telemetry.ts`. Use `traceWsMessage` / `traceHttpHandler` from `server/src/tracing.ts` for manual spans. Required span attributes: `match.id`, `player.id`, `action.type`.
- **TypeScript**: strict mode, `verbatimModuleSyntax`, `moduleResolution: "bundler"`. All packages use ESM (`"type": "module"`).

## Game Concepts (for editing rules docs)

- **Battlefield layout**: two rows of 4 cards per player facing each other
- **Suits**: Diamonds/Hearts = shields (defense); Spades/Clubs = weapons (attack)
- **Card values**: numbered cards = face value; Face cards (J/Q/K) = 11; Ace = 1 (invulnerable); Joker = 0
- **Heroicals**: Jack (Jeneral), Queen (Qaos), King (Karl) — swap onto battlefield in response to opponent's attack declaration
- **Card notation**: Ten = `T`; face-down = empty box; diagrams use Unicode box-drawing chars

## CI Gates

All must pass on PR and main push (`.github/workflows/ci.yml`): lint, typecheck, test, schema:check, rules:check.

## Custom Slash Commands

| Command | Model | Purpose |
|---|---|---|
| `/add-rule <ID> <description>` | Haiku | Add rule ID to RULES.md + TESTPLAN.md + test stub |
| `/add-schema <Name> [fields...]` | Sonnet | Add Zod schema + run generation + write tests |
| `/implement-rule <ID>` | Sonnet | TDD: read rule, write failing test, implement, verify |
| `/verify` | Haiku | Run all 6 CI gates and report pass/fail summary |
| `/resume` | Sonnet | Read ROADMAP.md and report next phase to implement |
| `/qa` | Sonnet | Run game smoke test and report what works vs what breaks |

## Custom Agents

| Agent | Model | Domain | Use For |
|---|---|---|---|
| `engine-dev` | Sonnet | `engine/src/`, `engine/tests/` | Pure function TDD, rule implementation (Phases 2-6) |
| `doc-updater` | Haiku | `docs/`, test stubs only | Rule documentation, TESTPLAN sync (Phase 0) |
| `server-dev` | Sonnet | `server/src/`, `server/tests/` | Match lifecycle, WS protocol, OTel wiring (Phases 7-8) |
| `test-runner` | Haiku | Bash, Read, Grep, Glob | Run CI gates, analyze errors, structured reporting |
| `qa-player` | Sonnet | Read, Write, Edit, Bash, Grep, Glob | Write & run game smoke test, report partial progress |

Spawn agents via the Task tool: `subagent_type: "engine-dev"`, `model: "sonnet"`. Use `run_in_background: true` for parallel phases (4+5, 8+9).

## Session Resumption

The file `.claude/ROADMAP.md` tracks implementation progress across all phases. It uses machine-readable status markers (`[x]` done, `[>]` in progress, `[ ]` pending) so a new Claude session can quickly understand project state.

**Workflow loop:**
1. `/resume` — read ROADMAP.md, see what's done, get recommended next action
2. Implement the next phase using the specified agent/command
3. `/verify` — run all CI gates to confirm nothing is broken
4. `/qa` — run game smoke test to see what functions work end-to-end
5. Update ROADMAP.md checkboxes to reflect progress
6. Commit and repeat
