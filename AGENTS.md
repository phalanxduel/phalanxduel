---
title: "AI Agent Instructions"
description: "RTK shell command prefix rule and AI collaboration expectations. Applies to all agents: Claude, Codex, Gemini, Copilot."
status: active
updated: "2026-04-03"
audience: agent
related:
  - docs/tutorials/ai-agent-workflow.md
  - docs/reference/dod.md
  - docs/system/AI_COLLABORATION.md
---

<!-- backlog-instructions v1 -->
<CRITICAL_INSTRUCTION>

## BACKLOG WORKFLOW INSTRUCTIONS

This project uses Backlog.md MCP for all task and project management activities.

### CRITICAL GUIDANCE

- If your client supports MCP resources, read `backlog://workflow/overview` to understand when and how to use Backlog for this project.
- If your client only supports tools or the above request fails, call `backlog.get_workflow_overview()` tool to load the tool-oriented overview (it lists the matching guide tools).

- **First time working here?** Read the overview resource IMMEDIATELY to learn the workflow
- **Already familiar?** You should have the overview cached ("## Backlog.md Overview (MCP)")
- **When to read it**: BEFORE creating tasks, or when you're unsure whether to track work

These guides cover:
- Decision framework for when to create tasks
- Search-first workflow to avoid duplicates
- Links to detailed guides for task creation, execution, and finalization
- MCP tools reference
- DAG-first dependency rules for sequential work items

You MUST read the overview resource to understand the complete workflow. The information is NOT summarized here.

</CRITICAL_INSTRUCTION>
<!-- /backlog-instructions -->

# AI Agent Instructions

## Shell Commands — RTK (All Agents)

**Prefix all shell commands with `rtk`**. RTK compresses output to reduce token consumption. No dedicated filter means pass-through — always safe.

```bash
# ✅ Always use rtk
rtk git status
rtk pnpm test
rtk vitest run

# ✅ In chains
rtk git add . && rtk git commit -m "msg" && rtk git push
```

| Category | Typical savings |
|---|---|
| Tests (vitest, playwright) | 90–99% |
| Build/Lint (tsc, eslint, prettier) | 70–87% |
| Git (status, log, diff, add, commit) | 59–80% |
| GitHub CLI (gh pr, gh run, gh issue) | 26–87% |
| Package managers (pnpm, npm) | 70–90% |
| Files (ls, grep, find) | 60–75% |

## Current Priority

**TASK-243 is in `Human Review`.** Implementation is committed (`21507f59`).
Do not pull new work until the human reviewer marks it `Done`.

**TASK-243: Add public open matches and internal Glicko matchmaking.**
Implementation is mid-stream with significant uncommitted changes across two
layers:

- **Staged (feature shell):** `client/src/lobby.tsx`, `server/src/match.ts`,
  `server/src/routes/matchmaking.ts` — open-match list UI, match manager
  changes, REST routes.
- **Unstaged (persistence foundation):** `server/src/db/schema.ts`,
  `server/src/db/match-repo.ts`, `server/src/match-types.ts`,
  `shared/src/schema.ts`, `server/src/app.ts`, `server/src/ladder.ts` — db
  schema, repo queries, types, shared contract, app wiring, rating integration.
- **Untracked (new files):** `server/src/ratings.ts` (Glicko logic),
  `server/src/routes/profiles.ts` (public profile endpoint),
  `server/migrations/0002_public_open_matches_and_player_ratings.sql`,
  `bin/qa/bot-swarm.ts`, `server/tests/bot-swarm.test.ts`.

**Pre-flight scaffolding already landed (same session):**
- `docs/quality/high-signal-surfaces.md` — required reading before touching
  `shared/src/schema.ts`, `server/src/db/schema.ts`, `server/src/app.ts`, or
  `server/src/db/migrations.ts`. All four are in the TASK-243 change set.
- `docs/quality/quality-gap-adoption-plan.md` — quality gap inventory.
- `docs/tutorials/playthrough-scenarios.md` — QA baseline for match creation
  and join flows before those flows are changed.

**Verification:** `pnpm verify:quick` passed clean (build, lint, typecheck,
docs, prettier) inside the pre-commit hook on the full 27-file change set.

**After TASK-243:** TASK-94 (Horizontal Scaling Architecture — extract
`IMatchManager` seam, then add Neon `LISTEN/NOTIFY` distributed backplane) is
the next workstream. Do not start TASK-94 until TASK-243 is `Done`.

