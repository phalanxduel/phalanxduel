# Delivery Pipeline

> The pipeline starts on the development box and ends in production.
> Every stage is a quality gate. No stage may be bypassed.

## Pipeline Overview

```mermaid
flowchart TD
    subgraph DEV["🖥️ Development Box (Host-Native)"]
        direction TB
        COMMIT["git commit"]
        PRECOMMIT["Pre-Commit Hook"]
        PUSH["git push"]
        PREPUSH["Pre-Push Hook"]

        COMMIT --> PRECOMMIT
        PRECOMMIT -->|pass| PUSH
        PUSH --> PREPUSH
    end

    subgraph CI["☁️ GitHub Actions (Remote CI)"]
        direction TB
        TEST["Test and Lint"]
        ADVERSARIAL["Adversarial Security Tests"]
        BUILD["Build and Push (Docker)"]
        SDK["Publish SDK Artifacts"]
        STAGING["Deploy: Staging"]
        PROD["Promote: Production"]

        TEST --> BUILD
        TEST --> SDK
        BUILD --> STAGING
        STAGING --> PROD
    end

    PREPUSH -->|"push to main"| TEST
    PREPUSH -->|"push to main"| ADVERSARIAL
```

---

## Stage 1: Pre-Commit Hook (Development Box)

**Trigger:** `git commit`
**Purpose:** Fast feedback on staged files. Catches secrets, formatting, and
lint errors before they enter the commit history.

| Check | Tool | What It Validates |
|---|---|---|
| Secret scanning | `secretlint` | No API keys, tokens, or credentials in staged files |
| Code lint + fix | `eslint --fix` | TypeScript/JavaScript code quality (auto-fixes) |
| Code formatting | `prettier --write` | Consistent formatting (auto-fixes) |
| Markdown lint | `markdownlint-cli2 --fix` | Documentation standards |
| Workflow lint | `actionlint` | GitHub Actions YAML correctness |
| Shell syntax | `bash -n` / `zsh -n` | Shell script parse errors |
| TOML formatting | `taplo fmt` | TOML file formatting |
| Package sort | `sort-package-json` | Canonical package.json key order |
| Env file guard | grep + exit 1 | Rejects `.env.local` and secret-bearing files |

After lint-staged, the hook runs **`verify:quick`** which executes:

| Phase | What Runs |
|---|---|
| 0: Build Identity | `infra:metadata` + `pnpm build` (full workspace) |
| 1: Linting | `eslint` + `shellcheck` + `actionlint` (if available) |
| 2: Type Checking | `tsc --noEmit` across all workspace packages |
| 5: Docs & Formatting | `docs:check` + `lint:md` + `prettier --check` |

> [!NOTE]
> `verify:quick` skips unit tests and QA verification for speed.
> Full testing is deferred to the pre-push hook.

---

## Stage 2: Pre-Push Hook (Development Box)

**Trigger:** `git push`
**Purpose:** Full verification before code leaves the development box.
This is the most comprehensive local gate.

Runs **`verify:full`** which executes all phases:

| Phase | What Runs |
|---|---|
| 0: Build Identity | `infra:metadata` |
| 1: Linting | `eslint` + `shellcheck` + `actionlint` (if available) |
| 2: Type Checking | `tsc --noEmit` across all workspace packages |
| 3: Testing | `pnpm test:run:all` (all unit/integration test suites) |
| 4: Tooling & QA | Go client checks, schema verification, FSM consistency, event log verification, feature flag env checks, **Replay verification**, **Playthrough verification** |
| 5: Docs & Formatting | `docs:check` + `lint:md` + `prettier --check` |

> [!IMPORTANT]
> `actionlint` and `shellcheck` are **dev-box tools**. They run when
> installed locally (via brew) but skip gracefully in CI. The pre-commit
> and pre-push hooks are the authoritative gates for these tools.

---

## Stage 3: Test and Lint (Remote CI)

**Trigger:** Push to `main` (or PR against `main`)
**Purpose:** Integration verification in a clean, reproducible environment.
Confirms that what passed locally also passes from a clean checkout.

```yaml
# pipeline.yml → test job
corepack pnpm build
corepack pnpm verify:ci
```

**`verify:ci`** executes:

| Phase | What Runs |
|---|---|
| 1: Linting | `eslint` (auxiliary tools skip — gated locally) |
| 2: Type Checking | `tsc --noEmit` across all workspace packages |
| 3: Testing | `pnpm test:coverage:run` (with coverage reporting) |
| 4: Tooling & QA | Optional: Replay/Playthrough (skips on remote GHA, runs on `act`) |
| 5: Docs & Formatting | `docs:check` + `lint:md` + `prettier --check` |

**Artifacts uploaded:** Coverage reports (always), playthrough anomalies (on failure).

> [!NOTE]
> CI runs `test:coverage:run` instead of `test:run:all` to produce
> coverage artifacts. The test suites are the same.

### Integration Environment (Postgres)

The `test` job includes a **Postgres 17 service container**. This ensures that
integration tests (matchmaking, WebSocket, etc.) run against a real database
with the canonical schema.

