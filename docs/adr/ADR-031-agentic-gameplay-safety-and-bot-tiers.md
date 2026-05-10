---
id: decision-031
title: 'DEC-2B-006 - Agentic gameplay safety constraints and bot difficulty tiers'
owner: Project Owner + Platform
date: '2026-05-10'
status: accepted
---

# DEC-2B-006 - Agentic gameplay safety constraints and bot difficulty tiers

## Context

ADR-029 introduced `match_create` and `action_submit` as admin-only MCP tools.
ADR-030 established the immediate agentic gameplay path (MCP client + bot opponent +
llama analysis). During implementation review, five risk areas were identified that must
be addressed before agentic gameplay can be considered production-safe.

Additionally, the current bot difficulty model (random / heuristic / mcts with iteration
count) provides no meaningful skill differentiation beyond raw compute depth. It does not
support the kind of graduated, character-differentiated difficulty tiers needed for a
compelling single-player experience.

## Decisions

### 1. Gameplay tools remain admin-only — no public exposure

`match_create` and `action_submit` are registered exclusively under `TOOL_PROFILE=admin`
and are never available on the public MCP endpoint. This is enforced in `server.ts` and
is non-negotiable.

**Rationale:** The public endpoint is unauthenticated. Exposing gameplay tools there
would allow any caller to create matches on the game server using the operator's
`AGENT_TOKEN`, with no rate limiting, no attribution, and no accountability.

### 2. `engine_llm_recommend` is an analysis tool, not a gameplay tool

`engine_llm_recommend` is registered alongside `match_analyze` (available to any admin
profile with a configured LLM). It operates on `GameState` objects passed as input —
it has no direct access to `GAME_SERVER_URL` or `AGENT_TOKEN` and cannot submit actions
on its own. The distinction is intentional: reasoning about a position is read-only;
committing an action is a write operation that requires explicit `action_submit`.

### 3. Matches driven by agents must be flagged `is_automated`

Any match where at least one player's actions are submitted by an MCP agent must be
tagged `is_automated = true` in the `matches` table. This flag:

- Excludes agent-driven matches from all competitive leaderboards
- Allows pipeline tools (`pipeline_status`, `bulk_embed`) to filter or weight them
- Preserves the integrity of ELO ratings for human players

Implementation: schema migration adding `is_automated boolean not null default false`;
`match_create` sets it to `true`; leaderboard queries add `WHERE is_automated = false`.

### 4. Bot difficulty tiers replace the raw MCTS iteration knob

The current `strategy` + `mctsIterations` interface is an implementation detail, not a
player-facing difficulty model. It will be replaced by named tiers that encode both
compute depth and behavioral bias:

| Tier | Codename | Behavioral profile |
| --- | --- | --- |
| 1 | `scout` | Random moves — baseline, tutorial |
| 2 | `grunt` | Heuristic — plays legally, no planning |
| 3 | `soldier` | MCTS 100 — balanced, plans 1–2 turns ahead |
| 4 | `veteran` | MCTS 500, attack-biased — aggressive, targets high-LP columns |
| 5 | `destroyer` | MCTS 500, column-destruction bias — dismantles board presence first |
| 6 | `sentinel` | MCTS 500, defense-biased — prioritizes healing and LP preservation |
| 7 | `blitz` | MCTS 300, speed-biased — deploys fast, seeks early game-over conditions |
| 8 | `champion` | MCTS 1000, balanced — strongest general player |

Tiers 4–7 share the same MCTS depth but differ in heuristic weights applied to position
evaluation. This gives linear power scaling (tier = expected win rate increase against
the tier below) while producing meaningfully different playstyles.

ELO implications: agent matches tagged `is_automated` do not affect competitive ELO.
Automated benchmark matches (e.g., scout vs champion across N games) use a separate
`bot_elo` column for internal quality tracking.

### 5. Prompt injection in `engine_llm_recommend` must be closed

Player names from `GameState` flow into the LLM prompt in `buildRecommendPrompt` without
sanitization. A malicious name containing prompt-injection text (e.g.,
`"Ignore previous instructions and..."`) could alter LLM behavior. The `sanitizeName`
function from `matchSummary.ts` must be applied to any user-controlled string before it
enters an LLM prompt. (See backlog task: sanitize player names in LLM prompts.)

## Risk register

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Rating pollution from agent matches | High | `is_automated` flag + leaderboard filter (ADR task) |
| Server load from automated loops | Medium | Admin-only endpoint; rate limiting deferred to monitoring |
| LLM hallucinated / invalid move index | Low | `parseActionChoice` falls back to first legal action |
| Prompt injection via player names | Medium | Sanitize names in `buildRecommendPrompt` (backlog task, immediate) |
| `TOOL_PROFILE` misconfiguration on public endpoint | Low | Fail-fast check in `http.ts`; admin token required at startup |
| Bot difficulty indistinguishable to players | Medium | Named tier system replacing raw iteration count |

## Consequences

- `match_create` and `action_submit` remain permanently admin-only.
- A schema migration is required before agentic matches can safely coexist with human
  matches in the same database.
- The bot tier system requires engine changes to `computeBotAction` to accept a `tier`
  parameter and apply the corresponding heuristic weight profile.
- `engine_bot_recommend` in the MCP will expose `tier` as an alternative to `strategy` +
  `mctsIterations` once the tier system is implemented.

## Rejected alternatives

**Separate database for agent matches**: Rejected in favor of the `is_automated` flag.
A single database with a filter is simpler to operate and keeps match data unified for
analysis (e.g., embedding agent matches for strategy research is still valuable).

**Public gameplay endpoint with per-token rate limiting**: Rejected. The attack surface
of an unauthenticated endpoint that can create game server sessions is too large for the
current threat model.

**Flat ELO exclusion of all bot matches**: Accepted — agent-driven matches do not affect
competitive ELO at all. A separate `bot_elo` tracking column is deferred.