**Do not resume the stale production-readiness queue below.** The live Backlog
state is ahead of this file's older notes: `TASK-165`, `TASK-161`, `TASK-49`,
and `TASK-166` have already landed, and the former `Human Review` slices are
no longer the next blocker.

**Recommended execution order for TASK-94:**

1. Extract the manager/interface seam and app composition boundary.
2. Document the distributed backplane contract and subtask DAG: match
   ownership, Postgres `LISTEN/NOTIFY` fanout, graceful local fallback,
   horizontal-vs-vertical scaling, and multi-node validation strategy.
3. Implement the distributed adapter and broadcast path in follow-up tasks.

**TASK-130 is Done.** REST gameplay action submission now exposes
`POST /api/matches/:id/action`, returns a redacted `TurnViewModel`, and reuses
the same player-identity protection as the WebSocket action path.

**TASK-131 is Done.** REST matchmaking now exposes
`GET /api/matches/lobby` and `POST /api/matches/:id/join`, with OpenAPI
coverage, server tests, and site-flow documentation for external-client
bootstrap before `/ws`.

**TASK-125 is Done.** Scenario orchestration now runs through a validated
shared `bin/qa/scenario.ts` contract with automated coverage for the scenario
generator/loader and both runner entrypoints loading the same file shape.

**TASK-120 is Done.** SDK automation now generates REST SDKs plus WebSocket
message models, publishes `sdk-go` and `sdk-ts` artifacts in CI, and includes
a resilient Go duel CLI with reconnect, ACK replay, and session rejoin
support.

**TASK-143 is Done.** The final documentation verification pass landed with
stale-priority cleanup, canonical deployment wording fixes, and a clean
verification run.

**TASK-151 is Done.** External client apps now live under `clients/` while
generated SDKs remain under `sdk/`.

**TASK-145 is Done.** The OTel-native observability migration workstream has
its full child DAG completed, including vendor removal, collector-first policy
cleanup, topology verification, and gameplay telemetry hardening.

**TASK-149 is Done.** The final observability verification pass confirmed
active repo surfaces no longer present deprecated observability backends as
supported architecture.

**TASK-154 is Done.** Collector-topology verification is complete and its
reviewed result is now part of the observability baseline.

**TASK-156, TASK-157, TASK-158, and TASK-159 are Done.** The gameplay
telemetry chain now has landed evidence for browser QA correlation,
session/reconnect semantics, cross-service topology metadata, and LGTM
operator-query verification.

**Recently completed:**

- ✅ **TASK-50 — Docker Infrastructure Hardening (Phases 1-2 Done)**
  - TASK-51–66: Fly.io production hardening + staging environment (16 tasks)
  - TASK-67–70: Local docker-compose + OTel collector integration (4 tasks)
  - Production-grade Docker image, CI/CD security scanning, health checks, graceful shutdown, OTel sidecar on Fly.io, local dev environment fully configured
- ~~TASK-45 — Event Log workstream~~ (all child tasks done, workstream closed)
- ~~TASK-46 — Document missing HTTP API routes in SITE_FLOW.md~~ (Done)
- ~~TASK-2 — Canonical Per-Turn Hashes for Replay Integrity~~ (Done)

**Documentation cleanup chain:**

- `TASK-155` — Expand Dash Docset with Sequence and Domain Diagrams (`Done`)

**Historical production-readiness note:**

The older release-hardening queue below this point is historical context only.
Do not infer active status from it; use Backlog as the source of truth and treat
`TASK-94` as the live next step.

**Observability migration DAG:**

- `TASK-145` — Workstream: OTel-native Observability Migration (`Done`)
- `TASK-146` — Remove Sentry Runtime and Release Tooling (`Done`)
- `TASK-147` — Rewrite Observability Docs and Env Contracts (`Done`)
- `TASK-148` — Replace Sentry Operational Semantics with OTel/LGTM (`Done`)
- `TASK-149` — Final Observability Verification Pass (`Done`)
- `TASK-152` — Define Collector-First Observability Policy (`Done`)
- `TASK-153` — Rename Collector Helper and Env Contracts (`Done`)
- `TASK-154` — Verify Collector Topology Alignment (`Done`)
- `TASK-156` — Establish Gameplay Root Spans and Browser QA Correlation (`Done`)
- `TASK-157` — Add Session and Reconnect Telemetry Semantics (`Done`)
- `TASK-158` — Harden Cross-Service Topology Metadata for LGTM (`Done`)
- `TASK-159` — Verify LGTM Gameplay Topology and Operator Queries (`Done`)

