---
id: decision-028
title: 'DEC-2G-001 - Client UI/UX audit and remediation plan'
owner: Project Owner + Client
date: '2026-04-04'
status: accepted
---

# DEC-2G-001 - Client UI/UX audit and remediation plan

## Context

The first-party web client (`client/src/`) was audited against the canonical
rules (`docs/gameplay/rules.md` specVersion 1.0) and the engine's 8-phase turn
lifecycle. The audit asked a single question:

> Does the UI enable a player to consistently understand, decide, and act
> correctly in every phase without hidden state or ambiguity?

The answer is **no, with caveats**. Primary gameplay flows (deploy, attack,
basic stats) work, but the client has structural gaps that undermine decision
quality:

- A gameplay-blocking defect: ReinforcementPhase has no Pass/Skip control,
  forcing the player to reinforce or forfeit
- Hidden loss conditions: pass counts that trigger automatic forfeit are
  invisible despite being in the game state
- Opaque core mechanic: the target chain (Front → Back → Player with carryover
  and suit-effect boundaries) is the central gameplay loop, and the player
  cannot see it unfolding
- Inaccurate communication: half of suit boundary effects are suppressed in
  narration; one remaining effect's text is factually wrong

These are not polish issues. They are correctness and safety gaps.

## Rationale

**UI correctness outranks polish.** The current client has at least one
rules-affecting defect (F-01) where the engine supports a legal action and the
UI fails to expose it. That means the UI can force a wrong player choice.

This decision exists to:

1. Separate correctness from cosmetics so they are tracked independently
2. Prevent later drift into visual churn before the game is playable correctly
3. Establish the audit findings as the authoritative source for remediation
   work, sequenced by impact on valid play

### Relationship to TASK-173

TASK-173 ("Browser Game UI/UX Polish") is a cosmetic polish workstream. The
findings below go beyond polish — they include a gameplay-blocking bug
(F-01), hidden state that affects win/loss outcomes (F-02), and inaccurate
suit-effect communication (F-05, F-13). This decision is the structural
companion to TASK-173; the two are complementary, not redundant.

## Decision

The client will be remediated against 18 specific findings produced by the
audit. Each finding is classified as **UI-only**, **UI + API**, or
**BLOCKED (engine)** to scope implementation boundaries.

Work is sequenced into four execution waves based on what each wave
accomplishes, not just severity:

1. **Correctness** — expose legal actions, expose hidden risk state
2. **Legibility** — make canonical phases readable, make combat causality
   more legible
3. **Explainability** — make the target chain and suit effects understandable
4. **Learning and accessibility** — reduce novice confusion, improve assistive
   tech support

Engine changes are explicitly deferred except where needed for carryover
visibility (F-04).

## Scope

### In scope

- All 8 turn phases + Deployment, including no-op phases
- Target chain visibility (Front → Back → Player)
- Event alignment (narration, battle log, phase labels)
- Interaction flows (deploy, attack, reinforce, pass, forfeit)
- Control safety (accidental pass/forfeit)
- State visibility (LP, hand, deck, GY, pass counts, formation)
- Accessibility (visual, motor, cognitive, assistive tech)
- Terminology and interaction consistency

### Non-goals

- **Engine rule changes.** The engine is correct. The UI must catch up.
- **Pre-attack damage preview.** Blocked on engine simulation extraction
  (DEC-2E-005). Explicitly deferred.
- **New game modes or configuration UI.**
- **Tutorial or onboarding system.** Desirable but out of scope for this wave.
  Help content expansion is a smaller, bounded step.
- **Novice vs experienced player modes.** The tension between "obvious" and
  "not obnoxious" controls needs a design model (default concise UI, optional
  expanded detail, remembered preference). This decision acknowledges that
  tension but does not resolve it. It is a follow-up design question, not an
  implementation task.
- **Deep spectator UX audit.** Spectator view was lightly covered. Whether
  spectators can follow the game well enough without seeing hands, and whether
  hidden-information boundaries are clear, is a separate audit scope.

## Findings

### Critical

#### F-01 — No Pass/Skip button during ReinforcementPhase

- `getActionButtons()` at `game.ts:69` only shows Pass during `AttackPhase`.
  During reinforcement the player can only Forfeit or play a card. The engine
  supports `pass` during reinforcement (transitions to DrawPhase via
  `turns.ts:454-461`), but the UI does not expose it.
