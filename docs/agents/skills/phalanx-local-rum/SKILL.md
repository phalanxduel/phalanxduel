---
name: phalanx-local-rum
description: Configure development-only OpenObserve browser RUM and OTel for Phalanx Duel on localhost origins. Use when adding frontend monitoring, Core Web Vitals, browser errors, session replay, or local RUM credentials.
---

# Phalanx Local RUM

The browser monitoring boundary is local development only. Enable RUM only
when the Vite build is a development build and the hostname is `localhost`, a
loopback address, or `*.localhost`.

## Configuration

- Use the official `@openobserve/browser-rum` and
  `@openobserve/browser-logs` packages when full RUM/session replay is wanted.
- Declare the client token as `VITE_PHX_RUM_TOKEN` through the repository's
  annotated secret DSL in `.env.secrets.local` (with
  `@target: LOCAL` and `@concern: OBSERVABILITY`); use the existing local
  environment/bootstrap tooling to expose it to the Vite process. Never read,
  print, source manually, or copy the contents of `.env.secrets*` into source,
  committed config, dashboard JSON, logs, or chat.
- Treat `docs/configuration.md` and `scripts/maint/sync-secrets.ts` as the
  canonical secret-management contract. The `pnpm env:*` commands are for
  synchronized deployment environments; they are not a reason to provision a
  development token into production.
- Use application ID `phx-client`, service `phx-client`, environment
  `development`, organization `default`, and the local O2 site.
- Keep the existing same-origin `/otel/` proxy and OpenTelemetry browser
  instrumentation; RUM complements it with Web Vitals, errors, and replay.
- Use masking or a restrictive privacy level for replay. Do not set user
  identity from match IDs, player IDs, email addresses, or tokens.

## Guardrails

- Production builds must not initialize RUM, browser logs, fetch/XHR hooks, or
  replay, even if a query string attempts `telemetry=on`.
- Do not reset or rotate an existing local RUM token unless the user explicitly
  asks for rotation.
- Production must not receive `VITE_PHX_RUM_TOKEN`; the local RUM guard must
  remain the final authority for enabling browser monitoring.
- Do not send telemetry to OpenObserve Cloud or any external endpoint from the
  local profile.
- Local-LLM analysis may summarize local O2 records read-only, but must fail
  open and never receive secrets or private player data.

## Verification

- Check `rtk zsvc health --json` before testing.
- Load `https://play.phalanxduel.localhost/?telemetry=on` and exercise a lobby
  or match flow.
- Verify O2 receives RUM/OTel traffic, then inspect the RUM view and the Phalanx
  dashboard. Do not copy tokens from the UI into logs or responses.
