# Skill: Play a Turn

Play one complete turn in a Phalanx Duel match using the MCP engine tools.

## What You Need

- A `GameState` object (from `match_create`, `action_submit`, or `match_get`)
- The active player's index (`state.activePlayerIndex`)
- For live matches: `matchId` and `playerId` to submit via `action_submit`

## Steps

### 1. Get legal actions

```text
engine_valid_actions(state)
→ { phase, activePlayerIndex, actions: [...] }
```

This returns every action the active player may legally take right now.
If `actions` is empty the match is in a system-transition phase — wait for
the next `gameState` broadcast.

### 2. Choose an action (four methods)

#### Method A — Bot recommendation (fastest)

```text
engine_bot_recommend(state, strategy='heuristic')
→ { action, score }
```

`strategy` options: `'random'` (baseline), `'heuristic'` (fast, good),
`'mcts'` (strongest — add `iterations` between 10 and 2000).

#### Method B — LLM recommendation (natural language reasoning)

```text
engine_llm_recommend(state, playerIndex)
→ { recommendedAction, actionIndex, reasoning, provider }
```

Routes the decision through the configured LLM (llama.cpp or Anthropic).
The model receives the position summary, all legal actions with attack previews,
and suit bonus context, then returns a chosen action with a one-sentence rationale.
Requires `ANALYSIS_PROVIDER=llama` or `ANTHROPIC_API_KEY`. Slower than Method A
but produces human-readable reasoning for each move.

#### Method C — Evaluate candidates

```text
engine_evaluate(state)
→ { score, breakdown: { lp, battlefield, hand, economy } }
```

Score each candidate position after simulating the action. Higher score
(0=losing → 1=winning) is better.

#### Method D — Preview an attack before committing

```text
engine_simulate_attack(state, attackerIndex, column)
→ { attackerCard, defenderCard, damage, suitEffect, verdict }
```

Use this when `attack` is the candidate action to see LP impact and suit
bonuses before submitting.

### 3. Submit the action (live match only)

```text
action_submit(matchId, playerId, {
  type: 'deploy' | 'attack' | 'pass' | 'reinforce' | 'forfeit',
  playerIndex: <activePlayerIndex>,
  timestamp: <ISO datetime>,
  cardId: <card UUID>,   // deploy only
  column: <0–11>         // deploy only
})
→ { state, gameOver }
```

### 4. Check for game over

```text
if (state.phase === 'gameOver') {
  winner = state.outcome.winnerIndex
  victoryType = state.outcome.victoryType
  // → call match_analyze for a strategic breakdown
}
```

## Phase Reference

| Phase | Legal actions |
| --- | --- |
| `DeploymentPhase` | `deploy` (one card per column, up to 4 columns) |
| `AttackPhase` | `attack`, `pass` |
| `ReinforcementPhase` | `reinforce` |
| `gameOver` | None — match is complete |

## Suit Bonuses (important for choosing attacks)

| Suit | Effect on attack |
| --- | --- |
| Spades | Double LP damage to opponent |
| Hearts | Attacker heals LP equal to damage dealt |
| Diamonds | Attacker draws a card |
| Clubs | Bonus kill — removes the defender even if not defeated |