**Historical review-ready tasks:**

These older notes are retained only for context; verify actual task state in
Backlog before acting on them.

**Current implementation task:**

- `TASK-94` — Workstream: Horizontal Scaling Architecture

## Workflow Policy

**Single-threaded on `main`.** Do not create branches unless a human explicitly
requests one. Commit small, commit often. Never leave main broken.

The backlog is the shared source of truth for all agents. Always reflect the
real state: what is in progress, what needs human review, what is done. Stale
`In Progress` entries mislead other agents — move tasks back to `To Do` if
work stops.

See [`docs/tutorials/ai-agent-workflow.md`](docs/tutorials/ai-agent-workflow.md)
for the full workflow, WIP limits, and verification expectations.

## AI Collaboration

Use [`docs/system/AI_COLLABORATION.md`](docs/system/AI_COLLABORATION.md) for the
full policy. The root instruction file keeps only the repo-wide minimum:

- AI output is untrusted until reviewed, tested, and validated.
- Human reviewers remain accountable for correctness, security, privacy,
  fairness, observability, and maintainability.
- Give agents explicit acceptance criteria, constraints, and verification
  commands.
- Keep instruction files short, non-conflicting, and tied to canonical docs
  instead of restating them.
- Update docs/contracts when behavior, commands, or operator workflows change.

## 🏗️ Hybrid Development Model

We use a **Hybrid Development Model** to balance developer velocity with deployment reliability.

### 1. Host-Native Development (Primary)
All active game development, debugging, and the core inner loop happens **natively on the host**.
- **Server**: `pnpm dev:server` (Postgres on host)
- **Client**: `pnpm dev:client` (Native browser)

This eliminates the "container burn" and provides the fastest feedback cycle.

### 2. Containerized Automation & Verification
Docker is reserved for **isolated verification** and **automated QA**.
- **Automation Service**: All non-trivial CLI tasks (lint, heavy tests) can run inside the `automation` container via `bin/dock`.
- **GHA/act**: Continuous integration and local GitHub Action simulations run in containers to ensure deployment parity.

### 3. Production Parity
The `Dockerfile` in the root is the **canonical production environment**. All staging and production deployments use this image.

## 🛠️ Operational Excellence (The One True Way)

We adhere to a high-fidelity development workflow.

### 1. Unified System Check
Always run the unified check before declaring a task complete. This defaults to the host-native version for speed:
```bash
rtk pnpm check
```
(Runs Build → Lint → Typecheck → Test natively)

### 2. Containerized Verification
Before pushing, verify the full stack in an isolated container:
```bash
rtk bin/dock pnpm verify:full
```

### 3. Observability (LGTM Stack)
We use a centralized **Grafana LGTM stack** (Loki, Grafana, Tempo, Mimir).
- **Dev Mode**: Native apps report to the host collector at `http://127.0.0.1:4318`.
- **Containers**: Use `http://host.docker.internal:4318` to reach the host collector.

### 4. Local GitHub Actions Testing
Test workflows locally using `act`:
```bash
act -l                    # List workflows
act                       # Run all workflows
act push -j build-test    # Run a specific job
```
The project includes an `.actrc` for consistent local simulation.

## 🏗️ Repository Architecture

| File | Tool | Purpose |
|------|------|---------|
| `AGENTS.md` | All agents | Canonical: RTK rule, backlog workflow pointer, collaboration policy |
| `bin/` | Operational Scripts | `check`, `test`, `maint/`, `qa/` |
| `CLAUDE.md` | Claude Code | Single line pointing to `AGENTS.md` for RTK rule |
| `.github/copilot-instructions.md` | GitHub Copilot | Pointers to canonical docs (AGENTS.md, DoD, RULES.md) |
| `.github/instructions/trust-boundaries.instructions.md` | GitHub Copilot (scoped) | Trust boundary reminders for engine/server/shared/rules changes |
| `docs/tutorials/ai-agent-workflow.md` | All agents | Repo-local Backlog.md workflow: task lifecycle, WIP limits, branching |
| `.github/CONTRIBUTING.md` | All contributors | Setup, validation commands, links to AGENTS.md and DoD |
| `.codex/` | Codex | Skills only — no instruction content |
| `.gemini/settings.json` | Gemini CLI | MCP server config only — no instruction content |
| `.serena/project.yml` | Serena | Language server config only — no instruction content |
