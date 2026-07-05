# V3 Godot Development Guide

> Iceboxed context: Godot/V3 migration is not active. This document is retained
> only as historical planning material and must not be used as current project
> direction unless Backlog explicitly reactivates Godot/V2/V3 work.

## Overview

V3 is a **UI-first Godot implementation** of Phalanx Duel targeting pixel-perfect parity with V1 (TypeScript/React).

**Learn from V2's mistake:** V2 was built as an automation harness (bot-playable) with UI bolted on afterward. This led to missing entire UI flows and architectural incompatibility. V3 starts with UI/UX as the primary concern.

## Reference Materials

### 1. Game Statechart (`engine/src/state-machine.ts`)

The canonical phase sequence:

```txt
StartTurn → DeploymentPhase → AttackPhase → AttackResolution → CleanupPhase → ReinforcementPhase → DrawPhase → EndTurn → (next turn or gameOver)
```

**Each phase is a distinct UI state that must be rendered.**

### 2. Seeded Playthrough (Reference Game)

- **Seed:** 12345
- **Turns:** 30
- **Actions:** 49 (attacks, reinforcements, passes)
- **Players:** bot-heuristic vs bot-heuristic
- **Location:** `artifacts/seeded-baseline/scenario.json`
- **V1 Screenshots:** `artifacts/seeded-baseline/v1/` (baseline UI rendering)

This scenario provides deterministic reference for V3 development: play seed 12345 in V3, compare visuals at each phase.

### 3. V1 Baseline Screenshots

From `artifacts/v1-baseline/` (also in seeded baseline):
- Lobby (player name entry, quick match button)
- Deployment (grid, card placement for each column)
- Combat phases (attack, resolution, cleanup, reinforce, draw)
- Game over (winner display)

## V3 Architecture (Proposed)

### Scene Structure

```txt
MatchRoot (main orchestrator)
├── LobbyScene (initial state)
│   ├── NameInput
│   └── QuickMatchButton
├── DeploymentScene (placement phase)
│   ├── Battlefield (4-col grid, 2 rows)
│   ├── HandDisplay
│   └── DeployButton
├── CombatScene (attack/reinforce/draw)
│   ├── Battlefield (visual gameplay)
│   ├── ActionPanel (attack/pass buttons)
│   ├── TurnIndicator
│   └── HandDisplay
└── GameOverScene (result)
    ├── WinnerDisplay
    └── RestartButton
```

### Phase Rendering Checklist

| Phase | UI Elements | Interactions |
|-------|------------|--------------|
| **StartTurn** | Loading state | — |
| **DeploymentPhase** | Grid, hand, deploy button | Click cell → place card |
| **AttackPhase** | Battlefield, action buttons | Click card → attack; Pass button |
| **AttackResolution** | Battlefield updated, damage shown | — (auto-advance) |
| **CleanupPhase** | Cards collapse/animate | — (auto-advance) |
| **ReinforcementPhase** | Action panel changes to reinforce | Click card → reinforce; Pass button |
| **DrawPhase** | Card drawn animation | — (auto-advance) |
| **EndTurn** | Turn indicator updates | — (auto-advance to next AttackPhase) |
| **gameOver** | Winner display, score, stats | Restart button |

## Development Phases

### Phase 1: Foundation (Scenes + Data Flow)
- [ ] Create Godot project structure matching V1 client
- [ ] Implement MatchRoot state machine (phase transitions)
- [ ] Wire to game engine (receive state updates, send actions)
- [ ] LobbyScene + basic flow to CombatScene

### Phase 2: Deployment UI
- [ ] Render 4×2 grid
- [ ] Display player hand (card pool)
- [ ] Deploy interaction (click cell → place card)
- [ ] Visual feedback (highlighting, animations)
- [ ] Verify against V1 baseline screenshot

### Phase 3: Combat UI
- [ ] Render battlefield with placed cards
- [ ] Attack action panel (select card → select target)
- [ ] Pass button
- [ ] Turn indicator (whose turn)
- [ ] Damage indicators
- [ ] Verify against V1 baseline screenshots

### Phase 4: Reinforcement UI
- [ ] Reinforce action panel (select card from hand → defend column)
- [ ] Pass button (skip reinforcement)
- [ ] Visual distinction from attack phase
- [ ] Verify against V1 baseline

### Phase 5: Game Over & Polish
- [ ] Winner display screen
- [ ] Stats (final HP, turns, actions)
- [ ] Restart / return to lobby
- [ ] Visual refinement (animations, timing)

### Phase 6: Pixel Parity Iteration
- [ ] Play seed=12345 in V3
- [ ] Compare each screenshot with V1 baseline
- [ ] Fix layout mismatches, sizing, colors, spacing
- [ ] Iterate until pixel-perfect

## Testing Strategy

### Verification Command
```bash
pnpm qa:seeded-baseline
```

This runs seed=12345 through both V1 and V3, generating comparison screenshots:
- `artifacts/seeded-baseline/v1/` (reference)
- `artifacts/seeded-baseline/v3/` (current build)

### Parity Checklist (Per Phase)

- [ ] Lobby: text input, button layout, responsive sizing
- [ ] Deployment: grid rendering, card visibility, deploy flow
- [ ] Attack: action panel, button placement, turn indicator
- [ ] Reinforce: action panel change, card selection UI
- [ ] Game Over: result display, formatting, spacing

## Key Differences from V2

| Aspect | V2 (❌) | V3 (✅) |
|--------|--------|--------|
| **Architecture** | Automation harness first | UI-first from day 1 |
| **Lobby** | Missing | Full implementation |
| **Deployment** | Skipped (quick-start) | Complete grid-based UI |
| **Phase Rendering** | Minimal chrome, hidden labels | Full V1 parity |
| **Development Order** | Code first, compare later | Reference screenshots → iterate |

## No Ponytail Debt to Inherit

Delete V2's `godot/client/` entirely. Start fresh with:
- Scene structure designed for V1 parity
- No commented-out hidden UI elements
- No V2-specific hardcoded hacks

## Success Criteria

1. ✅ Lobby screen matches V1 (name input, quick match button)
2. ✅ Deployment phase matches V1 (grid layout, card placement)
3. ✅ Combat UI matches V1 at each phase (action buttons, indicators, visual hierarchy)
4. ✅ Seeded playthrough (seed=12345) completes 30 turns
5. ✅ Pixel-by-pixel comparison with V1 baseline passes for representative frames

## Next Steps

1. **Review:** Examine V1 baseline screenshots in `artifacts/seeded-baseline/v1/`
2. **Plan:** Detail scene structure and data flow
3. **Start:** Create initial Godot project with LobbyScene
4. **Iterate:** Phase-by-phase UI implementation with continuous parity verification

---

**Reference:** Engine statechart `engine/src/state-machine.ts` · Scenario `artifacts/seeded-baseline/scenario.json` · V1 baseline `artifacts/seeded-baseline/v1/`
