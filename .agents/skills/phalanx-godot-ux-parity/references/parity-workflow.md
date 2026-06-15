# Godot UX Parity Workflow

Use this workflow to convert the browser/reference playthrough into an
implementation target for Godot v2.

## Reference First

Create or locate a reference run:

```bash
rtk pnpm qa:playthrough -- --p1 human --p2 human --starting-lp 3 --screenshot-mode action --max-turns 120 --seed 20260615 --out-dir artifacts/playthrough-head2head
```

Use its `manifest.json` and screenshots as the baseline. The important fields
are:

- `winnerName`
- `victorySummaryText`
- `lifepointsText`
- `turnCount`
- `actionCount`
- `screenshots`

## Compare The UX Flow

Match these surfaces in Godot before adding optional polish:

1. Lobby readiness and match start affordances.
2. Deployment phase: hand, playable state, valid target cells, selected card.
3. Combat phase: attackable cards, valid targets, pass/skip controls, previews.
4. Spectator surface: active phase, board state, metadata, event/log feed.
5. Game-over surface: winner name, victory reason, final LP, turning point/log.

Do not treat scene launch alone as parity. The target is an automatable journey
from match setup through game-over.

## Godot Runner Expectations

Use existing lanes when possible:

```bash
rtk pnpm qa:godot:automation
rtk pnpm qa:godot:playthrough -- --headless
```

If a slice needs a new checkpoint, add it beside the existing Godot automation
harness rather than duplicating gameplay rules in GDScript. Checkpoints should
be machine-readable and stable enough for local agents to assert.

## Implementation Rules

- Source rules, actions, and terminal state from the TypeScript engine/server or
  committed scenario/replay artifacts.
- Keep UI names and phase semantics aligned with the reference screenshots.
- Prefer a narrow vertical slice over broad scene work.
- Preserve touch/mouse automation selectors or equivalent Godot automation
  commands for every new interaction.

## Reporting Template

Use this shape in final updates:

```text
Reference: artifacts/playthrough-head2head/.../manifest.json, seed ...
Godot: <command>, checkpoints ...
Parity reached: <surfaces now matching>
Remaining gaps: <missing controls/screens/checkpoints>
Evidence: <screenshot/result paths>
```
