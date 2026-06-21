# Kaizen: Godot v2 Parity Continuous Improvement

**Date**: June 20, 2026  
**Status**: Baseline Established  
**Goal**: Iterative refinement toward 1:1 v1 ↔ v2 parity  

---

## Current State

### ✅ Completed
- Combat phase UX with preview/verdict display
- Input automation and bot action selection
- Spectator live-director HUD with event log
- Game-over screen with match results
- Audio/haptic cue integration
- Guest and auth PvP/PvB scenario coverage
- Full-length LP20 game pacing
- Headed and headless automation paths

### 🔧 Recently Fixed (Iteration 1)
- **Player perspective labels**: Now context-aware
  - Player mode: "YOUR SIDE" / "OPPONENT"
  - Spectator mode: Player names or "PLAYER 1" / "PLAYER 2"
  - Removed hardcoded "OPERATIVE" / "HOSTILE" confusion

### ⚠️ Known Gaps (From Baseline Audit)

1. **Event Logging Parity**
   - v1 generates 16 events for bot-vs-bot game
   - v2 generates 5 events for same game
   - Need: consistent event structure and completeness

2. **Spectator Mode Label Clarity**
   - Spectator HUD correctly shows "spectator" or "P1"/"P2"
   - Battlefield view needs additional clarity for spectators
   - Need: consistent player identity across all surfaces

3. **Bot View Rendering**
   - Bot opponent hand/battlefield may not render correctly
   - Need: verify bot-controlled player perspective

4. **Phase Transition Visualization**
   - Phase labels update correctly but need visual confirmation
   - Need: screenshot-based parity validation for phase transitions

5. **Combat Preview Completeness**
   - Combat preview shows selected action data
   - Need: verify preview matches v1 reference exactly

---

## Iteration 2 Plan: Event Logging Parity

### Objective
Achieve event count and structure parity between v1 and v2.

### Steps

1. **Inspect v1 Event Log**
   ```bash
   cat artifacts/baseline-v1-botbot/*/events.ndjson | jq '.type' | sort | uniq -c
   ```

2. **Compare with v2**
   ```bash
   cat artifacts/baseline-v2-botbot/*/events.ndjson | jq '.type' | sort | uniq -c
   ```

3. **Identify Missing Events**
   - Map v1 event types to v2 equivalents
   - Identify which v1 events v2 is not emitting

4. **Implement Missing Events**
   - Update ConnectionClient or related scripts
   - Ensure event structure matches protocol

5. **Validate**
   ```bash
   pnpm qa:parity:baseline
   ```

---

## Iteration 3 Plan: Visual Regression Testing

### Objective
Screenshot-based parity validation for all game phases.

### Steps

1. **Capture Reference Screenshots**
   ```bash
   pnpm qa:playthrough --headed --screenshot-mode phase --out-dir artifacts/ref-screenshots
   ```

2. **Capture Godot Screenshots**
   ```bash
   pnpm qa:godot:playthrough --headed --out-dir artifacts/godot-screenshots
   ```

3. **Compare Visuals**
   - Use `qa:godot:compare-snapshots` for pixel comparison
   - Document intentional visual differences (fonts, spacing, colors)

4. **Create Baseline Gallery**
   - Reference: deployment, combat, reinforcement, game-over
   - Godot: same phases, same seed scenarios

---

## Iteration 4 Plan: Spectator Mode Completeness

### Objective
Spectator mode should clearly show both players and match state.

### Gaps to Address

1. **Battlefield Labels**
   - Ensure spectators see player names or clear "PLAYER 1" / "PLAYER 2" labels
   - Status: ✅ Fixed in Iteration 1

2. **Spectator HUD Details**
   - Verify viewerIndex is null and correctly identified as spectator
   - Verify play-by-play log formatting matches v1
   - Status: ⚠️ Needs validation

3. **Spectator Actions**
   - Spectator should not be able to submit actions
   - Spectator view should be read-only
   - Status: ⚠️ Needs testing

### Validation Command
```bash
pnpm qa:godot:automation --p1 bot-heuristic --p2 bot-heuristic --out-dir artifacts/spectator-test
```

---

## Iteration 5 Plan: Bot View Context

### Objective
When a player is controlled by bot (e.g., P2 in P1-vs-bot), bot's view must render correctly.

### Gaps to Address

1. **P2 Perspective (when P2 is bot)**
   - In player mode, P2 should see "YOUR SIDE" even if bot-controlled
   - Status: ⚠️ Needs testing

2. **Bot Action Selection UI**
   - Bot's available actions should display correctly
   - Combat preview should show from bot's perspective
   - Status: ⚠️ Needs testing

### Validation Command
```bash
pnpm qa:godot:automation --seed 5000 --p1 bot-heuristic --p2 bot-heuristic --out-dir artifacts/bot-view-test
```

---

## Iteration 6 Plan: Phase Transition Completeness

### Objective
Ensure all phase transitions render visually correct and log proper events.

### Phases to Validate

- [ ] DeploymentPhase → AttackPhase
- [ ] AttackPhase → ReinforcementPhase
- [ ] ReinforcementPhase → AttackPhase (next turn)
- [ ] AttackPhase → gameOver

### Validation Command
```bash
pnpm qa:godot:automation --seed 6000 --p1 bot-heuristic --p2 bot-heuristic --out-dir artifacts/phase-test
```

---

## Continuous Validation

### Run Parity Baseline After Each Change
```bash
pnpm qa:parity:baseline
```

### Monitor These Metrics
- Event count delta (v1 vs v2)
- Checkpoint coverage (hydrated, game_over, etc.)
- Screenshot visual diff count
- Test execution time

### Establish Pass/Fail Gates
- Event count within 20% of v1
- All critical checkpoints present
- Visual diff < 5% per phase
- Zero automated action failures

---

## Kaizen Mindset

1. **Small, measurable improvements** over each iteration
2. **Data-driven decisions** using parity baselines and artifact comparison
3. **Eliminate gaps incrementally** rather than designing perfect solution upfront
4. **Continuous feedback loop** from automation to visual validation
5. **Document intentional differences** when v2 diverges from v1 by design

---

## Next Actions

1. Run `pnpm qa:parity:baseline` after each code change
2. Review event log differences (Iteration 2 plan)
3. Add screenshot validation (Iteration 3 plan)
4. Test spectator mode thoroughly (Iteration 4 plan)
5. Validate bot-controlled player rendering (Iteration 5 plan)

**Frequency**: Weekly audit, daily baseline checks on CI  
**Ownership**: Continuous improvement loop, iterate incrementally
