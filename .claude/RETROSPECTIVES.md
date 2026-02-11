# Phalanx — Retrospectives

This file records a retrospective after each completed task. New sessions should
read this file at the start of each unit of work to carry forward lessons learned.

**Format:** Each entry is written immediately after a task is completed, before
committing. Entries are in reverse chronological order (newest first).

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
