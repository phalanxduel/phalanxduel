---
title: "AI Agent Instructions"
description: "RTK shell command prefix rule and AI collaboration expectations. Applies to all agents: Claude, Codex, Gemini, Copilot."
status: active
updated: "2026-03-31"
audience: agent
related:
  - backlog/docs/ai-agent-workflow.md
  - docs/system/DEFINITION_OF_DONE.md
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

**TASK-144 is in Human Review.** Documentation bonsai pass has pruned the last
non-canonical plan/design canopy from the live docs tree.

**Recently completed:**

- ✅ **TASK-50 — Docker Infrastructure Hardening (Phases 1-2 Done)**
  - TASK-51–66: Fly.io production hardening + staging environment (16 tasks)
  - TASK-67–70: Local docker-compose + OTel collector integration (4 tasks)
  - Production-grade Docker image, CI/CD security scanning, health checks, graceful shutdown, OTel sidecar on Fly.io, local dev environment fully configured
- ~~TASK-45 — Event Log workstream~~ (all child tasks done, workstream closed)
- ~~TASK-46 — Document missing HTTP API routes in SITE_FLOW.md~~ (Done)
- ~~TASK-2 — Canonical Per-Turn Hashes for Replay Integrity~~ (Done)

**Next candidate inside the documentation cleanup tranche:**

- `TASK-143` — Final Documentation Verification Pass

## Workflow Policy

**Single-threaded on `main`.** Do not create branches unless a human explicitly
requests one. Commit small, commit often. Never leave main broken.

The backlog is the shared source of truth for all agents. Always reflect the
real state: what is in progress, what needs human review, what is done. Stale
`In Progress` entries mislead other agents — move tasks back to `To Do` if
work stops.

See [`backlog/docs/ai-agent-workflow.md`](backlog/docs/ai-agent-workflow.md)
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

## 🛠️ Operational Excellence (The One True Way)

We adhere to a high-fidelity development workflow inspired by the `lawnstarter` and `zdots` principles.

### 1. Unified System Check
Always run the unified check before declaring a task complete:
```bash
bin/check
```
This script performs the full build cycle: Build → Lint → Typecheck → Test → Schema/Doc verification.

### 2. Standardized Testing
Use the root test runner for all package-level or project-wide tests:
```bash
bin/test
```

### 3. Observability (LGTM Stack)
We use a centralized **Grafana LGTM stack** (Loki, Grafana, Tempo, Mimir) managed via Colima.
- **Local Dev Endpoint**: `http://host.docker.internal:4318` (OTLP HTTP)
- **Grafana UI**: Accessible on your host (typically port 3000).

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
| `backlog/docs/ai-agent-workflow.md` | All agents | Repo-local Backlog.md workflow: task lifecycle, WIP limits, branching |
| `.github/CONTRIBUTING.md` | All contributors | Setup, validation commands, links to AGENTS.md and DoD |
| `.codex/` | Codex | Skills only — no instruction content |
| `.gemini/settings.json` | Gemini CLI | MCP server config only — no instruction content |
| `.serena/project.yml` | Serena | Language server config only — no instruction content |
