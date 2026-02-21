# Phalanx Duel Command Line Interface (CLI)

This document serves as the manual for the development and quality assurance scripts available in the Phalanx Duel monorepo.

## Primary Workspace Scripts

These scripts are run from the root directory using `pnpm <command>`.

### Development
- `pnpm dev:server`: Starts the Fastify server with `tsx watch` for hot-reloading backend changes.
- `pnpm dev:client`: Starts the Vite development server for frontend changes.

### Build & Hardening
- `pnpm build`: Executes the production build for the client.
- `pnpm lint`: Runs ESLint with strict TypeScript rules across all packages.
- `pnpm typecheck`: Performs workspace-wide TypeScript validation.
- `pnpm schema:check`: Verifies that generated JSON schemas match the Zod definitions. Fails if drift is detected.
- `pnpm rules:check`: Validates that every rule in `RULES.md` has a corresponding test case.

### Testing & Coverage
- `pnpm test`: Runs the full Vitest suite for all packages.
- `pnpm test:engine`: Focused test run for the rules engine.
- `pnpm test:server`: Focused test run for the Fastify host.

### Documentation
- `pnpm docs:build`: Generates the HTML technical reference in `docs/api`.
- `pnpm docs:dash`: Emits a `Phalanx Duel.docset` for use in Dash.app (MacOS).

---

## Specialized QA Tools

### Automated Playthrough (`scripts/qa-playthrough.ts`)
Run a full simulated game using headless browsers.

**Usage:**
```bash
pnpm qa:playthrough [OPTIONS]
```

**Key Options:**
- `--seed <number>`: Force a specific RNG seed for deterministic debugging.
- `--batch <number>`: Run multiple simulations sequentially to find edge-case crashes.
- `--headed`: Run with visible browser windows to watch the tactical logic in real-time.
- `--help`: Display the full manual for the playthrough tool.

### Schema Generation (`scripts/generate-schemas.ts`)
Synchronizes the Zod source-of-truth with JSON Schema artifacts used by external tools.

---

## Exit Codes
Phalanx Duel scripts follow standard POSIX exit codes:
- `0`: Success.
- `1`: General failure or validation violation.
- `2`: Type-check or Lint failure.
- `130`: Terminated by user (Ctrl+C).