- **Engine verification:** `applyPass()` in `turns.ts:454-461` — when
  `state.phase === 'ReinforcementPhase'`, the function transitions through
  DrawPhase → EndTurn → StartTurn but **never touches `passState`**.
  The pass counter increment (lines 478-482) only runs in the `else` branch
  (AttackPhase passes). Reinforcement skip is confirmed free and does not
  increment consecutive or total pass counters.
- **Impact:** Player is trapped — must reinforce or forfeit the match.
- **Classification:** UI-only.

### High

#### F-02 — Pass counts and forfeit risk invisible

- `passState` (consecutivePasses, totalPasses) exists in `GameState` but is
  never rendered. Zero references to `passState`, `consecutivePasses`, or
  `totalPasses` in `client/src/`.
- Pass limits: 3 consecutive = forfeit, 5 total = forfeit. If the UI hides
  that, the system is technically correct and experientially wrong.
- **Impact:** Player can be one pass from automatic forfeit with no indication.
- **Classification:** UI-only.

#### F-04 — Target chain carryover values not shown

- Narration and battle log show damage dealt per target but never the
  intermediate `remaining` value carried forward between targets.
- This is the central UX weakness: the core mechanic exists, carryover exists,
  suit boundary effects exist, but the player cannot see the chain unfolding.
- **Impact:** Core mechanic (Front → Back → Player with carryover) is opaque.
- **Classification:** UI + API. Engine `CombatLogStep` needs a `remaining`
  field. This is an additive, backwards-compatible schema change.

#### F-05 — Heart shield and diamond death shield suppressed in narration

- `heartDeathShield` and `diamondDeathShield` are in `SUPPRESSED_BONUSES`
  (`narration-producer.ts:46-50`). These are 2 of 4 suit boundary effects.
- **Impact:** Player sees damage reduced but does not understand why.
- **Classification:** UI-only.

#### F-08 — Front-row attack pulse excludes hearts and diamonds

- `pz-active-pulse` at `game.ts:168` checks `isWeapon(bCard.card.suit)`,
  filtering out hearts and diamonds even though they are valid front-row
  attackers.
- **Impact:** Misleads players into thinking only spades/clubs can attack.
- **Classification:** UI-only.

### Medium

#### F-03 — Raw phase names in info bar

- `getPhaseLabel()` returns raw enum strings ("StartTurn", "AttackPhase",
  "CleanupPhase", "DrawPhase", "EndTurn") for 5 of 8 phases.
- `PHASE_LABELS` in `narration-overlay.ts` also only covers 4 of 9 phases.
- **Classification:** UI-only.

#### F-06 — x2 multiplier badge is misleading

- Badge appears on ALL spade/club cards regardless of row. Clubs only double
  on overflow to back card; spades only double on LP damage. A club badge on
  a back-row card, or on a front-row card facing an empty opponent column,
  promises an effect that will not trigger.
- **Evidence:** `game.ts:124-129` — no row filter, no conditional logic.
- The badge looks like a promise, not a rule reminder. Two viable options:
  - **Option A:** Remove the persistent x2 badge entirely; explain suit
    behavior in help or hover
  - **Option B:** Replace with a generic suit-role marker that does not imply
    guaranteed activation
- **Classification:** UI-only.

#### F-10 — Pass button has no confirmation

- Pass sends immediately on click with no confirmation despite counting toward
  a forfeit-triggering limit.
- Pass confirmation should only be required when the next pass would
  **immediately cause forfeit** (i.e., the pass is lethal). Counts should
  always be visible (F-02). Warning at threshold. Confirmation only at the
  point of no return.
- **Classification:** UI-only.

#### F-13 — Diamond narration text says "halved" instead of "shield"

- `diamondDoubleDefense` message: "...halved by Diamond Defense". Actual
  mechanic is absorption (`remaining = max(remaining - cardValue, 0)`), not
  halving.
- **Classification:** UI-only.

#### F-14 — Back-row cards selectable as attackers

- Click handler at `game.ts:181-183` calls `selectAttacker(pos)` for any
  occupied cell during AttackPhase — no `pos.row === 0` guard. Player can
  select a back-row card, see targets light up, then the attack fails
  server-side.
