---
title: "Test Fixture Patterns & Ownership Boundaries"
description: "Canonical guidance on fixture helpers, cross-package imports, and when to use source vs built-package fidelity checks."
status: active
updated: "2026-04-30"
audience: agent
---

# Test Fixture Patterns & Ownership Boundaries

## Testkit Modules

Each package owns a `tests/helpers/` directory for shared test utilities. Prefer importing
from there over defining helpers inline per-file.

| Package | Testkit path | What it exports |
| --- | --- | --- |
| `server` | `server/tests/helpers/socket.ts` | `mockSocket()`, `lastMessage()`, `allMessages()`, `MockSocket` type |

**Rules:**
- Use `import { mockSocket } from './helpers/socket.js'` (ESM `.js` extension required).
- Do not define inline `function mockSocket()` in individual test files.
- The `MockSocket` type captures sent messages in `._messages` for inspection.

## Fixture Patterns

### Package-local unit tests
Build state using the package's own public API. Do not reach into a sibling package's `src/`.

```ts
// server/tests/foo.test.ts — good
import { LocalMatchManager } from '../src/match.js';

// server/tests/foo.test.ts — bad
import { createInitialState } from '../../engine/src/index';
```

### Integration suites (allowed cross-package source imports)
Some tests must exercise cross-package integration at the source level. These are explicitly
allowed but must be labelled:

| File | Cross-package import | Justification |
| --- | --- | --- |
| `server/tests/filter.test.ts` | `../../engine/src/index` | Needs `createInitialState`/`drawCards` to construct realistic `GameState` fixtures for server-side redaction tests. These helpers are not re-exported from the compiled engine package. |

When a new cross-package import is added for integration reasons, document it in this table.

## Schema Validation Fidelity

### Source-rewrite checks (unit tests)
Validate TypeScript types at compile time. Fast, zero I/O.

### Built-package fidelity checks
`pnpm schema:check` (calls `scripts/ci/verify-schema.sh`) compares generated JSON schemas
against the committed snapshots. Run this when you add or modify a Zod schema.

### Runtime outbound validation
`server/src/match.ts` calls `ServerMessageSchema.safeParse()` on every outbound WebSocket
message. Failures are logged as errors but the message is still sent — schema drift should
not cause game interruptions, only alerts.

## When to Use What

| Scenario | Use |
| --- | --- |
| Testing game logic in isolation | Engine unit tests with `createInitialState` from `@phalanxduel/engine` public API |
| Testing server WebSocket behavior | `mockSocket()` from `server/tests/helpers/socket.ts` |
| Testing full round-trip correctness | `ws.test.ts` / `simulate.test.ts` against a real in-process server |
| Verifying Zod schema shape | `shared/tests/schema.test.ts` |
| Verifying generated JSON schemas | `pnpm schema:check` |
