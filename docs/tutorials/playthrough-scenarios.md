---
title: "Playthrough Scenario Runbook"
description: "Commandsets for the supported gameplay automation scenarios: local smoke tests, spectator checks, staging and production validation, and staged swarm load tests."
status: active
updated: "2026-04-25"
audience: contributor
related:
  - docs/tutorials/developer-guide.md
  - docs/reference/pnpm-scripts.md
  - README.md
---

# Playthrough Scenario Runbook

Use `pnpm qa:playthrough:ui` for headed browser automation. The scenario flag
selects the match shape, and the remaining flags tune visibility, telemetry,
and load.

## Scenario Types

### Guest PvP

Use this for the fastest end-to-end local smoke test with two guest players.

```bash
rtk pnpm qa:playthrough:ui -- --scenario guest-pvp
```

Useful variations:

```bash
rtk pnpm qa:playthrough:ui -- --scenario guest-pvp --spectator
rtk pnpm qa:playthrough:ui -- --scenario guest-pvp --no-devtools
rtk pnpm qa:playthrough:ui -- --scenario guest-pvp --slow-mo-ms 150
```

### Auth PvP

Use this when you want the full sign-in flow with two human-style players.

```bash
rtk pnpm qa:playthrough:ui -- --scenario auth-pvp
```

Useful variations:

```bash
rtk pnpm qa:playthrough:ui -- --scenario auth-pvp --spectator
rtk pnpm qa:playthrough:ui -- --base-url https://play.phalanxduel.com --scenario auth-pvp --no-telemetry
rtk pnpm qa:playthrough:ui -- --base-url https://phalanxduel-staging.fly.dev --scenario auth-pvp
```

### Guest PvB

Use this when you want a guest player against the built-in bot path.

```bash
rtk pnpm qa:playthrough:ui -- --scenario guest-pvb
```

Useful variations:

```bash
rtk pnpm qa:playthrough:ui -- --scenario guest-pvb --bot-opponent bot-heuristic
rtk pnpm qa:playthrough:ui -- --scenario guest-pvb --spectator
rtk pnpm qa:playthrough:ui -- --base-url https://phalanxduel-staging.fly.dev --scenario guest-pvb --no-telemetry
```

### Auth PvB

Use this for registered-player gameplay against the bot path. This is the
preferred scenario for staged cohort and login/logout validation.

```bash
rtk pnpm qa:playthrough:ui -- --scenario auth-pvb
```

Useful variations:

```bash
rtk pnpm qa:playthrough:ui -- --scenario auth-pvb --bot-opponent bot-heuristic
rtk pnpm qa:playthrough:ui -- --scenario auth-pvb --spectator
rtk pnpm qa:playthrough:ui -- --base-url https://phalanxduel-staging.fly.dev --scenario auth-pvb --no-telemetry
rtk pnpm qa:playthrough:ui -- --base-url https://play.phalanxduel.com --scenario auth-pvb --no-telemetry
```

## Spectator Mode

Add `--spectator` when you want a live observer window for streaming or
recording. The runner opens a third browser and verifies spectator HUD, active
player banners, spectator count, and play-by-play log.

```bash
rtk pnpm qa:playthrough:ui -- --scenario guest-pvp --spectator
```

## Staging And Production Validation

Use `--base-url` to point the same runner at staging or production. For remote
origins, browser telemetry should generally stay off unless you are explicitly
testing remote export.

```bash
rtk pnpm qa:playthrough:ui -- --base-url https://phalanxduel-staging.fly.dev --scenario guest-pvp --no-telemetry
rtk pnpm qa:playthrough:ui -- --base-url https://play.phalanxduel.com --scenario auth-pvb --no-telemetry
```

## Swarm Load Tests

Use swarm mode for staged cohort growth, repeated logins, and controlled load
testing through real play.

```bash
rtk pnpm qa:playthrough:ui -- --swarm --scenario auth-pvb --wave-count 3 --bot-identity-store /tmp/phalanx-bots.json
```

Useful variations:

```bash
rtk pnpm qa:playthrough:ui -- --swarm --scenario auth-pvb --wave-count 5 --cohort-growth fibonacci
rtk pnpm qa:playthrough:ui -- --swarm --scenario auth-pvb --wave-count 4 --cohort-growth fixed --cohort-size 6
rtk pnpm qa:playthrough:ui -- --swarm --scenario auth-pvb --wave-count 4 --cohort-sizes 1,1,2,3
rtk pnpm qa:playthrough:ui -- --swarm --scenario auth-pvb --wave-count 3 --relogin-between-waves
```

Swarm identity defaults:

- Bot emails are filterable as `bot+00001@phalanxduel.com`
- Override the prefix with `--bot-email-prefix`
- Override the domain with `--bot-email-domain`

## Quick Matrix And Headless Smoke

Use the headless runner when you want fast bot-vs-bot coverage without a
browser.

```bash
rtk pnpm qa:playthrough
```

Use the matrix runner for broader in-memory regression checks.

```bash
rtk pnpm qa:playthrough:verify
```

## Recommended Starting Points

- Local smoke: `guest-pvp`
- Local signed-in regression: `auth-pvb`
- Stream/recording check: any scenario with `--spectator`
- Staging validation: `--base-url https://phalanxduel-staging.fly.dev`
- Production validation: `--base-url https://play.phalanxduel.com`
- Load test: `--swarm --scenario auth-pvb`
