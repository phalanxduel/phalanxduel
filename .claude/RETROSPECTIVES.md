# Phalanx — Retrospectives

This file records a retrospective after each completed task. New sessions should
read this file at the start of each unit of work to carry forward lessons learned.

**Format:** Each entry is written immediately after a task is completed, before
committing. Entries are in reverse chronological order (newest first).

---

## 2026-02-10 — Dependabot fix, HOWTOPLAY move, and TASKS file

**Task:** Fix the esbuild Dependabot vulnerability, move HOWTO.md to
docs/HOWTOPLAY.md reframed for dev QA, and create a docs/TASKS.md tracking
all outstanding work.

### What went well

- `gh api` for Dependabot alerts gave exact package/version info immediately —
  no need to visit the GitHub web UI.
- `pnpm why esbuild` traced the dependency chain precisely: vitest 2.x -> vite
  5.x -> esbuild 0.21.5 (vulnerable). Upgrading vitest to 3.x resolved it
  cleanly since vitest 3.x uses vite 6.x with esbuild >= 0.25.0.
- All 111 tests passed on vitest 3.2.4 with zero changes to test code — no
  breaking API changes in the vitest 2 -> 3 upgrade for this project's usage.
- Using task tracking (TaskCreate/TaskUpdate) kept the multi-part work
  organized and made progress visible.

### What was surprising

- The vitest 2 -> 3 major version bump was painless — the test API surface used
  here (describe, it, expect, vi.fn, beforeEach, beforeAll, afterAll) is
  identical between versions.
- The local Node version is 18.x but the project requires >= 20. pnpm warns
  about this but everything still works. Worth noting for the user.
- The HOWTOPLAY rewrite ended up substantially different from the original
  HOWTO — reframing it as numbered steps with a "development" context made
  it much more actionable.

### What felt effective

- Doing the vulnerability fix first was the right ordering — it touched
  package.json and pnpm-lock.yaml, so getting that committed before the doc
  changes avoids merge complexity.
- Reading the retro from the prior task reminded me to actually verify via
  tests rather than just trusting the upgrade — the "verify the HOWTO steps"
  lesson applied here too.
- The TASKS.md categorization (Bugs, Docs, Client, Engine, Server,
  Housekeeping) with priority labels gives the user a clear triage view.

### What to do differently

- Should have checked whether vitest 3 requires any config changes to
  `vitest.config.ts` files — it didn't here, but I got lucky. Next time,
  read the migration guide first.
- The esbuild vulnerability was in a transitive dependency (vitest -> vite ->
  esbuild). For future Dependabot alerts, go straight to `pnpm why <package>`
  to find the root dependency that needs upgrading.

---

## 2026-02-10 — HOWTO.md for starting and playing the game

**Task:** Create a HOWTO document covering prerequisites, setup, server/client
startup, the full gameplay sequence, and troubleshooting.

### What went well

- The prior repo evaluation meant most source files were already read and
  understood — only needed to revisit specific details (env vars, port config,
  client WS URL construction, Docker compose).
- Reading the actual source code (not just docs) revealed concrete details that
  docs alone missed: the hardcoded port 3001 in the client, the exponential
  backoff in reconnect logic, the `row: -1` convention for hand card selection.
- The test files (`ws.test.ts`, `match.test.ts`) served as excellent
  documentation of the exact message flow between client and server.

### What was surprising

- The client has no Vite proxy configured — it constructs the WS URL from
  `window.location.hostname` but hardcodes `:3001`. This means the client and
  server must run on the same host or the port must match.
- The deployment UI uses a `row: -1` sentinel value to distinguish "hand card
  selected" from "battlefield card selected" — a non-obvious encoding in the
  `GridPosition` type that was only visible by reading `renderer.ts`.
- The Heroical swap is fully implemented in the engine but has no client UI
  button — worth calling out as a known gap.

### What felt effective

- Following the retrospective lesson from the prior task ("read retros first")
  avoided re-reading files already well understood.
- Writing the HOWTO as a single narrative flow (setup -> start -> play ->
  troubleshoot) rather than a reference-style doc makes it immediately usable
  by someone new.
- Including the suit bonus and special card tables inline means a player doesn't
  need to cross-reference RULES.md while learning.

### What to do differently

- Should verify the HOWTO steps by actually starting the server and client to
  confirm the exact output messages and behavior — documentation written from
  source reading alone may have subtle inaccuracies.
- The troubleshooting section could be expanded over time as real user issues
  surface.

---

## 2026-02-10 — Repository evaluation + retrospective workflow setup

**Task:** Evaluate the entire repository structure, then add a retrospective
convention to the workflow.

### What went well

- Parallel file reads made the full-repo evaluation fast — reading 6-8 files
  per round covered every package in three passes.
- The existing ROADMAP.md and CLAUDE.md gave excellent structural context upfront,
  making it easy to know exactly which files mattered.
- The CLAUDE.md workflow loop was a natural place to embed the retrospective steps
  without creating a separate process document.

### What was surprising

- The project is further along than the PROTOCOL.md suggests — that doc still has
  placeholder TODOs even though the WS protocol is fully implemented in code.
- There are uncommitted files from a prior session (`scripts/demo.ts`,
  `package.json` demo script, `.claude/settings.local.json`) that predate this work.
- All 10 phases are marked complete but 12 test stubs remain as `.todo()` for
  deferred rules (Joker, face-down cards, Spade direct damage).

### What felt effective

- Reading ROADMAP.md first gave a clear mental model before diving into source.
- The commit message style in this repo uses short imperative summaries with
  detail in the body — worth continuing.
- Keeping the retrospective file in `.claude/` alongside ROADMAP.md is consistent
  with the session-resumption pattern already established.

### What to do differently

- Next time, check for stale/outdated docs (like PROTOCOL.md) as part of
  evaluation and flag them explicitly for the user.
- The pre-existing uncommitted files should be addressed — either commit or
  .gitignore them — to keep `git status` clean for future work.
- When the user says "continue," confirm what the next unit of work should be
  rather than assuming.

---

<!-- Add new retrospectives above this line, newest first -->
