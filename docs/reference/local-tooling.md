---
title: "Local Tooling Reference"
description: "Host-native demo, service, cockpit, and container-verification tooling."
status: active
updated: "2026-09-05"
audience: contributors, operators
---

# Local Tooling Reference

Phalanx Duel uses host-native development as its primary loop. Docker is an
explicit verification surface, not an implicit dependency of `phx-demo-ctl` or the
local Postgres bootstrap.

## Command map

| Command | Focus | Default mode |
| --- | --- | --- |
| [`phx-demo-ctl`](../../bin/phx-demo-ctl) | Rehearse the playable stack and open the cockpit | Host-native |
| [`phx-services`](../../bin/phx-services) | Start, stop, inspect, and tail local services | Host-native |
| [`phx`](../../bin/phx) | Unified guide, capability, and context control plane | Host-native |
| [`phx-dock`](../../bin/phx-dock) | Run explicit isolated verification in Docker | Containerized |
| [`scripts/demo-cockpit-server.mjs`](../../scripts/demo-cockpit-server.mjs) | Serve generated cockpit HTML and safe log tails | Loopback-only |

Every command supports `--help` or documents its supported options in its
man page. The executable overview is in [`bin/README.md`](../../bin/README.md).

## Demo cockpit

```bash
phx-demo-ctl up
phx-demo-ctl links --no-open
phx-demo-ctl restart-cockpit
phx-demo-ctl cockpit
```

The browser cockpit is served at `https://phalanxduel.localhost/demo/` when the
local nginx vhost is installed, with `http://127.0.0.1:3333/` as the direct
fallback. It refreshes health, match metrics, and service state in real time.
All cockpit links open in a new tab. The page also links to the game, admin UI,
API docs, observability tools, alternative clients, related docs/assets, and
the exact local log paths. `restart-cockpit` refreshes the bridge without
stopping an active game. The generated `quicklinks.html` is stored under
ignored `.phx/cockpit/`; when that artifact or the bridge is absent, `/demo/`
returns 404 rather than the site's SPA fallback.

The live log panels poll the loopback-only bridge:

```text
GET /api/logs/server?lines=80
GET /api/logs/client?lines=80
GET /api/logs/admin?lines=80
```

The analytics widgets use the same-origin probe bridge so a browser page on
port 3333 can read host service health without requiring CORS configuration:

```text
GET /api/probe/app-health
GET /api/probe/app-stats
GET /api/probe/admin-health
GET /api/probe/client
```

The bridge reads only the named service logs under `.phx/logs/`, strips ANSI
control sequences, and caps responses at 240 lines. It does not execute shell
commands or expose files outside the configured log directory.

## Runtime naming

Active runtime and container identifiers use `phx-*`, including `phx-server`,
`phx-otel-collector`, and the Docker Compose network `phx`. Product names,
package scopes, URLs, and historical references retain their canonical
`phalanxduel` spelling.

## Database and container boundary

`phx-demo-ctl` expects host Postgres on the configured local development port. It
does not start Colima or Docker when the host database is unavailable. Follow
the guarded commands in [`database-environment-isolation.md`](../agents/skills/database-environment-isolation.md)
for migrations, seeds, and tests.

For containerized verification, use `phx-dock` or the documented Docker
commands in [`docs/development.md`](../development.md). Those paths are
deliberate and visible in status output; a host-native cockpit should not
report missing containers as failures.

## Man pages

The concise Unix-style references are under [`docs/man/`](../man/):

- `phx-demo-ctl(1)` — local demo rehearsal and cockpit.
- `phx-services(1)` — host-native service lifecycle.
- `phx(1)` — unified control plane.
- `phx-dock(1)` — explicit container verification.

Render one locally with `man ./docs/man/phx-demo.1`.
