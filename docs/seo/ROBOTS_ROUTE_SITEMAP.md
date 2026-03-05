# Robots Route Sitemap

This document maps app routes to indexability decisions for `robots.txt`.

Canonical origin assumed here: `https://play.phalanxduel.com`.
If you deploy under a different host, update the host in `robots.txt` and `sitemap.xml`.

## Indexable

- `/`
  - Primary public entrypoint (lobby/game shell).
  - Canonical page for search indexing on this host.

## Non-indexable

- `/admin`
  - Auth-gated operational dashboard.
- `/health`
  - Health probe endpoint.
- `/api/defaults`
  - Machine-readable configuration endpoint.
- `/matches`
  - Live match feed API.
- `/matches/*`
  - Replay endpoint under `/matches/:matchId/replay`.
- `/ws`
  - WebSocket endpoint.
- `/docs`
  - Swagger UI (operational/developer surface).
- `/docs/*`
  - Swagger/OpenAPI child routes (for example `/docs/json`).
- `/debug/*`
  - Debug/Sentry validation routes in non-prod modes.

## Query-param URLs to block

These are transient session/game state entrypoints and should not be indexed:

- `/*?*match=*`
  - Join-link sessions.
- `/*?*watch=*`
  - Spectator-link sessions.
- `/*?*seed=*`
  - QA/dev deterministic seed URLs.
- `/*?*mode=*`
  - Match-mode URL state parameter.

## Notes

- Keep assets crawlable (JS/CSS/images) so search engines can render `/`.
- `robots.txt` controls crawl intent, not guaranteed indexing behavior. For stronger control on specific pages, also use page-level meta `noindex` where applicable.