- Prevents illegal action paths in the primary action loop. Cheap fix.
- **Classification:** UI-only.

### Low

| ID | Finding | Classification |
|---|---|---|
| F-09 | No keyboard navigation | UI-only |
| F-11 | Help content missing suit effects, face cards, aces, pass rules | UI-only |
| F-12 | No column/row labels on battlefield | UI-only |
| F-15 | No deployment-complete transition announcement | UI-only |
| F-16 | No draw-phase notification | UI-only |
| F-17 | Missing ARIA landmarks and live regions | UI-only |
| F-18 | Muted text contrast fails WCAG AA | UI-only |

### Blocked

#### F-07 — No pre-attack damage preview

- Requires engine to expose a pure `previewAttack()` function that returns
  `CombatLogEntry` without mutating state. Currently `resolveAttack()` in
  `combat.ts` operates within a mutable `applyAttack()` flow.
- **Minimal requirement:** Extract a readonly simulation path.
- **Note:** DEC-2E-005 (Predictive Simulation Endpoint) already establishes
  this direction.
- **Explicitly deferred.**

## Phase Audit Summary

| Phase | Label Present? | Narration? | Gaps |
|---|---|---|---|
| Deployment | Yes ("Deployment") | Yes | No deploy counter, no alternation indicator |
| StartTurn | No (raw) | No | Flashes through as "StartTurn" |
| AttackPhase | No (raw) | Yes ("BATTLE START") | No damage preview |
| AttackResolution | No (raw) | No | Carryover invisible, half of suit effects suppressed |
| CleanupPhase | No (raw) | No | Cards vanish silently, no collapse animation |
| Reinforcement | Yes ("Reinforce col N") | Yes | **No Pass button (F-01)** |
| DrawPhase | No (raw) | No | No "drew N cards" notification |
| EndTurn | No (raw) | No | No turn-complete announcement |

## Target Chain Assessment

The core mechanic — Front → Back → Player with carryover and suit-effect
boundaries — is the least visible part of the game:

- Carryover values between targets: **not shown**
- Heart death shield: **suppressed in narration**
- Diamond death shield: **suppressed in narration**
- Club double overflow: shown
- Spade double LP: shown
- Pre-attack preview: **blocked on engine** (deferred to DEC-2E-005)
- x2 badge accuracy: **misleading** (shows on all rows/all contexts)

Two tiers of improvement:

**Tier A (cheap, immediate):**
- Show carryover values in battle log (F-04)
- Unsuppress all shield effects in narration (F-05)
- Correct diamond narration text (F-13)
- Make phase labels readable (F-03)

**Tier B (richer, still UI-focused, future):**
- Visual chain emphasis during resolution (highlight Front → Back → Player as
  steps resolve)
- Optional "show combat details" mode
- Pre-attack simulator (blocked on DEC-2E-005)

Tier B is explicitly out of scope for this decision.

## Constraint Classification Summary

| Type | Count | Examples |
|---|---|---|
| UI-only | 14 | F-01, F-02, F-03, F-05, F-06, F-08, F-09, F-10, F-11, F-12, F-13, F-14, F-15–F-18 |
| UI + API | 1 | F-04 (CombatLogStep.remaining) |
| BLOCKED (engine) | 1 | F-07 (previewAttack simulation) |

## Implementation Principles

### Single canonical phase map

All player-visible phase labels, narration labels, and action affordances
must derive from a single canonical phase map. The audit exposed drift
between:

- Raw phase names in the info bar (`getPhaseLabel()`)
- Narration phase names (`PHASE_LABELS` in narration-overlay.ts)
- Per-phase control availability (`getActionButtons()`)

These three must stay in sync. A single source-of-truth map prevents
inconsistencies from creeping back in.

### No confirmation fatigue

- Pass counts are always visible (F-02)
- Warning badge at threshold
- Confirmation dialog **only** when the next pass would immediately cause
  forfeit (the pass is lethal)
- Never add blanket confirmations to the primary action loop

### Badge semantics

UI badges (like x2) must not promise effects that may not trigger. A badge
is either always accurate or it should be a generic role indicator, not
a conditional guarantee.

### No-op phase smoothing

