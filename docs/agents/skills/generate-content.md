# Skill: Generate Content from Game Data

Use the MCP server to retrieve authoritative game data and rules, then
produce documentation, blog posts, tutorials, or other written content.

This skill works with the **public endpoint** — no auth, no setup beyond
connecting to `https://phalanxduel-mcp-public.fly.dev/mcp`.

## Available Sources

| Resource / Tool | What it gives you |
| --- | --- |
| `game://rules` | Full canonical rules spec (§1–§18), 600 lines of markdown |
| `game://development` | Dev setup, inner loop, package structure |
| `game://skills/*` | These skill files — referenceable from any agent |
| `engine_valid_actions(state)` | Live legal moves for a given position |
| `engine_simulate_attack(state, ...)` | Attack previews with suit effect details |
| `engine_evaluate(state)` | Position score + breakdown (LP/battlefield/hand/economy) |
| `match_list(limit)` | Recent completed matches |
| `match_get(matchId)` | Full match state, action history, outcome |
| `leaderboard(mode)` | Top players by ELO across four modes |

## Example: Write a Rules Explainer

```text
1. Read game://rules
2. Extract the section on suit effects (§8)
3. Write a plain-English explainer with examples for each suit
```

Prompt pattern for any agent:

> "Read game://rules from the phalanx-public MCP server. Find the section
> describing suit effects. Write a 300-word blog post explaining how each
> suit (spades, hearts, diamonds, clubs) changes attack outcomes, with one
> concrete example per suit. Audience: players who know card games but are
> new to Phalanx Duel."

## Example: Write a Strategy Guide for a Phase

```text
1. Read game://rules, find DeploymentPhase rules (§4–§5)
2. Call engine_valid_actions on a sample DeploymentPhase state
3. Call engine_bot_recommend at heuristic and mcts strategies, compare
4. Write a guide: "How to deploy effectively in the first 4 columns"
```

## Example: Generate a Match Report

```text
1. match_list(limit=1)        → most recent completed match ID
2. match_get(matchId)         → full state + action history
3. engine_evaluate(finalState) → final position score
4. match_analyze(matchId, focus='full')  → strategic breakdown
5. Write a narrative match report from the analysis
```

## Example: Explain a Rule in Plain English

Any agent connected to the public endpoint can answer questions like:

> "What happens when a clubs card attacks a spades card?"
> "How many columns can a player deploy to in one turn?"
> "What triggers a ReinforcementPhase?"

Pattern:

```text
Read game://rules → search for relevant section → paraphrase in plain English
```

## Connecting from a Different Repository

If you are working in a project outside this repo (e.g., a blog, a website,
or a documentation generator), add the public MCP server to your agent's
config and it will have read access to all of the above.

No DATABASE_URL, no AGENT_TOKEN, no API keys required for content generation.
The public endpoint gives full read access to engine tools and match data.

See `docs/agents/README.md` for per-tool connection instructions.
