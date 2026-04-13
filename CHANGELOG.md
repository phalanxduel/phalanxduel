# Changelog

All notable changes to the Phalanx Duel project will be documented in this file.

## [0.5.0-rev.4] - 2026-04-12

### Added
- **Developer Guide**: Added a canonical scenario-oriented contributor guide in
  `docs/tutorials/developer-guide.md` covering setup, validation choices, QA
  flows, local observability, Docker workflows, and common FAQ-style tasks.
- **Admin Surface**: Added the standalone `admin/` workspace and local admin
  development path (`pnpm dev:admin`) for operator workflows.
- **Release-Facing Documentation Governance**: Established Backlog-managed
  planning, decision, and audit surfaces for active process docs while keeping
  `docs/` as the canonical reference tree.

### Changed
- **Stability & Playability**: Completed the main `v0.5.0` hardening tranche
  around reconnect reliability, QA safety, local Docker development, bot-play
  merge readiness, durable audit trail work, and stricter lint/typecheck
  enforcement.
- **Observability**: Moved to a native-first OpenTelemetry workflow with a
  local collector path and centralized OTLP export support instead of the older
  mixed observability setup.
- **Documentation Architecture**: Consolidated agent instructions, canonical doc
  indexes, decision records, and contributor navigation so active docs are
  easier for humans and AI agents to follow without drifting into stale plans.
- **Backlog Integrity**: Normalized decision-record structure, removed duplicate
  decision/doc surfaces, and aligned workflow docs with the actual Backlog.md
  task lifecycle used in the repo.

### Fixed
- **Trust Boundaries**: Hardened server-side player identity handling and other
  repository hardening follow-up work discovered during the audit/review wave.
- **Documentation Drift**: Corrected stale command references and contributor
  entry points so the root docs, system docs, and task workflow point at the
  same current paths.

## [0.4.1-rev.1] - 2026-03-20

### Security & Internal Hardening
- **Strictness Upgrade**: Replaced ESLint `recommended` config with `strictTypeChecked` and `stylisticTypeChecked` rules.
- **Security Linting**: Added `eslint-plugin-security` to run across the entire codebase.
- **TypeScript**: Decoupled test files from the workspace `tsc` build process while continuing to lint them and test them with `vitest`.
- **Note**: This is a purely internal tooling hardening patch. Zero public API, rules, or behavior changes.

## [0.4.0] - 2026-03-20

### Added
- **Fog of War**: Implemented strategic hidden-information boundaries.
    - Draw Piles and Opponent Hands are now redacted in `GameState`.
    - Battlefield cards are deployed `faceDown: true` (redacted) and revealed only on `AttackPhase` start or combat involvement.
    - Discard Piles now only show the top card and total count to opponents/spectators.
- **State-Machine Fidelity Hardening**: Reached **100% transition coverage** in the engine test suite.
    - Formalized `STATE_MACHINE` in `engine/src/state-machine.ts` as the authoritative transition contract.
    - Refactored `validateAction` to perform strict phase-fidelity checks using the transition graph.
    - Added missing `forfeit` edges to all non-terminal phases.
- **Match Flexibility**: Added `classicDeployment` option to `GameOptions` to support alternative start states and deployment-skipping transitions.

### Changed
- **Schema Synchronization**: Updated all shared JSON schemas and TypeScript types to reflect `classicDeployment` and Fog of War visibility rules.
- **Documentation**: Regenerated all system diagrams (Site Flow, Dependency Graph) to match the hardened 8-phase lifecycle.

## [0.3.0-rev.8] - 2026-03-15

No notable changes recorded for this release.

## [0.3.0-rev.6] - 2026-03-08


- **Engine correctness**: Cumulative damage mode no longer skips DeploymentPhase; `modeClassicDeployment` is now always `true` and independent of `damageMode`.
- **Server reliability**: REST `POST /matches` → WS `joinMatch` contract mismatch fixed; REST-created matches can now be joined without a crash.
- **Server security**: Admin Basic Auth now fails closed (no default credentials) outside `development`/`test` environments; `/debug/error` route gated to non-production by default.

### Added
- **QA tooling**: `simulate-ui.ts` now emits a per-process playthrough ID (`pt-XXXXXX`) on every log line for multi-run correlation and filtering.
- **QA tooling**: WS health-badge preflight guard in `simulate-ui.ts` fails fast with an actionable error when the backend is not running.
- **Observability**: Development-only observability toolbar enabled for local debugging.
- **Regression tests**: `system:init` transition now covered for both `classic` and `cumulative` modes (engine test suite).

## [0.2.3-rev.44] - 2026-02-25

### Added
- **Visual Logic**: Integrated Action Sequence and State Machine diagrams into `docs/ARCHITECTURE.md`.
- **Manual-Level Docs**: Added professional `--help` output to the `qa-playthrough` CLI tool.
- **CLI Reference**: Created `docs/CLI.md` as a central manual for all `pnpm` scripts.
- **Versioning Logic**: Updated `generate-docset.sh` to inject version strings into the Dash.app `Info.plist`.

### Changed
- **Git Hygiene**: Refined `.gitignore` to exclude volatile search indexes (`*.dsidx`) and build cache (`.tsbuildinfo`).
- **ESLint Stabilization**: Downgraded to v9.21.0 to resolve a crash in the TypeScript plugin while maintaining strict checks.

## [0.2.2] - 2026-02-21

### Added
- **API Contract Enforcement**: Implemented OpenAPI snapshot testing (`server/tests/openapi.test.ts`) to prevent endpoint drift.
- **Architectural Guardrails**: Integrated `dependency-cruiser` to enforce strict package boundaries (e.g., isolating the Engine).
- **Technical Reference**: Created `docs/TECHNICAL_REFERENCE.md` as the unified documentation landing page.
- **Dash.app Support**: Implemented `pnpm docs:dash` to generate a searchable `.docset` artifact.
- **Visual Identity**: Added a tactical SVG shield favicon to the game lobby.

### Changed
- **Versioning Protocol**: Established mandatory Git tagging and `SCHEMA_VERSION` alignment for all deploys.
- **Quality Gates**: Enabled Cyclomatic Complexity (ESLint) and Test Coverage (Vitest) enforcement (>80%).

## [0.2.1] - 2026-02-20

### Added
- **The Observability Triad**: Implemented full-stack error reporting, product analytics, and OpenTelemetry instrumentation.
- **Session Linking**: Linked error reports to PostHog session replays via `posthog_session_id`.
- **Persistent User ID**: Implemented browser-side `visitorId` for cross-visit player tracking.
- **Privacy Framework**: Created `docs/PRIVACY_AND_ETHICS.md` to define data minimization and ethical mandates.
- **Supply Chain Hardening**: Switched from CDN script tags to NPM-based integration for client observability and analytics tooling.
- **Functional Health**: Enhanced `/health` endpoint with uptime, memory, and observability metadata.

### Changed
- **pnpm Hardening**: Configured `onlyBuiltDependencies` to safely allow native profiling binaries.
- **Zod v4 Migration**: Upgraded `zod` and refactored schemas for stricter validation compatibility.

## [0.2.0] - 2026-02-19
- **Live Spectator Mode**: Phase 26 release.
- **Tactician's Table**: Full visual redesign with Cinzel and IBM Plex Mono fonts.
- **Responsive Layout**: Mobile support for 600px and 380px viewports.
- **Production Readiness**: Initial Fly.io deployment and same-origin WebSocket support.