The engine's 8-phase state machine processes every phase for authoritative
completeness — even when a phase has no state change (e.g., a pass action
triggers AttackPhase → AttackResolution → CleanupPhase → ReinforcementPhase
→ DrawPhase → EndTurn → StartTurn → AttackPhase, all in a single
`applyAction()` call). Every hop is recorded in `phaseTrace` for replay
and telemetry integrity.

The client **deliberately does not expose intermediate no-op phases to the
player**. The narration producer (`narration-producer.ts`) only detects the
final `postState.phase` — it does not iterate `phaseTrace`. The info bar
only renders the final phase after all transitions complete. This is correct
behavior, not a bug.

The rule for phase humanization (TASK-178) is:

- **Player-actionable phases** (Deployment, Attack, Reinforcement) get
  prominent labels and narration
- **System-transit phases** (StartTurn, AttackResolution, CleanupPhase,
  DrawPhase, EndTurn) get readable labels in the info bar for the rare
  moment they're visible, but do NOT get narration announcements or splash
  screens — they are internal mechanism that would be noise for the player
- No phase should display a raw enum string to the user

### QA automation contract

The game has three tiers of QA automation:

1. **UI Playthrough** (`simulate-ui.ts`) — headed Playwright, two Chrome
   windows, bot-driven visual gameplay
2. **Headless Playthrough** (`simulate-headless.ts`) — headless Playwright,
   automated bots, parameterized matrix
3. **API Playthrough** (`api-playthrough.ts`) — pure WebSocket, no browser,
   no UI dependency

All three rely on `data-testid` attributes and CSS class selectors for phase
detection, card selection, combat targeting, and game-over verification. The
critical selectors include:

- Phase/turn: `[data-testid="phase-indicator"]`, `[data-testid="turn-indicator"]`
- Battlefield: `[data-testid^="player-cell-"]`, `[data-testid^="opponent-cell-"]`
- Cards: `.hand-card.playable`, `.hand-card.reinforce-playable`, `.bf-cell.occupied`
- Actions: `[data-testid="combat-pass-btn"]`, `[data-testid="combat-forfeit-btn"]`
- Game state: `[data-testid="game-layout"]`, `[data-testid="game-over"]`,
  `[data-testid="game-over-result"]`

**Every task in this decision must preserve or update these selectors.** If a
task adds new controls (e.g., Skip Reinforcement button), it must also add the
corresponding `data-testid` and update any QA scripts that interact with
ReinforcementPhase. If a task changes CSS classes that QA depends on, the
automation must be updated in the same PR.

### Playability invariant

The game must remain playable after every task lands. No PR from this decision
may leave the game in a broken state. This means:

- `pnpm -r test` passes (unit + integration)
- `pnpm qa:api:run` succeeds (WebSocket playthrough)
- `pnpm qa:playthrough:run` succeeds (headless Playwright)
- No selector used by QA automation is removed without replacement
- New UI controls have `data-testid` attributes from the start

If a task introduces a new action path (like Skip Reinforcement), the
Playwright scripts must be taught to use it — otherwise they will stall at
ReinforcementPhase when the new button appears but the bot does not know to
click it.

### Changelog-driven development

Each task must include a player-facing changelog entry draft. The entry
answers: "Why should a player care about this change?" This encourages
active communication that the game is improving in ways that matter.

Changelog entries follow the existing `CHANGELOG.md` format (Added, Changed,
Fixed sections) and are collected per wave into a release note.

## Consequences

- 14 of 16 non-blocked findings are UI-only — no engine or server changes
  required. These can land incrementally without schema bumps.
- F-04 (carryover in battle log) requires an additive `remaining` field in
  `CombatLogStep`. This is backwards-compatible.
- F-07 (pre-attack preview) is explicitly deferred to DEC-2E-005.
- P0 tasks (F-01, F-02, F-14) must land before any further UI polish in
  TASK-173 subtasks, since they affect gameplay correctness.

## Execution Order

### Wave 1: Correctness (land first)

Fix what is wrong. Expose legal actions. Expose hidden risk state.

| Task | Finding | Description | Scope |
|---|---|---|---|
| TASK-174 | F-01 | Add Skip Reinforcement button to ReinforcementPhase | UI-only |
| TASK-175 | F-02 | Display pass counts and forfeit risk warning | UI-only |
| TASK-177 | F-14 | Restrict attacker selection to front row only | UI-only |

