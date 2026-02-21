# Changelog

All notable changes to the Phalanx Duel project will be documented in this file.

## [0.2.3-rev.9] - 2026-02-21

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
- **The Observability Triad**: Implemented full-stack **Sentry**, **PostHog**, and **OTel** integration.
- **Session Linking**: Linked Sentry errors to PostHog session replays via `posthog_session_id`.
- **Persistent User ID**: Implemented browser-side `visitorId` for cross-visit player tracking.
- **Privacy Framework**: Created `docs/PRIVACY_AND_ETHICS.md` to define data minimization and ethical mandates.
- **Supply Chain Hardening**: Switched from CDN script tags to NPM-based integration for Sentry and PostHog.
- **Functional Health**: Enhanced `/health` endpoint with uptime, memory, and observability metadata.

### Changed
- **pnpm Hardening**: Configured `onlyBuiltDependencies` to safely allow native profiling binaries.
- **Zod v4 Migration**: Upgraded `zod` and refactored schemas for stricter validation compatibility.

## [0.2.0] - 2026-02-19
- **Live Spectator Mode**: Phase 26 release.
- **Tactician's Table**: Full visual redesign with Cinzel and IBM Plex Mono fonts.
- **Responsive Layout**: Mobile support for 600px and 380px viewports.
- **Production Readiness**: Initial Fly.io deployment and same-origin WebSocket support.
