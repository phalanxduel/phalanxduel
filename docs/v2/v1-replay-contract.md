# v1 Replay Contract

This document captures replay and recording behavior that Godot v2 must port
for visual confirmation and deterministic review.

Primary sources:

- `client/src/lobby.tsx`
- `server/src/routes/matches.ts`
- `bin/qa/replay-verify.ts`
- `bin/qa/simulate-headless.ts`
- `bin/qa/scenario.ts`
- `shared/src/schema.ts`

## Replay Sources

There are three replay-like sources in v1:

| Source | Purpose | Godot use |
|---|---|---|
| Completed match action log | public rewatch of persisted matches | full replay viewer |
| Scenario file | deterministic local engine action sequence | harness input and comparator seed |
| Playthrough artifact | screenshots, events, winner, score | visual parity oracle |

Godot should support all three over time, but the first parity milestone is
the playthrough artifact plus deterministic scenario flow.

## Completed Match Action Log

Endpoint:

```text
GET /api/matches/:id/actions
```

Response fields used by the browser rewatch screen:

- `matchId`
- `engineVersion`
- `seed`
- `startingLifepoints`
- `player1Name`
- `player2Name`
- `totalActions`
- `actions[]`

Each action entry includes:

- `sequenceNumber`
- shared action fields such as `type`, `playerIndex`, `column`,
  `attackingColumn`, `defendingColumn`, or `cardId`
- `timestamp`
- `stateHashBefore`
- `stateHashAfter`
- optional `turnHash`

Godot must treat the action log as ordered, authoritative replay input.

## Replay Step Reconstruction

Endpoint:

```text
GET /api/matches/:id/replay?step=N
```

The server replays from deterministic initial config through the first `N`
public actions and returns a `GameState`. The replay path uses
`computeStateHash` and the match draw timestamp to preserve card IDs across
reconstruction.

Godot should render each replay step from the returned `GameState` or from a
server-generated renderer-independent view state. It should not replay rules in
GDScript unless it is only consuming precomputed frames.

The browser replay contract is currently "step plus snapshot"; Godot has local
dictionary frames. A shared parity frame should include `step`,
`sequenceNumber`, `action`, `stateHashBefore`, `stateHashAfter`, optional
`turnHash`, `events`, `viewerIndex`, and either `GameState` or
`GameViewState`.

## Browser Rewatch UX

The browser rewatch route is `?screen=rewatch&matchId=<id>&step=<n>`.

Automation-relevant controls:

| Browser surface | Selector |
|---|---|
| Match header | `data-testid="rewatch-match-header"` |
| Current action label | `data-testid="rewatch-action-label"` |
| Step counter | `data-testid="rewatch-step-label"` |
| Scrubber | `data-testid="rewatch-step-scrubber"` |
| Previous | `data-testid="rewatch-prev-btn"` |
| Play/pause | `data-testid="rewatch-play-btn"` |
| Next | `data-testid="rewatch-next-btn"` |
| Speed | `data-testid="rewatch-speed"` |
| Rendered board | `data-testid="rewatch-board"` |

The rewatch screen embeds the same game/game-over renderers used by live play,
with viewpoint controls for P1, P2, and spectator.

Godot parity target:

- step scrubber,
- previous/play/next,
- playback speed,
- viewpoint selection,
- board frame rendering,
- game-over frame rendering.

Social features such as favorites, ratings, and comments can remain browser
only until core replay parity is proven.

## Playthrough Recording Artifacts

The browser playthrough runner records:

- `manifest.json`
- `events.ndjson`
- `console-errors.log` on failure
- screenshots under `screenshots/`

The manifest captures terminal evidence:

- winner/result text,
- victory summary,
- final LP text and structured LP,
- turn/action counts,
- screenshot list.

Godot recording parity must emit the same terminal evidence so a local agent
can answer "who won and what was the score" without reading pixels.

## Replay Integrity

Replay integrity depends on:

- shared `ActionSchema`,
- deterministic initial match config,
- ordered action sequence,
- transaction state hashes,
- `computeStateHash`,
- `qa:replay:verify` and `qa:playthrough:verify`.

If replay output diverges, treat it as a contract or determinism bug, not a
visual-only mismatch.

## Godot Replay Requirements

For Godot v2 parity, a replay-capable run should provide:

| Requirement | Evidence |
|---|---|
| Loads a replay/scenario input | manifest source fields |
| Hydrates first frame | `hydrated` checkpoint |
| Advances frames | ordered frame/checkpoint events |
| Renders same phase order | screenshot labels and comparator |
| Renders game-over terminal frame | game-over screenshot plus winner/LP fields |
| Can run headless | nonzero failure on missing checkpoints |
| Can run visible | headed command or recording artifact |

The final Steam-ready flow should support both a live spectator watch session
and offline deterministic replay artifacts.
