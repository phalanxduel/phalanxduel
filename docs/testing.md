# Testing and Quality Assurance

Phalanx Duel uses a multi-layered testing strategy to ensure game rules are deterministic, the server is authoritative, and the UI remains stable.

## Test Layers

### 1. Unit Tests (Vitest)
Fast, isolated tests for pure logic.
- **Engine**: 100% state transition coverage.
- **Shared**: Schema validation and hashing tests.
- **Server**: API endpoint and WebSocket protocol tests.

```bash
# Run all vitest suites
rtk pnpm test:run:all

# Run by package
rtk pnpm test:run:engine
rtk pnpm test:run:server
rtk pnpm test:run:shared
```

### 2. Gameplay Truth Gate (Headless Simulation)
Deterministic simulations that verify game rules and state integrity across hundreds of scenarios.

```bash
# Run the full gameplay verification matrix
rtk pnpm qa:playthrough:verify

# Run a single headless smoke run
rtk pnpm qa:playthrough
```

### 3. UI Playthroughs (Playwright)
Browser-driven end-to-end tests that verify the real user experience, including animations, connectivity, and complex UI states.

```bash
# Run a specific UI scenario
rtk pnpm qa:playthrough:ui -- --scenario guest-pvp

# Run with a spectator window
rtk pnpm qa:playthrough:ui -- --scenario guest-pvp --spectator
```

### 4. Adversarial Security Tests
Tests that attempt to bypass server authority or inject illegal states. These run against a real Postgres instance in CI.

```bash
rtk pnpm --filter @phalanxduel/server test:adversarial
```

## Verification Commands

The repository provides several "check" scripts that bundle multiple validation steps:

- `pnpm verify:quick`: Fast feedback loop (lint, typecheck, schema check, doc drift).
- `pnpm verify:ci`: Full project check, including tests and playthroughs.
- `bin/check`: The ultimate verification script, matching the repository's "Definition of Done".

## Coverage

We enforce >80% code coverage on core packages.

```bash
rtk pnpm test:coverage:run
```

## Test Fixtures

When writing tests that depend on specific card sequences or timestamps, use fixed seeds or `drawTimestamp` in the `GameConfig` to ensure reproducibility.

Refer to [Test Fixture Patterns](./reference/test-fixture-patterns.md) for examples.
