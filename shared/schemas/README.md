# Public Event Schemas

Machine-readable [JSON Schema (draft 2020-12)](https://json-schema.org/draft/2020-12/json-schema-core) contracts for the Phalanx Duel public event envelopes.

**These files are auto-generated from the canonical Zod schemas in `shared/src/schema.ts`.**
Do not edit them by hand — run `pnpm schema:gen` to regenerate.

## Schemas

| File | Zod Source | Description |
|------|-----------|-------------|
| `server-messages.schema.json` | `ServerMessageSchema` | All server → client WebSocket messages (discriminated union) |
| `client-messages.schema.json` | `ClientMessageSchema` | All client → server WebSocket messages |
| `turn-result.schema.json` | `PhalanxTurnResultSchema` | Atomic turn payload (preState + postState + action + events) |
| `game-state.schema.json` | `GameStateSchema` | Full match state snapshot |
| `event.schema.json` | `PhalanxEventSchema` | Single hierarchical span-based event |
| `match-event-log.schema.json` | `MatchEventLogSchema` | Complete match event log with integrity fingerprint |

## What's included vs excluded

These schemas cover the **public contract** — what external clients, integrations, and tools validate against.

Internal types (individual card definitions, combat log steps, transaction details, etc.) are **inlined** into the public schemas where referenced. They do not get separate schema files because they are not independent public contracts.

Schemas **not** published here (internal only):

- Telemetry metadata and admin API payloads
- `PartialCardSchema` (drawpile internals)
- Individual component schemas (`CardSchema`, `BattlefieldCardSchema`, etc.)

## Keeping schemas in sync

CI runs `pnpm schema:check` which regenerates schemas and fails if the committed files differ. If you modify `shared/src/schema.ts`, run:

```shell
pnpm schema:gen
```

Then commit the updated `.schema.json` files alongside your Zod changes.
