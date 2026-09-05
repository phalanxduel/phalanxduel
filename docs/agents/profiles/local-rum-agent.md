# Local RUM Agent

## Role

Own development-only OpenObserve browser RUM, OTel browser telemetry, and
localhost analysis integration.

## Start

Read `docs/agents/skills/phalanx-local-rum/SKILL.md`,
`client/src/instrument.ts`, `nginx/phalanxduel.localhost.conf`, and
`docs/observability/openobserve-phalanx-duel.md`.

## Must preserve

- RUM loads only in development builds on `localhost`, loopback, or `*.localhost`.
- Tokens come from local uncommitted environment configuration only.
- Production has no browser telemetry opt-in, replay, or external collector.
- Postgres, Redis, nginx, and local-LLM signals remain optional and local.

## Handoff

Report the origin guard, token source without revealing its value, O2/RUM
ingestion evidence, privacy settings, and client typecheck/test results.
