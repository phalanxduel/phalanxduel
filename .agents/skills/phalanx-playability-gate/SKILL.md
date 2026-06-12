---
name: phalanx-playability-gate
description: Enforce the Phalanx Duel playability gate before UI, client, admin UI, HUD, lobby, visual polish, or browser-experience work. Use when Codex is asked to touch UI code, run browser QA, validate a playable build, diagnose broken gameplay automation, or prove that headless and headed playthroughs still work before layering interface changes on top.
---

# Phalanx Playability Gate

Use this skill before UI work and whenever playability needs proof. Gameplay
automation is the foundation; interface work should not proceed on top of a
broken playthrough lane.

## Preflight

1. Read `AGENTS.md`.
2. If the task is Backlog-tracked, read the task record and
   `docs/tutorials/ai-agent-workflow.md`.
3. Read `docs/testing.md` and `docs/reference/qa-runners.md`.
4. For scenario-specific browser automation, read
   `docs/reference/playthrough-scenarios.md`.

## Required Gate

Before touching UI code, run:

```bash
rtk pnpm qa:playthrough:verify
```

If it fails, stop UI implementation and diagnose the playability failure first.
Record the failure, likely surface, and next command in the task notes or user
update.

## Scenario Selection

Use the smallest scenario that proves the surface:

```bash
rtk pnpm qa:playthrough
rtk pnpm qa:playthrough:ui -- --scenario guest-pvp
rtk pnpm qa:playthrough:ui -- --scenario auth-pvp
rtk pnpm qa:playthrough:ui -- --scenario guest-pvb
rtk pnpm qa:playthrough:ui -- --scenario auth-pvb
rtk pnpm qa:playthrough:ui -- --scenario guest-pvp --spectator
rtk pnpm qa:playthrough:ui:mobile
rtk pnpm qa:playthrough:ui:desktop
```

Use seeded or scenario-file runs for reproducible failures. Use spectator runs
when broadcast, redaction, reconnect, or log viewing is involved.

## UI Work Rules

- Keep gameplay automation green before polishing the interface.
- Prefer a focused UI scenario over broad verification while iterating.
- Use browser screenshots or playthrough artifacts for visual claims.
- If UI changes reveal engine/server failures, switch to the relevant gameplay
  or transport workflow before continuing.

## Completion Evidence

Report the exact commands run and whether they passed. If a broad gate is too
slow or blocked by an unrelated baseline issue, record the targeted substitute
and the reason.