TASK-174 note: the Skip button label should communicate that skipping is free.
Reinforcement skip does not increment pass counters (verified:
`turns.ts:454-461`, ReinforcementPhase branch never touches `passState`).

TASK-177 is promoted to Wave 1 because it prevents illegal action paths in the
primary action loop and is cheap to implement.

### Wave 2: Legibility (parallel, unblocked)

Make the game readable. All front-row cards pulse, all phases have labels,
all suit effects narrate.

| Task | Finding | Description | Scope |
|---|---|---|---|
| TASK-176 | F-08 | Fix front-row pulse to include all suits | UI-only |
| TASK-178 | F-03 | Humanize all phase labels (info bar + narration) | UI-only |
| TASK-179 | F-05 | Unsuppress heart/diamond death shield narration | UI-only |
| TASK-183 | F-04 | Add carryover values to battle log | UI + API |

TASK-183 is promoted to Wave 2 because carryover visibility is the single most
important non-blocking improvement — it makes the actual game logic visible.
If the API change (additive `remaining` field in `CombatLogStep`) is small
enough, it lands here; otherwise it moves to Wave 3.

### Wave 3: Explainability (sequential dependencies)

Make the details accurate and the combat understandable.

| Task | Finding | Description | Scope | Depends |
|---|---|---|---|---|
| TASK-180 | F-06 | Rework or remove misleading x2 badge | UI-only | — |
| TASK-181 | F-13 | Fix diamond narration text accuracy | UI-only | TASK-179 |
| TASK-184 | F-11 | Expand help content for all mechanics | UI-only | — |
| TASK-185 | F-12 | Add battlefield row/column labels | UI-only | — |
| TASK-182 | F-10 | Add lethal-pass confirmation | UI-only | TASK-175 |

TASK-182 note: confirmation only when the next pass would immediately cause
forfeit. Not at arbitrary thresholds. Counts (TASK-175) should be sufficient
for sub-lethal awareness; confirmation is the last-resort safety net.

### Wave 4: Learning and accessibility

Reduce novice confusion without putting speed bumps in front of experienced
players. Split a11y into two sub-phases.

| Task | Finding | Description | Scope |
|---|---|---|---|
| TASK-186 | F-17 | A11y correctness: ARIA landmarks, aria-live for turn/phase/result | UI-only |
| TASK-187 | F-18 | A11y correctness: Fix muted text contrast to WCAG AA | UI-only |
| TASK-188 | F-09 | A11y completeness: keyboard grid navigation, focus model | UI-only |

TASK-188 depends on TASK-186 (landmarks provide the semantic structure that
keyboard navigation builds on).

