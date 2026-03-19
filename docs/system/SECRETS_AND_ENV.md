# Secrets and Environment Management (DSL-Driven)

This document defines the architecture for managing secrets and environment variables across Phalanx Duel. We use a **DSL-driven, zero-drift pipeline** to synchronize local configurations with Fly.io and GitHub Environments.

## ── The "One-Source" Entrypoints ─────────────────────────────────────

We use a layered configuration strategy to minimize duplication and prevent drift.

### 1. Global Secrets (`.env.secrets`)
This is the **single entrypoint** for secrets shared across ALL environments (Staging and Production).
*   **Primary Use**: Sentry DSN, Security Tokens, and CI/CD Auth Tokens.
*   **Nirvana State**: You paste your Sentry Master Key **once** here, and it propagates everywhere.

### 2. Environment Secrets (`.env.staging` / `.env.production`)
These files contain secrets **unique** to a specific deployment.
*   **Primary Use**: `DATABASE_URL`, `APP_ENV`, and unique server ports.
*   **Relationship**: These files **inherit** all values from `.env.secrets` during synchronization.

---

## ── The Management Utility (`sync-secrets.ts`) ───────────────────────

All secret operations are handled via the `secrets:*` scripts in the root `package.json`.

### Core Commands

| Command | Description |
| :--- | :--- |
| `pnpm secrets:push:[env]` | Pushes local DSL values to Fly.io and GitHub Environments. |
| `pnpm secrets:audit:[env]` | Compares local DSL against live remotes to detect drift or missing keys. |
| `pnpm secrets:prune:[env]` | Removes "Orphan" secrets from Fly.io/GitHub that are not in your DSL. |
| `pnpm secrets:bootstrap:[env]` | Extractions plaintext secrets from a running Fly machine into your local DSL. |

### DSL Decorators (The Magic)
Our `.env` files use special comments to guide the synchronization logic:

* `# @target: [ALL|RUNTIME|PIPELINE|LOCAL]`
  * `RUNTIME`: Pushed only to Fly.io.
  * `PIPELINE`: Pushed only to GitHub Environment Secrets.
  * `ALL`: Pushed to both.
* `# @concern: [GENERAL|DATABASE|OBSERVABILITY|ADMIN]`
  * Used for categorization in audit reports.
* `# @macro: SENTRY_OTLP`
  * Automatically expands a single `SENTRY_DSN` into the 3 required OTLP endpoints for the OpenTelemetry collector.

---

## ── Sentry Mono-Project Architecture ────────────────────────────────

We have converged all services (Server, Client, Admin) into a **single Sentry project** (`phalanxduel`).

### The Convergence Strategy
*   **Environment Tagging**: We use the `APP_ENV` variable to distinguish between `staging` and `production` inside the Sentry dashboard.
*   **Vite Security**: Browser clients require a `VITE_` prefix. Our DSL handles this via interpolation: `VITE_SENTRY_DSN=${SENTRY_DSN}`.
*   **Identical Identity**: While distinct in role, we currently link `SENTRY_AUTH_TOKEN` and `SENTRY_SECURITY_TOKEN` to the `SENTRY_DSN` value in the global secrets file for maximum efficiency.

---

## ── Platform Integration ─────────────────────────────────────────────

### 1. Fly.io (Runtime)
The utility pushes secrets to Fly.io using `flyctl secrets set`.
*   **Build Secrets**: Sensitive tokens (like `SENTRY_AUTH_TOKEN`) are passed as `--build-secret` during deployment to ensure they are never baked into image layers.
*   **Runtime Env**: Database URLs and DSNs are injected into the container at startup.

### 2. GitHub Environments (Pipeline)
Secrets are synchronized to GitHub **Environment Secrets** (not Repository Secrets).
*   **Isolation**: Staging and Production secrets are strictly isolated by their respective GitHub Environments.
*   **CI Usage**: The `pipeline.yml` pulls these secrets during the `deploy-staging` or `promote-production` jobs.

---

## ── Security and Drift Control ───────────────────────────────────────

*   **No Tracked Secrets**: `.env`, `.env.staging`, `.env.production`, and `.env.secrets` are **strictly ignored** by Git. Only `.env.example` is tracked.
*   **Zero Drift**: Use `pnpm secrets:audit:production` weekly to ensure no manual changes have been made in the Fly.io dashboard or GitHub UI.
*   **Protected Keys**: The utility will refuse to overwrite critical keys like `NODE_ENV` or `PORT` unless the `--force` flag is provided.

## ── References ───────────────────────────────────────────────────────

-   **Management Script**: `scripts/maint/sync-secrets.ts`
-   **CI Workflow**: `.github/workflows/pipeline.yml`
-   **Sentry Auth Guide**: [Sentry Auth Tokens](https://docs.sentry.io/account/auth-tokens/)
