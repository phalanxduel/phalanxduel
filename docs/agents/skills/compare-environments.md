# Skill: Compare Environments

Run the same scenario against local, staging, and production to isolate
engine behavior differences or validate a deployment.

## What You Need

- At least two named MCP servers configured (e.g., `phalanx-local` and
  `phalanx-staging-public`)
- For match creation: `GAME_SERVER_URL` and `AGENT_TOKEN` set in each
  environment's MCP server config

## Steps

### 1. Create a seeded match on each environment

Use the same `seed` value on both sides. The seed controls the initial deck
shuffle, so identical seeds produce identical starting positions.

```text
# On phalanx-local:
match_create(opponent='bot-heuristic', seed=42)
→ localMatchId, localState

# On phalanx-staging-public (or phalanx-prod-admin):
match_create(opponent='bot-heuristic', seed=42)
→ stagingMatchId, stagingState
```

### 2. Play N turns on each and record evaluation scores

```text
For each environment:
  For turn in 1..N:
    engine_bot_recommend(state, strategy='heuristic')  → action
    action_submit(matchId, playerId, action)            → newState
    engine_evaluate(newState)                          → score
    record(env, turn, score)
```

A diverging score curve between environments indicates a behavior difference
in the engine or game state applied at that turn.

### 3. Compare leaderboards

```text
# On phalanx-local:
leaderboard(mode='pvp', limit=10)  → localTop10

# On phalanx-staging-public:
leaderboard(mode='pvp', limit=10)  → stagingTop10
```

### 4. Compare pipeline health

```text
# On phalanx-local (admin):
pipeline_status()
→ { totalMatches, completedMatches, unembedded, recentActivity }

# On phalanx-prod-admin (admin):
pipeline_status()
→ { totalMatches, completedMatches, unembedded, recentActivity }
```

`pipeline_status` shows match counts, embedding coverage, and recent
player activity per environment. Useful for post-deploy validation.

## Seed Limitation

The `seed` parameter is blocked in production environments
(`NODE_ENV=production`). Cross-environment seeding only works between
local and staging.

For production comparison without seeds: play parallel unseeded matches
and compare aggregate statistics (win rates, average turn counts, LP
delta distributions) over N ≥ 20 matches.

## Reading Divergence

| Signal | Likely cause |
| --- | --- |
| `engine_evaluate` scores diverge at turn K | Engine logic changed between deploys |
| Same turn count, different outcome | RNG difference or state machine divergence |
| Leaderboard ranks match, ELO differs | Scoring formula change |
| `pipeline_status` shows high `unembedded` | Embedding job not running on that env |