TASK-187 note: if muted text (#998268 on #0b0906, ~3.4:1 contrast ratio) is
widespread in the UI, this should be promoted. Evaluate during Wave 2 whether
it blocks readability.

Remaining low-priority items (F-15 deployment-complete notification, F-16
draw-phase notification) can land opportunistically alongside any wave.

### DAG

```text
Wave 1 (correctness, parallel):
  TASK-174 ─┐
  TASK-175 ─┤
  TASK-177 ─┤
             │
Wave 2 (legibility, parallel):
  TASK-176 ─┤
  TASK-178 ─┤
  TASK-179 ─┤
  TASK-183 ─┤ (conditional on API change scope)
             │
Wave 3 (explainability, some dependencies):
  TASK-180 ─┤
  TASK-181 ←── TASK-179
  TASK-182 ←── TASK-175
  TASK-184 ─┤
  TASK-185 ─┤
             │
Wave 4 (a11y, two sub-phases):
  TASK-186 ─┤ (landmarks, aria-live)
  TASK-187 ─┤ (contrast)
  TASK-188 ←── TASK-186 (keyboard nav, focus model)
```

## Anti-Regression Checklist

Before any wave is considered complete, verify:

**Gameplay correctness:**
- [ ] Legal actions are exposed in every phase (deploy, attack, pass,
  reinforce, forfeit — each available when engine permits)
- [ ] No illegal attacker selection (back-row clicks are inert)
- [ ] Pass state visible whenever pass is possible
- [ ] All 8 turn phases have readable labels in the info bar
- [ ] Player-actionable phases have narration; system-transit phases do not
- [ ] All 4 suit boundary effects produce narration
- [ ] Narration text matches actual mechanics (no "halved" for absorption)

**QA automation:**
- [ ] `pnpm -r test` passes (all unit + integration tests)
- [ ] `pnpm qa:api:run` succeeds (WebSocket playthrough)
- [ ] `pnpm qa:playthrough:run` succeeds (headless Playwright playthrough)
- [ ] No QA selector removed without replacement
- [ ] New interactive controls have `data-testid` attributes
- [ ] QA bot scripts updated if new action paths were added
- [ ] New tests added for action availability by phase

**Release readiness:**
- [ ] Changelog entry drafted for each completed task
- [ ] No raw enum strings visible to the player

## Testing Impact

### Unit / integration tests (client/tests/)

| Finding | Test Impact |
|---|---|
| F-01 | New test: Skip button present during ReinforcementPhase; sends `pass` action |
| F-02 | New tests: pass count rendering, warning at threshold, no warning below |
| F-03 | Update `getPhaseLabel()` expectations for all 8 phases |
| F-05 | Update `SUPPRESSED_BONUSES` expectations; new narration assertions |
| F-06 | Update or remove `createBattlefieldCell` x2 badge assertions |
| F-08 | Remove `isWeapon` condition from pulse assertion |
| F-10 | E2E: confirmation dialog appears only on lethal pass |
| F-14 | New test: back-row click does not call `selectAttacker()` |

### QA automation (bin/qa/)

| Finding | QA Impact |
|---|---|
| F-01 | `simulate-ui.ts` and `simulate-headless.ts`: teach bot to click Skip Reinforcement button when it appears; add `[data-testid]` for the new button |
| F-10 | `simulate-ui.ts`: if bot triggers lethal pass, handle confirmation dialog |
| F-14 | No QA impact (bots already target row 0 only) |
| F-03 | `simulate-headless.ts`: if phase detection parses `[data-testid="phase-indicator"]` text, update expected phase label strings |
| F-12 | No QA impact (labels are passive, not interactive) |

### Engine tests (engine/tests/)

| Finding | Test Impact |
|---|---|
| F-04 | New assertion: combat steps include `remaining` field |

No existing tests are expected to break destructively. All changes are additive
or tighten existing conditions.

## Future Directions (out of scope)

### Novice vs experienced player modes

The audit surfaced a recurring tension: controls that are discoverable for new
players but not obstructive for experienced ones. The likely model is:

- Default concise UI
- Optional help overlays or expanded combat detail
- Remembered preference (per-player or per-session)

This is a design question that should be resolved before Wave 4, but it is not
an implementation task in this decision.

### Spectator UX

Spectator view was lightly covered. Open questions:

- Can spectators reliably identify whose turn it is?
- Are hidden-information boundaries clear (hands redacted, graveyard
  restricted)?
- Is narration sufficient when you cannot see hands?

This is a separate audit scope.

### Phase/event source-of-truth contract

The implementation principle about a single canonical phase map (see above)
should eventually become a formal contract:

> All player-visible phase labels, narration labels, and action affordances
> derive from one shared map. Adding a new phase or action requires updating
> all three surfaces.

This prevents the drift the audit discovered between raw phase names,
narration labels, and per-phase controls.

## Rejected Alternatives

### Defer all findings to TASK-173 polish workstream

Rejected because F-01 is a gameplay-blocking bug and F-02 is a hidden-state
safety issue. These are not polish — they are correctness and safety gaps that
must be tracked and prioritized independently.

### Implement pre-attack preview (F-07) immediately

Rejected because it requires engine-level simulation extraction. DEC-2E-005
already covers this direction. The preview is desirable but not blocking for
v0.5.0 usability.

### Full accessibility overhaul as a single task

Rejected in favor of splitting a11y into two sub-phases:

- **A11y correctness now:** ARIA landmarks, aria-live for turn/phase/result
  changes, muted text contrast fixes
- **A11y completeness later:** keyboard grid navigation, richer focus model

This gives a realistic first pass that ships with Wave 4 without blocking
gameplay fixes.

### Blanket pass confirmation

Rejected. Confirmation on every pass would hurt flow. The correct model is:
show counts always, warn at threshold, confirm only when the pass is
immediately lethal.
