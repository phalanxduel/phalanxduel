# Phalanx Duel local tooling

The executable tooling follows the `phx-*` runtime naming convention while
keeping short, discoverable entrypoints under `bin/`.

## Host-native demo workflow

Host-native development is the default. Postgres must be running locally; the
demo tools do not start Colima, Docker, or a database container implicitly.

```bash
bin/demo up
bin/demo links --no-open
bin/demo restart-cockpit
bin/demo cockpit
bin/demo logs
bin/demo down
```

`bin/demo up` starts the server, browser client, and admin UI, then serves the
generated cockpit at `https://phalanxduel.localhost/demo/` when the local nginx
vhost is installed. The direct fallback is `http://127.0.0.1:3333/`. Set
`PHALANX_DEMO_COCKPIT_PORT` to choose another bridge port. The browser cockpit includes
live health/match charts, links to the game, admin, API docs, Grafana, O2,
alternative clients, documentation/assets, and read-only tails of the local
`.phx/logs/` files.

The generated `quicklinks.html` lives under ignored `.phx/cockpit/`; it is not
committed. If the generated file or bridge is absent, `/demo/` returns 404.
After changing cockpit code, use `bin/demo restart-cockpit` to restart only the
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
bin/services start all --tmux
bin/services status
bin/services logs server
bin/services stop all
```

Use `bin/services --help` for the complete command and option list. Runtime
logs and PID files are kept under `.phx/`; active service/container names use
the `phx-*` convention.

## Control plane and container verification

- `bin/phx --help` — unified guide, capabilities, and context commands.
- `bin/dock --help` — explicit Docker automation/verification entrypoint.

`bin/dock` is for isolated container verification and requires Docker. It is
not part of the host-native demo path and should not be used to provide local
Postgres for ordinary development.

## Related maintenance tools

- `bin/maint/with-dev-postgres.sh` — guarded development database commands.
- `bin/maint/run-otel-collector.sh` — host collector with `phx-otel-collector`.
- `bin/maint/run-otel-console.sh` — host console with `phx-otel-console`.

Each executable has `--help` where applicable. The concise command references
are also available as man pages in [`docs/man/`](../docs/man/) and the focused
operator reference in [`docs/reference/local-tooling.md`](../docs/reference/local-tooling.md).
