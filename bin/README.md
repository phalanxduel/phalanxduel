# Phalanx Duel local tooling

The executable tooling follows the `phx-*` command naming convention used by
zdots. The canonical commands are `phx-demo-ctl`, `phx-services`, `phx-dock`,
`phx-check`, `phx-test`, `phx-install-localhost`, and `phx-setup`; the shorter
The `phx-*` names are the only supported entrypoints; use `bin/phx-demo-ctl`
for the local demo controller.

Shell completions live in [`completions/`](../completions/README.md).

## Host-native demo workflow

Host-native development is the default. Postgres must be running locally; the
demo tools do not start Colima, Docker, or a database container implicitly.

```bash
phx-demo-ctl up
phx-demo-ctl links --no-open
phx-demo-ctl restart-cockpit
phx-demo-ctl cockpit
phx-demo-ctl logs
phx-demo-ctl down
```

`phx-demo-ctl up` starts the server, browser client, and admin UI, then serves the
generated cockpit at `https://phalanxduel.localhost/demo/` when the local nginx
vhost is installed. The direct fallback is `http://127.0.0.1:3333/`. Set
`PHALANX_DEMO_COCKPIT_PORT` to choose another bridge port. The browser cockpit includes
live health/match charts, links to the game, admin, API docs, Grafana, O2,
alternative clients, documentation/assets, and read-only tails of the local
`.phx/logs/` files.

## SwiftBar menu-bar pulse

`bin/phx-swiftbar` emits a read-only Phalanx Duel menu-bar pulse for SwiftBar.
When remote player sockets are active, the live-count header is clickable and
opens the configured admin URL (`PHALANX_DEMO_ADMIN_URL`) for active-match
inspection.

`bin/phx-observability-check` verifies the active Local or Tournament
observability surface through HTTPS reverse-proxy routes without probing
private telemetry ports.
It is the local Syntagma coordination surface: demo health, game/admin/API
links, OpenObserve and Jaeger, recent PVL scenario evidence, local log paths,
and safe demo controls. It does not inspect databases, secrets, containers, or
telemetry credentials.

The installed SwiftBar shim is `~/.swiftbar/phalanxduel-pulse.30s.sh`; the
tracked implementation stays in `bin/` so it can be reviewed and tested.
The labels use a small, translated historical vocabulary: `Σύνταγμα / Syntagma`
for coordination, `Ἀγορά / Agora` for the linked operator surfaces, `Ἰχνη /
Ichni` for marked PVL trails, and `Στρατηγός / Strategos` for demo controls.

The generated `quicklinks.html` lives under ignored `.phx/cockpit/`; it is not
committed. If the generated file or bridge is absent, `/demo/` returns 404.
After changing cockpit code, use `phx-demo-ctl restart-cockpit` to restart only the
loopback bridge while leaving the active game services and match untouched.

The cockpit bridge is also runnable directly:

```bash
node scripts/demo-cockpit-server.mjs <quicklinks-file> <log-directory> [port]
node scripts/demo-cockpit-server.mjs --help
```

It binds only to loopback and exposes `/health` plus capped
`/api/logs/server`, `/api/logs/client`, and `/api/logs/admin` endpoints.

## Service control

```bash
phx-services start all --tmux
phx-services status
phx-services logs server
phx-services stop all
```

Use `phx-services --help` for the complete command and option list. Runtime
logs and PID files are kept under `.phx/`; active service/container names use
the `phx-*` convention.

## Control plane and container verification

- `phx --help` — unified guide, capabilities, and context commands.
- `phx-dock --help` — explicit Docker automation/verification entrypoint.

`phx-dock` is for isolated container verification and requires Docker. It is
not part of the host-native demo path and should not be used to provide local
Postgres for ordinary development.

## Related maintenance tools

- `bin/maint/with-dev-postgres.sh` — guarded development database commands.
- `bin/maint/run-otel-collector.sh` — host collector with `phx-otel-collector`.
- `bin/maint/run-otel-console.sh` — host console with `phx-otel-console`.

Each executable has `--help` where applicable. The concise command references
are also available as man pages in [`docs/man/`](../docs/man/) and the focused
operator reference in [`docs/reference/local-tooling.md`](../docs/reference/local-tooling.md).
