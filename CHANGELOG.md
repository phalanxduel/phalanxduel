# Changelog

## [1.4.0] - 2026-07-13

### Added
- **Advanced MCTS Bot Strategy**: Implemented Monte Carlo Tree Search (MCTS) for superior tactical play. The new bot uses heuristic state evaluation and deterministic search to achieve significantly higher win rates (>70% vs existing heuristic bots).
- **Bot Battle Benchmark**: New QA utility `bin/qa/bot-battle.ts` for automated performance verification of different bot strategies.
- **Scientific Gameplay Assurance**: Added an independent combat reference model, exhaustive boundary verification, match-liveness proofs, replay-integrity checks, and observer-safe knowledge assertions.
- **Authoritative Combat Mathematics**: Exposed engine-blessed calculations and provenance to narration, event displays, previews, and post-battle explanations.

### Changed
- **Corrected Combat Semantics**: Versioned the rules and public schema at `1.4.0`, with cumulative damage and direct-path behavior aligned across the engine, documentation, replay, and client projections.
- **Presentation Choreography**: Tightened narration, phase, combat-effect, and terminal transitions while preserving deterministic semantic cue order and reduced-motion support.

### Fixed
- **Visual Regression Stability**: Resolved overlay race conditions in Playwright tests by programmatically suppressing `WelcomeDialog` during visual QA runs.
- **Migration Robustness**: Implemented baseline re-synchronization in `server/src/db/migrate.ts` to prevent duplicate table creation errors in shared test environments.
- **ESM Interop**: Standardized named imports for `@phalanxduel/shared/hash` to resolve runtime module resolution failures.
- **Combat Feedback Layout Stability**: Moved the high-impact damage-combo banner into a non-interactive presentation layer so it no longer compresses or shifts the battlefield on desktop or mobile.
All notable changes to Phalanx Duel will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-05-08

### Added
- **"Immaculate" Documentation Baseline**: Performed a deep repository audit to eliminate entropy, resulting in the migration of `docs/reference/dod.md` to a structured directory (`docs/reference/dod/`) with granular sub-documents for Core Criteria, Change Surfaces, and Completion Rules.
- **Combat Explanation Fidelity**: Finalized the visual feedback model with column-wide glows (Attack, Target, Reinforce, Resolution) and tactical card accents, ensuring high-signal communication of combat outcomes.
- **Durable Audit Trail**: Standardized `transactionLog` with semantic cause tags (e.g., "HEART SHIELD") to provide machine-readable explanations for all state transitions.
- **Playability Gate**: Formalized the `pnpm qa:playthrough:verify` quality gate as a mandatory blocker for all UI and engine changes.

### Changed
- **Repository Architecture**: Reconciled the `docs/` tree with the current filesystem, removing stale path mappings and orphaned links.
- **Version Stabilization**: Synchronized all workspace packages and environment contracts to the v1.3.0 baseline.
- **Engine Hardening**: Refined `LocalMatchManager` and authenticated recovery logic to ensure graceful degradation and reliable match resumption.
- **CI/CD Hygiene**: Updated `docs/tutorials/ai-agent-workflow.md` to reflect the v1.3.x hardening standards and unified verification commands.

### Fixed
- **Link Rot**: Resolved critical structural discrepancies in the Definition of Done (DoD) references.
- **Dependency Drift**: Fixed workspace resolution errors and TypeScript project reference conflicts (TS6305) in containerized builds.
- **Recovery Logic**: Resolved uninitialized match status and abandonment permission issues during database outages.

## [1.2.0] - 2026-05-06

### Added
- **Semantic Event Normalization**: Enriched game events with cause tags to support detailed UI explanations.
- **Atmospheric Cinematic UI**: Implemented a persistent, high-performance cinematic background across all game transitions.
- **Staging Pipeline**: Formalized the "Truth Gate" CI configuration for staging and production deployments.

### Changed
- **Technical Hardening**: Standardized documentation hierarchy and excised dead code remnants across the monorepo.
- **Build Stability**: Resolved workspace resolution errors for containerized parity and ESM interop.

## [1.1.0] - 2026-04-28

### Added
- **Visual Signal Model**: Implemented the first tranche of in-game tactical signals (column glows and card highlights).
- **REST Gameplay Interface**: Exposed `POST /api/matches/:id/action` with full player-identity protection.
- **Automated SDK Generation**: CI now publishes `sdk-ts` and `sdk-go` artifacts on every green build.
- **Go Duel CLI**: A resilient, authenticated CLI client with reconnect and ACK replay support.

## [1.0.0] - 2026-04-15
- **Initial Stable Release**: Phalanx Duel Core Mechanics, WebSocket-first Multiplayer, and basic Lobby functionality.

## [0.5.0-rev.5] - 2026-04-13

### Added
- **Authenticated Match Recovery**: Added `POST /api/matches/:id/resume` and `POST /api/matches/:id/forfeit` for authenticated players to recover sessions without relying on volatile WebSocket IDs.
- **Lobby Redaction**: Implemented `TurnViewModel` projection for the Match Lobby list to prevent leaking private player data before joining.
- **Versioning**: Bumped workspace packages and `SCHEMA_VERSION` to `0.5.0-rev.5` to reflect the additive authenticated recovery surface.

### Fixed
- **Reconnect Identity Preservation**: Preserved local authenticated player identity during match sync updates.

[1.3.0]: https://github.com/phalanxduel/phalanxduel/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/phalanxduel/phalanxduel/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/phalanxduel/phalanxduel/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/phalanxduel/phalanxduel/releases/tag/v1.0.0
