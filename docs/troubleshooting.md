# Troubleshooting and FAQ

This document provides solutions to common issues and answers frequently asked questions about the Phalanx Duel development environment and system.

## Common Issues

### "ECONNREFUSED" when connecting to the server
- **Cause**: The server is not running or is bound to a different address.
- **Solution**: Ensure `pnpm dev:server` is running. Check that the client's proxy is pointing to `127.0.0.1:3001`.
- **Note**: Use `127.0.0.1` instead of `localhost` to avoid loopback ambiguity on some systems.

### TypeScript "cannot be resolved" warnings in the IDE
- **Cause**: Path mappings in `tsconfig.json` may be out of sync after a refactor.
- **Solution**: Restart your TypeScript server in the IDE. Ensure `client/tsconfig.json` correctly points to the root `shared/` and `engine/` directories.

### Database migrations failing
- **Cause**: Local Postgres state is inconsistent with the migrations in the repo.
- **Solution**: If you are using the Docker Compose Postgres, you can reset it with `pnpm docker:down` and `pnpm docker:up`. For native Postgres, check your `DATABASE_URL` and ensure the `vector` extension is installed.

### UI Playthrough timeouts
- **Cause**: Slow animations or race conditions in the DOM.
- **Solution**: Run with `--slow-mo-ms 150` to debug visually. Ensure your local machine is not under extreme CPU load.

## Frequently Asked Questions

### Which document should I read first?
- `README.md` for a quick entry and project overview.
- `docs/development.md` for getting your local environment running.
- `CONTRIBUTING.md` for understanding the PR process and standards.

### Why do the docs prefer `127.0.0.1` over `localhost`?
The repo has experienced issues with host binding and IPv4/IPv6 resolution. Using `127.0.0.1` keeps the path explicit and reliable across different development environments.

### I changed game rules. What should I run?
At a minimum:
1. `pnpm test:run:engine`
2. `pnpm test:run:server`
3. `pnpm qa:playthrough:verify`
4. `bin/check`

### How do I reset my local admin account?
Run the seeding command:
```bash
pnpm admin:seed-dev mike@phalanxduel.com adminadmin Mike
```

### Where should new documentation go?
- Reference material → `docs/reference/`
- Design decisions → `docs/adr/`
- Operational guides → `docs/ops/`
- Stale/archived plans → `docs/archive/`
