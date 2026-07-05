---
name: phalanx-end-to-end-playthrough
description: Run and report a local Phalanx Duel v1/reference automated end-to-end head-to-head playthrough. Use when Codex is asked to play a complete local game, prove browser gameplay automation works, produce winner/score evidence, collect screenshots, retry a broken `qa:playthrough` lane, or validate the browser reference gameplay lane.
---

# Phalanx End-To-End Playthrough

Use this skill to turn "play a game and show me what happened" into a
repeatable local browser/reference playthrough with structured evidence. This
is the v1/reference browser harness for proving local gameplay automation from
lobby to game-over.

## Start Here

1. Read `AGENTS.md`.
2. Read `docs/testing.md` and `docs/reference/qa-runners.md`.
3. Read `references/local-playthrough-runbook.md` before running or reporting
   a browser playthrough.

## Default Reference Run

Use the browser head-to-head lane for fast visual proof:

```bash
rtk pnpm qa:playthrough -- --p1 human --p2 human --starting-lp 3 --screenshot-mode action --max-turns 120 --seed 20260615 --out-dir artifacts/playthrough-head2head
```

This drives two automated player contexts plus a spectator context. `starting-lp
3` is intentional for a quick complete match. Use LP 20 only when testing
full-length match pacing.

## Report Evidence

After the run, read the newest `manifest.json` under the selected `--out-dir`
and report:

- `status`, `winnerName`, `lifepointsText`, `victorySummaryText`
- `seed`, `turnCount`, `actionCount`, `startingLifepoints`
- the manifest path
- key screenshots from `screenshots`, especially `start`, first `combat`, and
  `game-over`

Do not infer winner or score from console text when `manifest.json` is
available.

## Browser Reference Use

Use this reference playthrough to prove the browser lane can still drive the
complete user-visible flow:

- lobby readiness and match start
- deployment input loop
- combat input loop
- spectator/game-over presentation
- final winner, score, and screenshots

If the browser lane cannot complete the match, treat that as a gameplay
automation failure and fix it before relying on screenshots or downstream
artifacts.

## Completion Gate

Before declaring the reference lane healthy, run:

```bash
rtk pnpm qa:playthrough:verify
```

For TypeScript runner changes, also run:

```bash
rtk pnpm -r --stream typecheck
```
