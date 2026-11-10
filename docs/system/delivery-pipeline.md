# Delivery Pipeline

The executable contract is [pipeline.yml](../../.github/workflows/pipeline.yml).
Routine validation and release verification are separate operations. A green
routine push does not mean a release was built or deployed.

## Local gates

Both `.husky/pre-commit` and `.husky/pre-push` run `pnpm verify:quick`.
This builds the workspace, lints code and workflows, verifies database isolation,
typechecks packages, checks committed documentation, and checks formatting.
The commit hook also rejects secret-bearing local environment files.

Run `rtk pnpm check` for quick verification followed by all workspace tests.
Server tests use `bin/maint/with-test-postgres.sh` and the isolated
`phalanxduel_test` database. Never pass an ambient personal database to tests.
Before a production release, run the isolated `rtk bin/dock pnpm verify:full`
gate described in [AGENTS.md](../../AGENTS.md).

## Routine pushes and pull requests

The Sanity Checks job runs on pushes to `main` and pull requests targeting
`main`. It installs the frozen lockfile and runs `pnpm verify:quick`, the
Gemini authentication regression checks, and validation of the deployed
collector configuration using the exact collector image from the Dockerfile.

Dependabot npm pull requests also run a low-severity dependency audit and the
shared, engine, client, admin, and MCP unit suites. These checks use no database.
Database-backed tests and browser QA remain part of explicit release verification.

Routine runs do not publish SDKs, build production images, or deploy. Workflow
concurrency cancels superseded runs for the same ref.

## Explicit verification and release

Dispatch the Pipeline workflow to run Test and Lint and Adversarial Security
Tests. The dispatch inputs independently control publication and promotion:

| Input | Default | Effect |
| --- | --- | --- |
| `publish_sdks` | `false` | Generate and upload Go and TypeScript SDK artifacts after tests pass |
| `publish_image` | `false` | Build and push the production image after both verification jobs pass |
| `promote_production` | `false` | Promote the built image after GitHub production-environment approval |
| `refresh_visual_snapshots` | `false` | Upload refreshed Linux Playwright baselines for review |

Test and Lint uses the Playwright container and PostgreSQL 17 with pgvector.
Tests run as `phalanx_test` against `phalanxduel_test`; server files execute
sequentially. The job audits dependencies and action pins, builds packages,
generates OpenAPI and SDK contracts, applies migrations, and runs `verify:ci`.
That includes coverage, replay, playthrough, visual, schema, and rules checks.
Coverage and failure evidence are uploaded as workflow artifacts.

The independent adversarial job validates server authority against isolated
PostgreSQL. The image build waits for both verification jobs. SDK publication
waits for Test and Lint and is optional.

## Production promotion

Set both `publish_image` and `promote_production` to request a release.
The production job requires GitHub environment approval. It pulls the tested
GHCR image by digest, tags it locally, and deploys that image to the game and
admin Fly apps. It does not rebuild source during promotion.

Both game and admin deployment and readiness must succeed. Staging is retired.
See [deployment.md](../deployment.md) and the [runbook](../ops/runbook.md)
for operator checks, reconnect behavior, and rollback limits.

## Optional automation

Gemini review and triage share `scripts/ci/run-gemini.sh`. Events without an
available authentication method skip with a notice. Configured API-key and
workload-identity paths continue to run. Scheduled Gemini triage and stale
processing are manual-only. See [configuration.md](../configuration.md).

OpenTelemetry dependency updates are grouped separately. SDK 3 and API 1.10
require a coordinated migration; the current application retains SDK 2 and
API 1.9. Prettier remains pinned to the established formatting version until
an explicit repository formatting refresh.