- **Setup:** Database is initialized via `pnpm --filter @phalanxduel/server db:migrate`
- **Identity:** Tests use a trusted connection to `postgresql://postgres@localhost:5432/phalanxduel_test`

### Test Parallelism

To maintain absolute stability and prevent database state interference:
- **Server Tests:** Run sequentially (`fileParallelism: false`).
- **Engine/Shared Tests:** Run in parallel (no database dependencies).

---

## Stage 4: Adversarial Security Tests (Remote CI)

**Trigger:** Push to `main` (or PR against `main`) — runs in parallel with Test and Lint
**Purpose:** Server-authority validation. Confirms that the server correctly
rejects malformed, out-of-turn, and privilege-escalation attempts.

```yaml
# pipeline.yml → adversarial job
corepack pnpm build
corepack pnpm --filter @phalanxduel/server test:adversarial
```

> [!NOTE]
> This job is **independent** — it does not block the deployment path.
> It validates security invariants in parallel with the main test suite.

---

## Stage 5: Publish SDK Artifacts (Remote CI)

**Trigger:** After Test and Lint passes
**Purpose:** Generate and publish Go and TypeScript SDK artifacts from the
authoritative OpenAPI and AsyncAPI specifications.

```yaml
# pipeline.yml → publish-sdks job (needs: test)
corepack pnpm build
corepack pnpm openapi:gen
corepack pnpm sdk:gen
```

**Artifacts uploaded:** `sdk-go`, `sdk-ts`

> [!NOTE]
> SDK generation requires Java (for `openapi-generator-cli`) and Go.
> This is the only place in CI where SDK generation runs.

---

## Stage 6: Build and Push Docker Image (Remote CI)

**Trigger:** After Test and Lint passes, only on `main` branch pushes
**Purpose:** Build the production Docker image and push to GHCR.

- Uses Docker Buildx with GHA cache
- Tags: `sha-<full-sha>` + `latest-main`
- Outputs `image_ref` (digest-pinned) for downstream deployment stages

---

## Stage 7: Deploy to Staging (Remote CI)

**Trigger:** After Build and Push completes, only on `main` branch pushes
**Purpose:** Deploy the tested, digest-pinned image to the staging environment.

- **Target:** `phalanxduel-staging` on Fly.io
- **Config:** `fly.staging.toml`
- **URL:** `https://phalanxduel-staging.fly.dev`
- Uses the exact image digest from Stage 6 (no tag drift)

---

## Stage 8: Promote to Production (Remote CI)

**Trigger:** After Deploy to Staging completes, only on `main` branch pushes
**Purpose:** Deploy the same tested image to production. Requires manual
approval via GitHub Environment protection rules.

- **Target:** `phalanxduel-production` on Fly.io
- **Config:** `fly.production.toml`
- **URL:** `https://play.phalanxduel.com`
- Uses the **same image digest** as staging (guaranteed parity)

---

## Tool Responsibility Matrix

| Tool | Pre-Commit | Pre-Push | CI Test | CI Adversarial | CI SDK |
|---|:---:|:---:|:---:|:---:|:---:|
| `secretlint` | ✅ | — | — | — | — |
| `eslint` | ✅ (fix) | ✅ (check) | ✅ (check) | — | — |
| `prettier` | ✅ (fix) | ✅ (check) | ✅ (check) | — | — |
| `actionlint` | ✅ | ✅ | ⏭️ skip | — | — |
| `shellcheck` | — | ✅ | ⏭️ skip | — | — |
| `markdownlint` | ✅ (fix) | ✅ (check) | ✅ (check) | — | — |
| `tsc --noEmit` | ✅ | ✅ | ✅ | — | — |
| Unit tests | — | ✅ | ✅ (coverage) | — | — |
| Adversarial tests | — | — | — | ✅ | — |
| Schema verification | — | ✅ | — | — | — |
| FSM consistency | — | ✅ | — | — | — |
| Event log verification | — | ✅ | — | — | — |
| Feature flag env | — | ✅ | — | — | — |
| Go clients check | — | ✅ | — | — | — |
| Replay verification | — | ✅ | ⏭️ skip | — | — |
| Playthrough verification | — | ✅ | ⏭️ skip | — | — |
| Docs artifact check | ✅ | ✅ | ✅ | — | — |
| OpenAPI + SDK gen | — | — | — | — | ✅ |
| Docker build | — | — | — | — | — |

---

## Verification Mode Reference

The `scripts/ci/verify.sh` script accepts a mode argument that controls which
phases run:

| Mode | Used By | Build | Lint | Typecheck | Tests | QA/Schema | Docs |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `quick` | Pre-commit | ✅ | ✅ | ✅ | — | — | ✅ |
| `full` | Pre-push | ✅¹ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `ci` | GHA test job | —² | ✅ | ✅ | ✅ (+coverage) | ✅ (replay, playthrough) | ✅ |
| `release` | Deploy script | — | — | — | — | ✅ (fairness, API integration) | — |

¹ `full` mode only runs `infra:metadata` (build happens in pre-commit's `quick`).
² CI mode skips build because pipeline.yml runs `pnpm build` explicitly before `verify:ci`.
