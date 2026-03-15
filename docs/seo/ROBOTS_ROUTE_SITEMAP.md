---
title: "Robots & Sitemap Route Decisions"
description: "Maps app routes to indexability decisions. Explains WHY each route is blocked or allowed — the WHAT lives in client/public/robots.txt."
status: active
updated: "2026-03-14"
audience: agent
authoritative_source: "client/public/robots.txt, client/public/sitemap.xml"
---

# Robots & Sitemap Route Decisions

Canonical origin: `https://play.phalanxduel.com`. If deploying under a different host, update the host in `robots.txt` and `sitemap.xml`.

## Indexable

- `/` — Primary public entrypoint (lobby/game shell). Canonical page for search indexing.

## Non-indexable

- `/admin` — Auth-gated operational dashboard.
- `/health` — Health probe endpoint.
- `/api/defaults` — Machine-readable configuration endpoint.
- `/matches` — Live match feed API.
- `/matches/*` — Replay endpoint under `/matches/:matchId/replay`.
- `/ws` — WebSocket endpoint.
- `/docs` — Swagger UI (operational/developer surface).
- `/docs/*` — Swagger/OpenAPI child routes (e.g. `/docs/json`).
- `/debug/*` — Debug/Sentry validation routes in non-prod modes.

## Query-param URLs to block

Transient session/game state entrypoints — must not be indexed:

- `/*?*match=*` — Join-link sessions.
- `/*?*watch=*` — Spectator-link sessions.
- `/*?*seed=*` — QA/dev deterministic seed URLs.
- `/*?*mode=*` — Match-mode URL state parameter.

## Notes

Keep assets crawlable (JS/CSS/images) so search engines can render `/`.
