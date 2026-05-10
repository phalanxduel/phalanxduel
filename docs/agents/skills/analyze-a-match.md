# Skill: Analyze a Match

Produce a strategic breakdown of a completed or in-progress match.

## What You Need

Either a `matchId` (UUID, requires `DATABASE_URL` on the MCP server) or an
inline `GameState` object. Inline state works without a database connection.

## Steps

### 1. Choose a focus

| Focus | What it returns |
| --- | --- |
| `full` | Opening, midgame, turning points, conclusion |
| `turning_points` | The 2–3 moments that decided the outcome |
| `suit_strategy` | How each suit (spades/hearts/diamonds/clubs) was used |
| `endgame` | The final 10 turns and how the game was closed out |

### 2. Call match_analyze

**By match ID (loads from database):**

```text
match_analyze(matchId='<uuid>', focus='turning_points')
→ { matchId, focus, analysis: '<text>' }
```

**With inline state (no database needed):**

```text
match_analyze(state=<GameState>, focus='suit_strategy')
→ { matchId: 'inline', focus, analysis: '<text>' }
```

### 3. Interpret the analysis

The analysis references:

- **LP delta** — life point difference at key moments
- **Suit bonuses** — spades=double damage, hearts=heal, diamonds=draw, clubs=kill bonus
- **Board control** — which player had more battlefield cards
- **Hand economy** — draw pile depth and hand size

### 4. Find similar matches (optional)

If embeddings have been generated for this corpus:

```text
match_find_similar(
  query='aggressive spades opening with early hearts recovery',
  limit=5,
  maxDistance=0.4
)
→ [{ matchId, summary, distance }]
```

This uses pgvector cosine similarity over OpenAI embeddings.

## Analysis Provider

The `match_analyze` tool uses whichever LLM backend the MCP server is
configured with:

- `ANALYSIS_PROVIDER=llama` — local llama.cpp (default for `phalanx-local`),
  no API key required, ~600–750 token prompt
- `ANALYSIS_PROVIDER=anthropic` — Claude (requires `ANTHROPIC_API_KEY`),
  uses `claude-opus-4-7`

## Example Workflow

```text
1. match_get(matchId)                          → state, actionHistory
2. engine_evaluate(state)                      → final position score
3. match_analyze(matchId, focus='turning_points')  → strategic breakdown
4. match_embed(matchId)                        → store for future search
```
