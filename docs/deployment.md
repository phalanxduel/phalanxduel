# Phalanx Duel CI/CD Pipeline

This document defines the authoritative production-only release automation for
Phalanx Duel. The required deployed subsystem scope and health evidence live in
the [Production Support Contract](ops/production-support-contract.md).

Staging is retired. Production promotion does not depend on or target a staging
environment.

## 1. Pipeline Overview

The pipeline is designed for **high fidelity and safety**. It builds and pushes
a GHCR image on `main`, then the manually approved production job promotes that
tested image to Fly.io with `fly.production.toml`.

```mermaid
graph TD
    Dev[Local Development] --> Husky[Husky Hooks]
    Husky --> PR[Pull Request]
    PR --> CI[CI Gate: Test, Audit, and Adversarial Security]
    CI --> Merge[Merge to Main]
    Merge --> Build[Build Production Image]
    Build --> GHCR[(GHCR Registry)]
    GHCR --> Manual[Manual Production Approval Gate]
    Manual --> Production[Promote: Production]
```

---

## 2. Phase 1: Local Development (Pre-Commit)

We use **Husky** and **lint-staged** to ensure that only quality code is committed.

### Pre-Commit Hook
- **Environment Check**: Rejects commits containing sensitive `.env` files (e.g., `.env.local`).
- **Linting**: Runs `eslint`, `prettier`, and `markdownlint` only on files staged for commit.
- **Project Gates**: Runs `rtk pnpm verify:full` which performs the full build, lint, typecheck, test, schema, docs, and formatting verification pass across the workspace.

### Pre-Push Hook
- Performs a final `rtk pnpm verify:full` to guarantee that the branch is ready for the remote repository.

---

## 3. Phase 2: Pull Request (The Gate)

On every PR to `main`, GitHub Actions triggers the **Test Job**.

- **Goal**: Verify that the changes are compatible with the integrated codebase.
- **Requirements**: All tests, linting, and typechecks must pass. The PR cannot be merged if this stage fails.

---

## 4. Phase 3: Main Branch (The Artifact)

Once merged into `main`, the pipeline switches to **Artifact Production**.

### Build and Push (`build` job)
- A production Docker image is built using the canonical `Dockerfile`.
- The image is pushed to **GitHub Container Registry (GHCR)**.
- **Tagging**: Every build is tagged with the git SHA and `latest-main`.
- This artifact is useful for scanning, inspection, and future deployment
  workflows, but it is **not** the runtime artifact currently promoted to Fly.

### Runtime Deployment Path

- `.github/workflows/pipeline.yml` builds and pushes a content-addressed GHCR
  image from the verified Git SHA.
- A maintainer approves the production environment.
- The workflow pulls and locally tags that tested image, then deploys it to
  `phalanxduel-production` with `flyctl --local-only --image`.
- Promotion and rollback behave like rolling app restarts. Active matches
  recover through persisted state and rejoin; clients may need to reconnect,
  and rollback does not rewind schema or persisted gameplay data.

---

## 5. Phase 4: Production (The Promotion)

Production releases are **never automatic**. They require manual approval after
the test, adversarial-security, SDK, and image-build jobs succeed.

### Promotion Gate
- **Manual Approval**: A maintainer must explicitly click **"Approve and Deploy"** in the GitHub Actions Environment UI.
- **Current deployment mode**: the workflow promotes the tested GHCR image
  using `fly.production.toml`; it does not rebuild application source.
- **Rollback constraint**: app rollback is only safe while the previous release
  remains compatible with the live schema and persisted state.

### Target Environment
- **App**: `phalanxduel-production`
- **Custom Domain**: `play.phalanxduel.com`
- **Infrastructure URL**: `phalanxduel-production.fly.dev`

---

## Failure Meanings & Actions

| Stage | Failure Meaning | Required Action |
|-------|-----------------|-----------------|
| **CI (Test)** | Logic, types, or formatting regression. | Fix code and push update. |
| **Build** | Docker build failure or registry auth issue. | Check Dockerfile and GitHub Secrets. |
| **Promotion** | Rejected manually or production outage. | Investigate release evidence or production infrastructure. |

## Operational Recovery Notes

- Active-match restart recovery is supported through persisted player identity
  and reconnect, not through continuous socket survival.
- The reconnect deadline survives a server restart; operators should not expect
  a deploy or rollback to reset the forfeit timer.
- Schema or migration incidents require the database recovery path in
  `docs/ops/runbook.md`; Fly release rollback alone is not
  sufficient.

---

## MCP Server Deployment

The MCP server runs as two separate Fly.io apps so that the public and admin profiles are
structurally isolated. Each has its own `fly.*.toml` in `mcp/`.

### Apps

| App | Config | Profile | Access |
| --- | --- | --- | --- |
| `phalanxduel-mcp-public` | `mcp/fly.public.toml` | `public` | Public HTTPS (`/mcp`) |
| `phalanxduel-mcp-admin` | `mcp/fly.admin.toml` | `admin` | Internal only (`fly proxy`) |

### Initial Deploy

```bash
# Public app (auto-starts/stops, 256 MB)
fly deploy --config mcp/fly.public.toml

# Admin app (no public HTTP service, internal only)
fly deploy --config mcp/fly.admin.toml
fly secrets set MCP_ADMIN_TOKEN="$(openssl rand -hex 32)" \
  --app phalanxduel-mcp-admin
```

Set any required secrets for both apps:

```bash
fly secrets set DATABASE_URL="<postgres-uri>" ANTHROPIC_API_KEY="..." \
  --app phalanxduel-mcp-public
fly secrets set DATABASE_URL="<postgres-uri>" ANTHROPIC_API_KEY="..." \
  OPENAI_API_KEY="..." --app phalanxduel-mcp-admin
```

### Accessing the Admin App

The admin app has no public `[http_service]`. Access it through a Fly proxy tunnel:

```bash
fly proxy 8081:8080 --app phalanxduel-mcp-admin
# MCP is now reachable at http://127.0.0.1:8081/mcp
```

Add `phalanx-prod-admin` to `.mcp.json` with `Authorization: Bearer <MCP_ADMIN_TOKEN>` to use it
from Claude Code.

### MCP Deployment Does Not Follow the Main Pipeline

MCP apps are deployed independently with `fly deploy --config mcp/fly.*.toml`. They are not part of
the `pipeline.yml` automated promotion flow. Deploy them manually after verifying the tool set.

---

## Related Canonical Docs

- `docs/ops/deployment-checklist.md` for the operator-facing deployment
  checklist
- `docs/ops/runbook.md` for incident response and rollback
- `docs/ops/production-support-contract.md` for required production subsystems
  and evidence
- `.github/workflows/pipeline.yml` for the exact automation source of truth
- `mcp/README.md` for MCP tool reference, profile matrix, and `.mcp.json` config
