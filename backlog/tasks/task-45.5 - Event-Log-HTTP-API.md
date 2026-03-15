---
id: TASK-45.5
title: Event Log HTTP API
status: To Do
assignee: []
created_date: '2026-03-15 18:09'
updated_date: '2026-03-15 18:09'
labels:
  - event-log
  - api
  - http
  - content-negotiation
dependencies:
  - TASK-45.4
references:
  - server/src/app.ts
  - server/src/db/match-repo.ts
  - shared/src/schema.ts
parent_task_id: TASK-45
priority: high
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
This task exposes the persisted event log over HTTP so both humans and AI agents
can query it. Two endpoints are added to the Fastify app:

### `GET /matches`

Returns a paginated list of completed matches with summary metadata: `matchId`,
`createdAt`, `completedAt`, `winnerIndex`, `victoryType`, `turnCount`,
`playerIds[]`, `fingerprint`. This is the entry point for selecting which game's
log to view.

### `GET /matches/:id/log`

Returns the full `MatchEventLog` for the specified match. The representation
is controlled by content negotiation:

| Request | Response |
|---------|----------|
| `Accept: application/json` (default) | Full structured `MatchEventLog` |
| `Accept: application/json` + `?format=compact` | Compact narrative array |
| `Accept: text/html` | Rendered HTML log viewer |

### Compact format

The compact format is designed for AI agent consumption: lower token count,
same logical coverage. Example shape:

```json
[
  { "seq": 0,  "type": "match.created", "params": "4x2, LP20" },
  { "seq": 1,  "type": "player.joined", "p": 0, "bot": false },
  { "seq": 2,  "type": "player.joined", "p": 1, "bot": true },
  { "seq": 3,  "type": "game.initialized", "stateHash": "a1b2..." },
  { "seq": 4,  "type": "deploy", "p": 1, "col": 0, "card": "5♠" },
  { "seq": 5,  "type": "attack", "p": 0, "atk": 0, "def": 0,
    "steps": [{ "t": "frontCard", "dmg": 5, "dest": true }] },
  ...
  { "seq": 42, "type": "game.completed", "winner": 0, "reason": "lpDepletion" }
]
```

### Authorization

In the current phase (pre-auth hardening), match logs for completed matches are
publicly readable by `matchId`. Restrict to authenticated users in a future task
once the auth layer matures.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 `GET /matches` returns a paginated JSON list of completed match
  summaries. Supports `?page=` and `?limit=` query params.
- [ ] #2 `GET /matches/:id/log` returns HTTP 200 with the full `MatchEventLog`
  JSON for a completed match.
- [ ] #3 `GET /matches/:id/log?format=compact` returns a compact JSON array
  suitable for AI consumption (significantly fewer tokens than the full log).
- [ ] #4 `GET /matches/:id/log` with `Accept: text/html` returns a rendered
  HTML page showing the match log in human-readable form.
- [ ] #5 `GET /matches/:id/log` for an unknown match ID returns HTTP 404.
- [ ] #6 The `fingerprint` field in the JSON response can be independently
  verified against the `events` array using `computeStateHash`.
- [ ] #7 Server tests cover the three response formats and the 404 case.
- [ ] #8 `pnpm --filter @phalanxduel/server test` passes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. In `server/src/app.ts`, register two new Fastify routes:

   ```typescript
   fastify.get('/matches', matchListHandler);
   fastify.get('/matches/:id/log', matchLogHandler);
   ```

2. `matchListHandler`: query `match-repo.ts` for completed matches, paginate,
   return summary objects.

3. `matchLogHandler`:
   - Load `MatchEventLog` from `match-repo.getEventLog(id)`.
   - Check `request.query.format`:
     - `compact` → map events to compact shape, return JSON.
     - default → return full `MatchEventLog` JSON.
   - Check `request.headers.accept` for `text/html`:
     - Render a simple server-side HTML template with the event log.

4. HTML template: a minimal `<table>` or `<ol>` listing events with sequence
   number, type, name, and key payload fields. No JavaScript required — this is
   a static read view. Keep it screenreader-friendly.

5. Add `getCompletedMatches(page, limit)` to `match-repo.ts`.

6. Write server tests using Fastify's `inject` for all three format variants
   and the 404 case.
<!-- SECTION:PLAN:END -->

## Risks and Unknowns

- The HTML template does not need to be beautiful for this task — a functional,
  readable table is sufficient. Visual polish is deferred to TASK-45.6 (client UI).
- Large match logs (many turns) may produce large JSON payloads. Add a `?turns=`
  range filter as a follow-up if needed; do not prematurely optimize here.
- The compact format shape should be stable — once AI agents depend on it,
  changing the format is a breaking change. Design it carefully and document it
  in `docs/system/ARCHITECTURE.md` or a new `docs/api/` file.
- CORS: if the client fetches this endpoint from the browser, ensure CORS headers
  allow it.

## Verification

```bash
pnpm --filter @phalanxduel/server test
pnpm typecheck
pnpm lint
pnpm check:ci
# Manually verify HTML render in browser
```
