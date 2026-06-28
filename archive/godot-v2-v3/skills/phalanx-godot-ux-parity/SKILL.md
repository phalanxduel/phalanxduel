---
name: phalanx-godot-ux-parity
description: Drive Phalanx Duel Godot v2 UX implementation toward 1:1 parity with the browser v1/reference playthrough. Use when Codex is asked to migrate gameplay UX to Godot, compare Godot scenes against reference screenshots, build automatable Godot lobby/deployment/combat/game-over flows, adapt the v1 playthrough harness for v2, or decide the next Godot parity slice for a Steam-ready client.
---

# Phalanx Godot UX Parity

Use this skill when the task is not just "make Godot run", but "make Godot
feel and behave like the battle-tested browser/reference game and keep it
automatable."

## Start Here

1. Read `AGENTS.md`.
2. Read `docs/agents/skills/gameplay-automation.md`,
   `docs/reference/qa-runners.md`, and `docs/reference/playthrough-scenarios.md`.
3. Use `$phalanx-end-to-end-playthrough` to create or inspect a recent
   reference browser artifact.
4. Read `references/parity-workflow.md` before editing Godot scenes or harnesses.

## Parity Principle

The TypeScript engine/server remains authoritative for gameplay. The browser
playthrough is the UX and automation oracle. Godot should consume engine state,
render equivalent user-visible phases, and expose automation checkpoints instead
of duplicating rules.

## Slice Order

Prefer vertical, automatable slices:

1. Launch and hydrate a deterministic state.
2. Render lobby/readiness and match metadata.
3. Render deployment with hand, selectable card, and valid target feedback.
4. Render combat with attacker, defender, verdict/preview, and result feedback.
5. Render spectator/game-over with winner, victory reason, final LP, and log.
6. Add or update a Godot automation checkpoint for each completed slice.

Do not start broad visual polish until the slice can be driven by automation and
compared to a reference artifact.

## Required Evidence

For each parity slice, report:

- browser/reference artifact path and seed
- Godot command used (`qa:godot:automation`, `qa:godot:playthrough`, or a new
  runner)
- checkpoints reached
- screenshots or frame evidence
- known mismatch against the reference UX

If Godot cannot play from lobby to game-over yet, say that explicitly and name
the missing automation boundary.

## Verification

Run the smallest checks that prove the touched surface:

```bash
rtk pnpm qa:playthrough:verify
rtk pnpm qa:godot:automation
rtk pnpm qa:godot:playthrough -- --headless
```

When adding browser-reference comparison data, also run the reference
playthrough command from `$phalanx-end-to-end-playthrough`.
