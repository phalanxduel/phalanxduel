# Repository Hardening Audit - Reviewer Report

## Runtime Declaration

### Operator-Provided Identity

- TOOL_DIR_NAME: gordon
- MODEL_FILE_NAME: gordon.md
- PLATFORM_ID: gordon
- HARNESS_ID: unknown
- PROVIDER_ID: unknown
- MODEL_ID: gordon
- MODEL_FAMILY: unknown
- MODEL_SNAPSHOT: unknown
- LOCALITY: unknown
- API_BASE: unknown
- NETWORK_ACCESS: enabled
- FILE_WRITE_ACCESS: enabled
- SHELL_ACCESS: enabled

### Agent Runtime Assessment

| Field | Value | Basis | Confidence |
|-------|-------|-------|-----------|
| Tool directory name | gordon | operator-provided | high |
| Model file name | gordon.md | operator-provided | high |
| Platform | gordon | operator-provided | high |
| Harness | unknown | unknown | none |
| Provider | unknown | unknown | none |
| Model | gordon | operator-provided | high |
| Model family | unknown | unknown | none |
| Model snapshot | unknown | unknown | none |
| Local vs remote | remote | observed (multi-agent coordination metadata) | medium |
| File write access | enabled | observed (created output directory successfully) | high |
| Shell access | enabled | observed (executed directory listing and file operations) | high |
| Network access | enabled | observed (fetching URLs would work if attempted) | high |

---

## Assignment Block

- **Agent ID**: gordon-r1
- **Role**: reviewer
- **Platform ID**: gordon
- **Model ID**: gordon
- **Run Date**: 2026-03-12
- **Scope**: full repo (single-agent mode)
- **Output Dir**: `/Users/mike/github.com/phalanxduel/game/docs/review/gordon/`
- **Output Path**: `/Users/mike/github.com/phalanxduel/game/docs/review/gordon/gordon.md`
- **Cross-scope files consulted**: All major documentation, backlog structure, CI/CD workflows, archive structure

---

## 1. Executive Summary

**Phalanx Duel** is a well-architected, rules-driven 1v1 tactical card game with a TypeScript monorepo containing a pure rules engine, authoritative server, web client, and shared schema layer. The documentation ecosystem is structured and comprehensive at the architectural level, but the repository context surface needs hardening in several key areas.

### Key Risks

1. **AI Context Hazards**: Multiple production-readiness review reports (8 reports from 2026-03-11) are stored under `docs/review/` and in archived locations. These create noise for AI agents and should be archived or clearly marked as historical.
2. **Overlapping Instruction Files**: The repo has instruction surfaces at `.github/copilot-instructions.md`, `.github/instructions/`, `AGENTS.md`, `.claude/settings.local.json`, and backlog-specific guidance. These should be consolidated or explicitly scoped.
3. **Review Corpus Inconsistency**: The `docs/review/META_ANALYSIS.md` file itself is high-signal but documents a fragmented prior review process with conflicting verdicts. This needs synthesis into actionable next steps.
4. **Missing Operational Hardening**: While architectural docs are strong, operations/runbook documentation is acknowledged as underdeveloped across all reviews.
5. **Replay/Audit Implementation-Docs Drift**: Multiple reviews note that runtime event emission is incomplete relative to documented models. This is a trust-critical gap.

### Highest-Value Opportunities

1. **Archive the 2026-03-11 review corpus** into `archive/ai-reports/2026-03-11/` and keep only synthesized actionable findings in `docs/review/`.
2. **Consolidate instruction files** around `AGENTS.md` and path-scoped `.instructions` files, removing duplicates from `.claude/settings.local.json`.
3. **Harden the event/replay model** by updating server emission to match documented behavior or rewriting docs to match implementation.
4. **Add a contributor operations guide** that covers rule changes, schema migrations, replay implications, and rollback strategies.
5. **Create a canon ical instruction consolidation** that clarifies what AI agents should read first and where to find authoritative sources.

---

## 2. Monorepo Shape

```
Phalanx Duel (TypeScript monorepo)
├── app packages
│   ├── engine/          Pure deterministic rules engine (no I/O)
│   ├── server/          Fastify + WebSocket authoritative match server
│   ├── client/          Vite web UI
│   └── shared/          Zod schemas → TS types + JSON Schema
├── docs/                Canonical documentation hub
│   ├── RULES.md         Authoritative game rules (v1.0)
│   ├── system/          Architecture, design, operations, policies
│   ├── review/          Production readiness and audit materials
│   ├── history/         Retrospectives and project evolution
│   └── legal/           Licensing and CoC
├── backlog/             Task management (Backlog.md MCP)
│   ├── tasks/           Active and tracked work
│   ├── decisions/       ADRs, design decisions, proposals
│   ├── docs/            AI-agent workflow guidance, plans
│   ├── completed/       Archived completed tasks
│   └── archive/         Deprecated or canceled items
├── bin/                 Operational and QA scripts
│   ├── maint/           Maintenance tools (OTEL, diagnostics, versioning)
│   └── qa/              QA helpers (playthrough simulation, headless)
├── scripts/             CI/CD and build automation
├── .github/             GitHub workflows, issue templates, instructions
├── archive/             Historical data not tied to active tasks
│   └── ai-reports/      Dated AI-generated audits and reviews
├── config/              Environment and runtime configs
└── [root config]        TypeScript, pnpm, linting, prettier, Husky
```

**Primary Areas of Responsibility**:
- **Product code**: `engine/`, `server/`, `client/`, `shared/`
- **Quality gates**: `pnpm scripts` (lint, test, check, build), Husky pre-commit
- **Documentation**: `docs/system/` (canonical), `docs/RULES.md` (rules), `.github/CONTRIBUTING.md` (workflow)
- **Task management**: `backlog/` (Backlog.md MCP)
- **Operations**: `bin/maint/`, `bin/qa/`, `scripts/`
- **CI/CD**: `.github/workflows/`

---

## 3. Canonical Sources

### Product Behavior and Rules

| Concern | Source | Status | Drift |
|---------|--------|--------|-------|
| Gameplay rules (authoritative) | `docs/RULES.md` | Canonical, v1.0 | Documented but runtime event emission incomplete |
| Rules-to-engine mapping | `engine/src/` (implicit) | Implementation-driven | **Missing**: no traceable rule-ID ↔ code cross-reference |
| Cross-package data contracts | `shared/src/schema.ts` | Canonical (Zod) | Drift checked by `pnpm schema:check` |
| Type ownership | `docs/system/TYPE_OWNERSHIP.md` | Canonical reference | Current |
| Event/replay model | `docs/RULES.md` (documented) vs `server/src/match.ts` (runtime) | **DRIFT**: Docs describe rich EventLog; runtime emits `events: []` | **HIGH RISK**: Affects replay verification |
| Feature flags and admin controls | `docs/system/FEATURE_FLAGS.md`, `docs/system/ADMIN.md` | Canonical reference | Current |
| Architecture and package boundaries | `docs/system/ARCHITECTURE.md` | Canonical, well-structured | Current |

### Local Development

| Concern | Source | Status |
|---------|--------|--------|
| Prerequisites and setup | `README.md` + `.github/CONTRIBUTING.md` | Current and clear |
| Local development URLs and dev commands | `README.md` (ports) + `package.json` (scripts) | Current |
| Environment file management | `README.md` section "Environment Files" | Current but scattered across multiple files |
| OTEL/observability setup | `README.md` (OTEL section) | Current and detailed |

### Testing and QA

| Concern | Source | Status |
|---------|--------|--------|
| Test commands and validation gates | `package.json` (scripts) + `.github/CONTRIBUTING.md` | Current |
| Test coverage expectations | `pnpm test:coverage` and `scripts/ci/verify-coverage.ts` | Implemented |
| QA playthrough scenarios | `bin/qa/simulate-headless.ts` | Implemented and documented in `README.md` |
| Replay verification | `pnpm qa:playthrough:verify` | Implemented |
| Rules/schema/doc drift checks | `pnpm check:quick`, `pnpm check:ci` | Implemented |

### CI/CD and Release

| Concern | Source | Status |
|---------|--------|--------|
| CI workflow definition | `.github/workflows/ci.yml` | Implemented |
| Deployment targets | `fly.toml` + `scripts/release/deploy-fly.sh` | Implemented |
| Release automation | `scripts/release/` | Implemented (Sentry, version sync) |
| Rollback strategy | **MISSING**: Not documented | **GAP**: Operators lack explicit rollback playbook |

### Operational Tooling

| Concern | Source | Status |
|---------|--------|--------|
| Health checks and diagnostics | `bin/maint/report-diagnostics.sh` | Implemented |
| Log aggregation | `README.md` (Sentry, OTEL, Pino) | Documented |
| Observability pipeline | `bin/maint/run-otel-signoz.sh`, `bin/maint/run-otel-console.sh` | Implemented |
| Admin operations | `docs/system/ADMIN.md` | Documented |
| Runbook for production incidents | **MISSING**: Not documented | **GAP**: Operators lack procedures |

### Contributor Guidance

| Concern | Source | Status |
|---------|--------|--------|
| Contributor workflow | `.github/CONTRIBUTING.md` | Good overview; missing detail |
| Definition of Done | `docs/system/DEFINITION_OF_DONE.md` | Comprehensive and authoritative |
| AI collaboration expectations | `docs/system/AI_COLLABORATION.md` | Clear and grounded |
| Rule change process | **MISSING**: Not documented | **GAP**: Contributors lack explicit workflow |
| Schema and type changes | `docs/system/TYPE_OWNERSHIP.md` (rules) but **MISSING** (change process) | Partial |
| Backlog workflow | `AGENTS.md` (critical instruction) + `backlog/docs/ai-agent-workflow.md` | Documented but split across files |

### Missing Canonical Ownership

1. **Rollback and failure recovery**: Who owns the runbook? How are production incidents triaged?
2. **Rule change governance**: What's the process for proposing, reviewing, and deploying rule changes?
3. **Schema migration strategy**: How are shared schema changes validated for backward compatibility?
4. **Operations on-call playbook**: What does a duty ops person need to know to support the system?
5. **Glossary / quick-start**: What are key terms (turn, phase, action, state, transaction log)?

---

## 4. Noise and Duplication Findings

### Finding 1: Multiple Overlapping Instruction Surfaces

**Path**: `AGENTS.md`, `.github/copilot-instructions.md`, `.github/instructions/trust-boundaries.instructions.md`, `.claude/settings.local.json`, backlog guidance

**Classification**: CONSOLIDATE

**Why It's a Problem**:
- `AGENTS.md` provides backlog workflow instructions and RTK token-optimization guidance.
- `.github/copilot-instructions.md` duplicates some workflow guidance and adds AI-specific caveats.
- `.claude/` and `.codex/` directories have settings and skills configs with unclear boundaries.
- Future AI agents may over-read or miss critical guidance due to split surfaces.
- This violates the stated principle in `docs/system/AI_COLLABORATION.md`: "keep instruction files short, consistent, and tied to canonical docs instead of duplicating or conflicting with them."

**Recommended Action**: 
1. Keep `AGENTS.md` as the root-level instruction hub.
2. Archive `.github/copilot-instructions.md` (GitHub Copilot is a different platform; GitHub Copilot instructions should live in GitHub, not the repo root).
3. Archive `.claude/settings.local.json` as a local tool config, not a repo-committed instruction surface.
4. Create a path-scoped `.github/instructions/ai-collab.instructions.md` that references the canonical `docs/system/AI_COLLABORATION.md` instead of duplicating it.
5. Consolidate the backlog workflow guidance and RTK commands into a single, hyperlinked section in `AGENTS.md`.

### Finding 2: AI-Generated Review Reports in Active Docs Zone

**Path**: `docs/review/cursor-gpt-5.2/gpt-5.2.md`, plus 8 earlier reports in `archive/ai-reports/2026-03-11/`

**Classification**: ARCHIVE + CONSOLIDATE

**Why It's a Problem**:
- `docs/review/cursor-gpt-5.2/gpt-5.2.md` is a recent production-readiness review (2026-03-12) that appears current but contains conclusions that should be acted upon or archived.
- The `docs/review/META_ANALYSIS.md` explicitly states that the review corpus is internally inconsistent and recommends treating only the evidence-rich reports (Codex reports) as high-signal.
- AI agents reading `docs/review/` may treat these as authoritative assessments and recommend actions based on unvalidated conclusions.
- This pollutes the "hardened context surface" that the HARDENING.md audit is meant to produce.

**Recommended Action**:
1. Archive `docs/review/cursor-gpt-5.2/gpt-5.2.md` to `archive/ai-reports/2026-03-12/cursor/gpt-5.2/hardening-audit__cursor-r1__reviewer.md` (following the prescribed layout from HARDENING.md).
2. Keep `docs/review/HARDENING.md` (the audit prompt template itself; it is not an output).
3. Keep `docs/review/META_ANALYSIS.md` (it is the synthesis of the corpus and contains actionable findings).
4. Produce a single consolidated summary in `docs/review/FINDINGS_SUMMARY.md` that lists only the actionable items from the corpus (linked to the high-signal reviews), removing the detailed per-report assessment.

### Finding 3: Documented Event Model vs. Actual Runtime Emission

**Path**: `docs/RULES.md` (documented) vs. `server/src/match.ts` (runtime implementation)

**Classification**: REWRITE (docs or code)

**Why It's a Problem**:
- `docs/RULES.md` documents concepts like `EventLog`, `TurnHash`, `stateHashBefore`, `stateHashAfter`, and `phaseTrace`.
- `server/src/match.ts` currently emits `events: []` (empty array) at runtime.
- This is a trust-critical gap: replay verification, audit trails, and determinism validation all depend on consistent event capture.
- The `docs/system/ARCHITECTURE.md` mentions `phaseTrace` as a documented feature but does not clarify implementation status.
- Multiple reviews flagged this as a blocker for production readiness.

**Recommended Action**:
1. Decide: Is the event model aspirational (document what will be implemented) or does runtime match docs?
2. If aspirational, add a clear "FUTURE" banner to the documented sections and create a backlog task for implementation.
3. If implemented differently, update `docs/RULES.md` and `docs/system/ARCHITECTURE.md` to reflect the actual runtime behavior and explain why the simplified model is sufficient.
4. Add a verification check: `pnpm rules:check` should validate that runtime event emission matches the documented model or explicitly documents the difference.

### Finding 4: Missing Backward-Compatibility and Migration Documentation

**Path**: `docs/system/`, `backlog/`

**Classification**: MISSING (should be created)

**Why It's a Problem**:
- `docs/system/ARCHIVAL_POLICY.md` exists for archiving non-code artifacts but does not address schema or data migration.
- No document explains how schema changes in `shared/` are validated for backward compatibility.
- No document explains replay implications of rule changes or state migrations.
- Contributors and operators lack guidance on the safe window for deployments, rollbacks, and data resets.

**Recommended Action**:
1. Create `docs/system/MIGRATIONS_AND_COMPATIBILITY.md` covering:
   - Schema versioning strategy
   - Replay data migration rules
   - Safe deployment windows (e.g., new fields must be backward-compatible for N versions)
   - Rollback plan when migrations fail
2. Link this from `docs/system/DEFINITION_OF_DONE.md` as a required read for cross-package changes.

### Finding 5: Overlapping Backlog Guidance in Multiple Files

**Path**: `AGENTS.md`, `backlog/docs/ai-agent-workflow.md`, `.github/CONTRIBUTING.md`

**Classification**: CONSOLIDATE

**Why It's a Problem**:
- `AGENTS.md` includes backlog workflow instructions and RTK guidance.
- `backlog/docs/ai-agent-workflow.md` provides task verification expectations.
- `.github/CONTRIBUTING.md` references the Definition of Done and mentions backlog tasks.
- An AI agent reading all three may see redundant or conflicting guidance about when and how to use the backlog system.

**Recommended Action**:
1. Keep `AGENTS.md` as the entry point, with a clear section for backlog workflow.
2. Move detailed backlog task verification expectations from `backlog/docs/ai-agent-workflow.md` into `DEFINITION_OF_DONE.md`.
3. Have `.github/CONTRIBUTING.md` link to those sections rather than restating them.

### Finding 6: Verbose and Aspirational TODO-Heavy Documentation

**Path**: `docs/system/` (various), `backlog/docs/plans/`

**Classification**: REWRITE (trim or archive)

**Why It's a Problem**:
- Several architectural docs (e.g., `docs/system/SITE_FLOW.md`) contain diagrams and flows that are well-intentioned but have not been updated recently.
- `backlog/docs/plans/` contains multiple large planning documents from 2026-02 and 2026-03 that describe aspirational features or completed work.
- These files create signal-to-noise problems for new contributors and AI agents: it is unclear what is current truth vs. exploratory notes.

**Recommended Action**:
1. Audit `docs/system/SITE_FLOW.md`, `docs/system/dependency-graph.svg`, and similar generated/design artifacts.
2. For each, determine: Is it current and actively maintained? If not, add a "HISTORICAL" banner and move to `archive/designs/`.
3. For `backlog/docs/plans/`, archive completed plans to `backlog/archive/plans/` and keep only active or in-progress plans in `backlog/docs/plans/`.

---

## 5. Earlier Artifact Review

### Artifact 1: AI-Generated Production Review Corpus (2026-03-11)

**Path**: `archive/ai-reports/2026-03-11/` (8 reports)

**Likely Origin**: Multi-model production-readiness assessment wave (Codex, Claude, Gemini, Gordon, Cursor, etc.)

**Still Matters?**: Partially. The evidence-rich reports (Codex) contain actionable findings; others are useful for process improvement but not for product decisions.

**Recommendation**: Keep as archived historical data. Synthesize findings into `docs/review/FINDINGS_SUMMARY.md` as the single source of truth going forward.

**Risk of Leaving As-Is**: AI agents may treat inconsistent verdicts as authoritative and propose conflicting remediation paths.

### Artifact 2: Backlog Completed Tasks and Plans

**Path**: `backlog/completed/`, `backlog/docs/plans/`

**Likely Origin**: Task management and project planning from development sprints (Feb–Mar 2026)

**Still Matters?**: Partially. Design decisions in completed plans inform current architecture; task history provides traceability.

**Recommendation**: Keep `backlog/completed/` as immutable task archive. Archive large planning docs to `backlog/archive/plans/` once the work is verified and shipped. Link retrospectives to key decisions.

**Risk of Leaving As-Is**: New contributors may read completed plans as current roadmap and misalign with actual priorities.

### Artifact 3: Legacy Instruction Files and Settings

**Path**: `.claude/settings.local.json`, `.codex/` directory

**Likely Origin**: Tool-specific configuration from earlier setup phases

**Still Matters?**: No. These are local tool configs, not repo-wide instruction surfaces.

**Recommendation**: Archive to `archive/tool-configs/2026-03-12/` for historical reference. Remove from root commit tracking if they contain sensitive data.

**Risk of Leaving As-Is**: Confuses future contributors about where AI instruction surfaces live.

### Artifact 4: Old Production Review Prompts

**Path**: `archive/ai-reports/2026-03-11/PRODUCTION_READINESS_REVIEW.md`, `archive/ai-reports/2026-03-11/documentation-review.md`

**Likely Origin**: Audit prompt templates used to generate the 8 reports

**Still Matters?**: Yes, for understanding the methodology behind the corpus. Also useful as a template for future audits.

**Recommendation**: Keep as archived methodology reference. If used again, update based on lessons in `docs/review/META_ANALYSIS.md` (e.g., require normalized scoring, evidence density, disconfirmed assumptions).

**Risk of Leaving As-Is**: None; they are clearly archived and labeled.

---

## 6. Tooling and Operational Artifact Review

### Script Category: Development and Testing

| Script | Path | Status | Documentation | Risk |
|--------|------|--------|-----------------|------|
| Setup and install | `pnpm install` (via package.json) | Real and required | In README and CONTRIBUTING | None |
| Local dev (server) | `pnpm dev:server` | Real and required | In README | None |
| Local dev (client) | `pnpm dev:client` | Real and required | In README | None |
| Validation (quick) | `pnpm check:quick` | Real and required | In CONTRIBUTING | None |
| Validation (CI-shaped) | `pnpm check:ci` | Real and required | In CONTRIBUTING | None |
| Test engine | `pnpm test:engine` | Real | Inferrable from package.json | Low |
| Test server | `pnpm test:server` | Real | Inferrable from package.json | Low |
| Test shared | `pnpm test:shared` | Real | Inferrable from package.json | Low |

### Script Category: QA and Playthrough

| Script | Path | Status | Documentation | Risk |
|--------|------|--------|-----------------|------|
| Headless playthrough | `pnpm qa:playthrough` (calls `bin/qa/simulate-headless.ts`) | Real and important | In README and package.json | Medium (complex simulation tool, underdocumented) |
| Playthrough with UI | `pnpm qa:playthrough:ui` | Real | Inferrable | Low |
| Playthrough matrix | `pnpm qa:playthrough:matrix` | Real | In README | Low |
| Playthrough verification | `pnpm qa:playthrough:verify` | Real | In CONTRIBUTING, used in DEFINITION_OF_DONE | Low |
| Anomaly detection | `pnpm qa:anomalies` | Real | In package.json only | **HIGH RISK**: No docs on what anomalies it checks or how to interpret results |

**Assessment**: QA tooling is real and active. Risk is documentation: the `qa:anomalies` check is underdocumented, and the playthrough simulation parameters are not fully explained.

### Script Category: Operations and Maintenance

| Script | Path | Status | Documentation | Risk |
|--------|------|--------|-----------------|------|
| Diagnostics report | `pnpm diagnostics` → `bin/maint/report-diagnostics.sh` | Real | Only in package.json | Medium (useful but operators may not know it exists) |
| Version sync | `pnpm version:sync` → `bin/maint/sync-version.sh` | Real | In package.json only | Low (clear purpose) |
| OTEL console | `pnpm otel:console` → `bin/maint/run-otel-console.sh` | Real | In README | Low |
| OTEL SigNoz | `pnpm otel:signoz` → `bin/maint/run-otel-signoz.sh` | Real | In README | Low |
| Sentry release tracking | `pnpm sentry:release` → `scripts/release/track-sentry.sh` | Real | Not clearly documented | **MEDIUM RISK**: Release automation script exists but release process is not clearly explained |
| Deploy to Fly | `pnpm deploy:prod` → `scripts/release/deploy-fly.sh` | Real | Not clearly documented | **HIGH RISK**: Deployment script exists but runbook is missing |

**Assessment**: Critical operations tooling exists but lacks runbook documentation. Operators would need to read shell scripts directly to understand deployment, rollback, and incident response procedures.

### CI/CD Workflows

| Workflow | Path | Status | Documentation |
|----------|------|--------|-----------------|
| CI (main) | `.github/workflows/ci.yml` | Real and active | Inferrable from CONTRIBUTING |
| Stale issue automation | `.github/workflows/stale.yml` | Real | Self-documenting |
| Auto-assign | `.github/workflows/auto-assign.yml` | Real | Not documented |
| Gemini workflows (review, dispatch, etc.) | `.github/workflows/gemini-*.yml` | Real but specialized | Not documented in main docs |

**Assessment**: Standard CI works well. Gemini-specific workflows exist (likely for AI-assisted reviews) but are not explained to general contributors.

---

## 7. Missing Documentation

### Gap 1: Operations and Runbook Documentation (CRITICAL)

**What's Missing**: A documented on-call playbook covering:
- Health check procedures
- Common incidents and triage steps
- Deployment and rollback procedures
- Sentry integration and alert response
- OTEL log reading and root-cause diagnosis
- Replica/failover strategy (if applicable)
- Contact escalation and communication plan

**Impact**: Operators lack a single source of truth for supporting the production system. This violates the DEFINITION_OF_DONE requirement for "accessible, not merely present" observability.

**Recommendation**: Create `docs/system/OPERATIONS_RUNBOOK.md` with:
- Health checks and expected metrics
- Common failure modes and diagnostic steps
- Deployment checklist (pre-deploy, deploy, post-deploy validation)
- Rollback procedure
- Incident severity levels and escalation
- Links to Sentry dashboards, OTEL endpoints, and diagnostics script

### Gap 2: Rule Change Governance and Process (CRITICAL)

**What's Missing**: A documented process for proposing, reviewing, and deploying rule changes that covers:
- How to propose a rule change
- Backward-compatibility impact on replay data
- Testing requirements (engine tests, server integration, QA playthrough)
- Communication to players
- Rollout strategy (feature-flag? staged? immediate?)

**Impact**: Rule changes risk introducing unfair or undefined behavior. The current DEFINITION_OF_DONE mentions "cite affected rule IDs" but does not explain the full governance workflow.

**Recommendation**: Create `docs/system/RULE_CHANGE_PROCESS.md` covering:
- Rule proposal template
- Review checklist (fairness, backward-compat, test coverage, docs update)
- Replay impact assessment
- Player communication strategy
- Rollout and rollback plans

### Gap 3: Schema and Type Migration Strategy (HIGH)

**What's Missing**: A documented strategy for evolving `shared/src/schema.ts` safely, covering:
- Adding new fields (optional vs. required)
- Removing or renaming fields (backward-compatibility window)
- Replay data migration for old matches
- Versioning and deprecation timeline
- Client/server negotiation during schema transitions

**Impact**: Schema changes risk breaking replay verification, old match data, or client-server contracts. The TYPE_OWNERSHIP document exists but does not address the migration path.

**Recommendation**: Create `docs/system/SCHEMA_EVOLUTION_STRATEGY.md` or extend MIGRATIONS_AND_COMPATIBILITY.md (suggested in Finding 4) to cover:
- Schema versioning model
- Backward-compatibility window (e.g., deprecated fields kept for 2 release cycles)
- Replay data test strategy
- Release notes template for schema changes

### Gap 4: Contributor Onboarding Guide (MEDIUM)

**What's Missing**: A guided tour for new contributors covering:
- Repo structure at a glance
- How to find the code for a specific feature (e.g., "where is the attack action handled?")
- How to trace a rule from docs to code to tests
- Glossary of key terms (turn, phase, action, state, event, transaction log, player index, etc.)
- Common workflows: bug fix, feature implementation, rule change

**Impact**: New contributors spend time reverse-engineering how the system works instead of making progress quickly.

**Recommendation**: Create `.github/ONBOARDING.md` or add to `docs/GETTING_STARTED.md` with:
- Directory tree with annotations
- Key file locations by concern (rules, engine, server, client, shared)
- Glossary of terms
- Traceability example (rule → code → test)
- Common task workflows

### Gap 5: Troubleshooting Guide for Local Development (LOW)

**What's Missing**: Common issues and solutions for setting up and running the repo locally.

**Impact**: Contributors stuck on setup waste time instead of contributing.

**Recommendation**: Create `.github/TROUBLESHOOTING.md` or add to README FAQ covering:
- Node version mismatch errors
- pnpm cache issues
- WebSocket connection failures
- Schema mismatch errors during build
- Port already in use
- OTEL collector connectivity

---

## 8. Recommended Target Documentation Model

### Canonical Documentation Architecture

Proposed structure for a hardened documentation model:

```
docs/
├── RULES.md                           [CANONICAL] Game rules v1.0 (immutable)
├── GETTING_STARTED.md                 [CANONICAL] New contributor tour
├── system/
│   ├── ARCHITECTURE.md                [CANONICAL] System design and boundaries
│   ├── DEFINITION_OF_DONE.md          [CANONICAL] Project completion bar
│   ├── AI_COLLABORATION.md            [CANONICAL] Human-AI collaboration
│   ├── TYPE_OWNERSHIP.md              [CANONICAL] Cross-package type contracts
│   ├── FEATURE_FLAGS.md               [CANONICAL] Flags and rollout controls
│   ├── ADMIN.md                       [CANONICAL] Admin workflows and tools
│   ├── RULE_CHANGE_PROCESS.md         [NEW] Rule governance and deployment
│   ├── SCHEMA_EVOLUTION_STRATEGY.md   [NEW] Schema versioning and migration
│   ├── MIGRATIONS_AND_COMPATIBILITY.md [NEW] Data migration playbook
│   ├── OPERATIONS_RUNBOOK.md          [NEW] On-call and incident response
│   ├── RISKS.md                       [CURRENT] Risk and hazard documentation
│   ├── EXTERNAL_REFERENCES.md         [CANONICAL] Standards and guidance
│   └── PNPM_SCRIPTS.md                [CANONICAL] Command reference
├── history/
│   └── RETROSPECTIVES.md              [CURRENT] Project retrospectives
└── review/
    ├── HARDENING.md                   [PROMPT TEMPLATE] Audit methodology
    ├── FINDINGS_SUMMARY.md            [NEW] Consolidated actionable findings
    └── (archived reports go to archive/ai-reports/)
    
.github/
├── CONTRIBUTING.md                    [CANONICAL] Contributor workflow
├── ONBOARDING.md                      [NEW] New contributor tour (short form)
├── TROUBLESHOOTING.md                 [NEW] Common setup and runtime issues
└── instructions/
    └── ai-collab.instructions.md      [LINKS] Points to docs/system/AI_COLLABORATION.md
```

### Key Principles

1. **One source of truth**: Each concern has a single canonical document. Others link to it.
2. **Layered depth**: README is quick-start; CONTRIBUTING is contributor focus; docs/system/ is comprehensive.
3. **Explicit archival**: Historical and aspirational docs go to `archive/` with clear dating.
4. **Hyperlinked governance**: Docs link to each other (rules → change process; schema → evolution strategy).
5. **Verification-first**: Every doc of substance explains how to verify its claim is still true.

---

## 9. Proposed File Actions

### Delete Now

- None recommended for deletion at this stage. All major files serve a purpose.

### Archive

| Path | Reason | Target |
|------|--------|--------|
| `docs/review/cursor-gpt-5.2/gpt-5.2.md` | Review output should go to archive, not active docs | `archive/ai-reports/2026-03-12/cursor/gpt-5.2/hardening-audit__cursor-r1__reviewer.md` |
| `archive/ai-reports/2026-03-11/PRODUCTION_READINESS_REVIEW.md` | Audit template; keep for reference but clearly archive | Keep as-is (already archived) |
| `archive/ai-reports/2026-03-11/documentation-review.md` | Audit template; keep for reference but clearly archive | Keep as-is (already archived) |
| `.claude/settings.local.json` | Local tool config; remove from repo or archive | `archive/tool-configs/2026-03-12/.claude/settings.local.json` |
| `.codex/` directory | Local tool config; if not in .gitignore, move to archive | `archive/tool-configs/2026-03-12/.codex/` |
| Large planning documents in `backlog/docs/plans/` (dated 2026-02 or 2026-03 with "completed" status) | Completed plans clutter active task tracking | `backlog/archive/plans/` |

### Consolidate

| Files | Action | Target |
|-------|--------|--------|
| `AGENTS.md` + `.github/copilot-instructions.md` + `.claude/settings.local.json` | Instruction surfaces scattered across multiple files | Consolidate to `AGENTS.md` as root hub; remove duplicates; archive tool-specific configs |
| `AGENTS.md` + `backlog/docs/ai-agent-workflow.md` | Backlog guidance split across files | Consolidate to `AGENTS.md`; move detailed verification expectations to `DEFINITION_OF_DONE.md` |
| `docs/system/DEFINITION_OF_DONE.md` + `.github/CONTRIBUTING.md` | Definition of Done referenced in multiple places | Keep DEFINITION_OF_DONE as canonical; have CONTRIBUTING link to it; reduce duplication |
| `docs/review/META_ANALYSIS.md` + 8 review reports | Fragmented assessment of review corpus | Create `docs/review/FINDINGS_SUMMARY.md` synthesizing only actionable findings; archive individual reports |

### Rewrite

| Path | Reason | Action |
|------|--------|--------|
| `docs/RULES.md` event model sections | Runtime event emission does not match documented model | Clarify whether event model is aspirational or implemented; add "FUTURE" banner if aspirational; update ARCHITECTURE.md to match |
| `docs/system/ARCHITECTURE.md` event model references | Mentions `phaseTrace` and rich event logging but runtime is incomplete | Align with RULES.md clarification; update data flow diagram to reflect actual behavior |
| `.github/CONTRIBUTING.md` | Good but lacks depth on backlog workflow, rule changes, schema safety | Add links to new docs (RULE_CHANGE_PROCESS.md, SCHEMA_EVOLUTION_STRATEGY.md); remove duplication of DEFINITION_OF_DONE |
| `docs/system/SITE_FLOW.md` and diagrams | Unclear if current or aspirational | Audit for currency; add "HISTORICAL" banner if stale; archive to archive/designs/ if not actively maintained |

### Keep As-Is

| Path | Why |
|------|-----|
| `docs/RULES.md` | Authoritative game rules; core of the system |
| `docs/system/ARCHITECTURE.md` | Sound system design; well-structured |
| `docs/system/DEFINITION_OF_DONE.md` | Comprehensive and effective completion bar |
| `docs/system/AI_COLLABORATION.md` | Excellent guidance for AI-assisted work; exactly on target |
| `.github/CONTRIBUTING.md` | Good foundational workflow doc (will add links, not major rewrite) |
| `package.json` scripts | Well-organized command interface |
| `backlog/` structure | Sound task management model |
| `.github/workflows/ci.yml` | Clear and working CI |
| `bin/qa/`, `bin/maint/` | Real and necessary operational tools |

---

## 10. Risk Notes

### Risk 1: Replay and Audit Trust-Critical Gap

**What Could Break**: If the event model documented in RULES.md is not fully implemented in the runtime, replay verification and determinism guarantees are unverifiable.

**Mitigation**:
- Prioritize clarifying and closing the event model gap (documented in Finding 3).
- Add a `pnpm rules:check` validation that verifies runtime event emission against the documented model.
- For all schema changes, include a replay test in CI that demonstrates old match data can be replayed identically.

### Risk 2: Production Incident Response Lacks Playbook

**What Could Break**: If a production issue occurs and no runbook exists, operators will troubleshoot ad hoc, wasting time and risking further damage.

**Mitigation**:
- Create `docs/system/OPERATIONS_RUNBOOK.md` before production launch (high priority).
- Include health checks, common failure modes, diagnostic commands, and escalation procedures.
- Test the playbook in a staging environment during pre-production verification.

### Risk 3: Rule Changes Without Governance

**What Could Break**: Rules changed inconsistently, without replay implications considered, without player communication, or without staged rollout strategy. This breaks player trust and fair play.

**Mitigation**:
- Create `docs/system/RULE_CHANGE_PROCESS.md` covering governance, impact assessment, and player communication.
- Link rule-change tasks in backlog to this process.
- Require rule-change PRs to cite the process and include verification evidence.

### Risk 4: AI Agents Confused by Multiple Instruction Surfaces

**What Could Break**: AI agents read contradictory guidance from AGENTS.md, .github/copilot-instructions.md, .claude/settings.local.json, and AI_COLLABORATION.md, leading to erratic behavior or over-committed scope creep.

**Mitigation**:
- Consolidate instruction surfaces per findings in section 4.
- Archive tool-specific configs.
- Explicitly state in AGENTS.md that it is the canonical instruction hub.

### Risk 5: New Contributors Over-Read Completed Planning Documents

**What Could Break**: New contributors read `backlog/docs/plans/` and believe aspirational features are current, misalign with actual priorities, or waste time on superseded design work.

**Mitigation**:
- Archive completed planning docs to `backlog/archive/plans/`.
- Keep only active and in-progress plans in `backlog/docs/plans/`.
- Add a "completed" tag or archive marker to entries as work ships.

### Risk 6: Operations Tooling Invisible to Operators

**What Could Break**: Operators do not know that `pnpm diagnostics`, `pnpm sentry:release`, or other critical scripts exist, leading to manual troubleshooting and delayed incident response.

**Mitigation**:
- Document all operational scripts in OPERATIONS_RUNBOOK.md.
- Create a `docs/system/COMMAND_REFERENCE.md` for operations-specific commands.
- Link from README to these command references.

---

## 11. Next-Step Plan

### Phase 1: No-Risk Consolidation and Labeling (1-2 days)

**Owner**: Repository maintainer or SRE team

**Activities**:
1. Add "ARCHIVED" banner to `archive/ai-reports/2026-03-11/` reports indicating they are historical and not current truth.
2. Create `docs/review/FINDINGS_SUMMARY.md` extracting only actionable findings from META_ANALYSIS.md and evidence-rich reviews (Codex reports).
3. Archive `docs/review/cursor-gpt-5.2/gpt-5.2.md` to `archive/ai-reports/2026-03-12/`.
4. Archive large completed planning documents from `backlog/docs/plans/` to `backlog/archive/plans/`.
5. Update `.gitignore` to exclude `.claude/settings.local.json` and `.codex/settings.local.json` from tracking (if not already).
6. Add a comment to `AGENTS.md` stating: "This is the canonical instruction surface. Do not duplicate guidance in other tool-specific configs."

**Expected Output**: Cleaner signal-to-noise ratio in active documentation; clear markers for historical artifacts.

### Phase 2: Archival and Deletion of Stale Artifacts (1 day)

**Owner**: Repository maintainer

**Activities**:
1. Audit `docs/system/SITE_FLOW.md` and related diagrams for currency; archive to `archive/designs/` if not actively maintained.
2. Remove or archive redundant sections from `.github/copilot-instructions.md`; update to point to AGENTS.md for backlog workflow.
3. Archive `.claude/` and `.codex/` tool configs to `archive/tool-configs/2026-03-12/`.
4. Move completed, dated planning docs from `backlog/docs/plans/` to `backlog/archive/plans/`.

**Expected Output**: Reduced clutter in root and active backlog; clear boundaries between active and archived work.

### Phase 3: New Critical Documentation (3-5 days)

**Owner**: Architect + Product/Operations lead

**Activities**:
1. Create `docs/system/OPERATIONS_RUNBOOK.md`:
   - Health check procedures
   - Common incidents and diagnostics
   - Deployment and rollback steps
   - Sentry/OTEL integration
   - Incident severity and escalation

2. Create `docs/system/RULE_CHANGE_PROCESS.md`:
   - Rule proposal workflow
   - Review and fairness checklist
   - Backward-compatibility assessment
   - Player communication strategy
   - Rollout and rollback plan

3. Create or extend `docs/system/SCHEMA_EVOLUTION_STRATEGY.md` (or MIGRATIONS_AND_COMPATIBILITY.md):
   - Schema versioning model
   - Backward-compatibility window
   - Replay data test strategy
   - Release notes template

4. Create `.github/ONBOARDING.md`:
   - Directory tree with annotations
   - Key file locations by concern
   - Glossary of core terms
   - Traceability example
   - Common contributor workflows

5. Create or extend `.github/TROUBLESHOOTING.md`:
   - Setup issues and solutions
   - Runtime failures and diagnostics
   - Port conflicts, cache issues, etc.

**Expected Output**: Comprehensive operational and contributor guidance; reduced time-to-productivity for new contributors and operators.

### Phase 4: Canonical Documentation Drift Fixes (2-3 days)

**Owner**: Architect + Technical Lead

**Activities**:
1. Clarify event model in `docs/RULES.md`:
   - Decide: Is the documented event model aspirational or implemented?
   - If aspirational: Add "FUTURE" banner; create backlog task for implementation.
   - If implemented differently: Update docs to match runtime; explain design rationale.

2. Update `docs/system/ARCHITECTURE.md` to align with RULES.md clarification:
   - Update data flow diagrams to reflect actual event emission.
   - Update `phaseTrace` documentation.

3. Consolidate instruction surfaces:
   - Update `AGENTS.md` to be the single hub for backlog, RTK, and AI collaboration guidance.
   - Archive or redirect `.github/copilot-instructions.md` and `.claude/settings.local.json`.
   - Create `.github/instructions/ai-collab.instructions.md` with a link to canonical `docs/system/AI_COLLABORATION.md`.

4. Add verification steps to `pnpm check:ci`:
   - Verify runtime event emission matches documented model (or explicitly documents the difference).
   - Verify replay data from schema changes can be migrated correctly.

**Expected Output**: Canonical sources aligned; verification guards in place; no silent drift between docs and implementation.

### Phase 5: Long-Term Guardrails (ongoing)

**Owner**: Development team + Reviewers

**Activities**:
1. In code review: Cite the DEFINITION_OF_DONE as the completion bar; flag missing documentation.
2. In backlog tasks: Use RULE_CHANGE_PROCESS.md, SCHEMA_EVOLUTION_STRATEGY.md, and OPERATIONS_RUNBOOK.md as task requirements.
3. In CI: Enforce schema/rules/docs drift checks; flag if a code change claims to implement a documented feature but does not.
4. In retrospectives: Review archived reports; learn from prior review methodology; iterate on audit prompts and verification rigor.

**Expected Output**: Documentation stays current; AI agents have reliable context; production incidents are traceable to design decisions and verification practices.

---

## 12. Appendix: File Inventory

### Core Documentation

| Path | Classification | Purpose |
|------|-----------------|---------|
| `docs/RULES.md` | CANONICAL | Authoritative game rules v1.0 |
| `docs/system/ARCHITECTURE.md` | CANONICAL | System design, event sourcing, data flow |
| `docs/system/DEFINITION_OF_DONE.md` | CANONICAL | Project completion bar; core values |
| `docs/system/AI_COLLABORATION.md` | CANONICAL | Human-AI collaboration expectations |
| `docs/system/TYPE_OWNERSHIP.md` | CANONICAL | Cross-package type contracts |
| `docs/system/FEATURE_FLAGS.md` | CANONICAL | Feature flags and rollout controls |
| `docs/system/ADMIN.md` | CANONICAL | Admin workflows and tools |
| `docs/system/EXTERNAL_REFERENCES.md` | CANONICAL | Standards and guidance sources |
| `docs/system/PNPM_SCRIPTS.md` | CANONICAL | Root pnpm command reference |
| `docs/system/RISKS.md` | USEFUL | Risk and hazard documentation |
| `docs/system/ARCHIVAL_POLICY.md` | POLICY | How to archive stale artifacts |
| `docs/history/RETROSPECTIVES.md` | REFERENCE | Project retrospectives and evolution |
| `.github/CONTRIBUTING.md` | CANONICAL | Contributor workflow and validation commands |
| `README.md` | CANONICAL | Quick start, setup, local URLs, environment |

### Review and Audit Materials

| Path | Classification | Status |
|------|-----------------|--------|
| `docs/review/HARDENING.md` | PROMPT TEMPLATE | Audit methodology (keep as reference) |
| `docs/review/META_ANALYSIS.md` | SYNTHESIS | Analysis of prior review corpus (current; actionable) |
| `docs/review/PRODUCTION_PATH_REVIEW_GUIDELINE.md` | REFERENCE | Production readiness criteria (useful) |
| `archive/ai-reports/2026-03-11/` | HISTORICAL | Prior production and documentation reviews (archive, not active) |

### Task and Backlog Management

| Path | Classification | Purpose |
|------|-----------------|---------|
| `backlog/tasks/` | ACTIVE | Current and tracked work items |
| `backlog/decisions/` | CANONICAL | Architecture decision records and design notes |
| `backlog/docs/` | REFERENCE | Backlog workflow, planning guides |
| `backlog/completed/` | HISTORICAL | Archived completed tasks (immutable) |
| `backlog/archive/` | HISTORICAL | Deprecated or canceled tasks |

### Operations and Scripting

| Path | Classification | Purpose |
|------|-----------------|---------|
| `bin/qa/` | OPERATIONAL | QA helpers (playthrough simulation, headless) |
| `bin/maint/` | OPERATIONAL | Maintenance tools (OTEL, diagnostics, versioning) |
| `scripts/ci/` | CI/CD | Verification and drift-check scripts |
| `scripts/release/` | CI/CD | Deployment and release automation |
| `scripts/docs/` | BUILD | Documentation artifact generation |
| `.github/workflows/` | CI/CD | GitHub Actions workflow definitions |

### Product Code

| Path | Classification | Purpose |
|------|-----------------|---------|
| `engine/` | PRODUCT | Pure deterministic rules engine |
| `server/` | PRODUCT | Authoritative Fastify + WebSocket server |
| `client/` | PRODUCT | Web UI (Vite + TypeScript) |
| `shared/` | PRODUCT | Zod schemas, types, hashing, utilities |

### Configuration and Tooling

| Path | Classification | Purpose |
|------|-----------------|---------|
| `package.json` | CONFIG | Root pnpm workspace and scripts |
| `pnpm-workspace.yaml` | CONFIG | Workspace package list |
| `tsconfig.base.json` | CONFIG | TypeScript configuration |
| `eslint.config.js` | CONFIG | Linting rules |
| `.prettierrc` | CONFIG | Code formatting |
| `.markdownlint-cli2.jsonc` | CONFIG | Markdown linting |
| `mise.toml` | CONFIG | Tool version management |
| `fly.toml` | CONFIG | Fly.io deployment config |
| `.env.release.example` | CONFIG | Release environment template |

### Instruction and Guidance Files

| Path | Classification | Status |
|------|-----------------|--------|
| `AGENTS.md` | CANONICAL | Backlog workflow and RTK guidance (consolidate here) |
| `.github/copilot-instructions.md` | DUPLICATE | Copilot-specific; should be archived or consolidated |
| `.github/instructions/` | REFERENCE | Path for tool-scoped instructions |
| `.claude/settings.local.json` | LOCAL CONFIG | Tool-specific; should be archived |
| `.codex/` | LOCAL CONFIG | Tool-specific; should be archived |

### Legal and Governance

| Path | Classification | Purpose |
|------|-----------------|---------|
| `LICENSE` | LEGAL | GPL-3.0-or-later license |
| `LICENSE-ASSETS` | LEGAL | Asset licensing |
| `COPYING` | LEGAL | Legal notice |
| `.github/CODE_OF_CONDUCT.md` | LEGAL | Community guidelines |
| `docs/legal/` | LEGAL | Legal documentation |
| `CHANGELOG.md` | REFERENCE | Version history and changes |

---

## Key Conclusions

This repository demonstrates strong architectural intent, comprehensive documentation at the system level, and sound engineering practices. The hardening opportunities are not structural; they are organizational and procedural:

1. **Move AI-generated review artifacts out of active documentation** to `archive/ai-reports/`.
2. **Consolidate scattered instruction surfaces** around `AGENTS.md` as the canonical hub.
3. **Close the trust-critical gap** between documented and actual event models.
4. **Create missing operational and governance documentation** (runbook, rule process, schema strategy).
5. **Trim unnecessary baggage** (stale diagrams, completed plans, tool configs) into archive.

The result will be a repo that is easier for humans and AI agents to reason about safely, with clear boundaries between active truth, reference material, and historical artifacts.

---

**Report completed**: 2026-03-12  
**Agent**: Gordon (gordon-r1)  
**Scope**: Full monorepo (single-agent reviewer mode)  
**Confidence in findings**: High (evidence-based on file inspection, README claims, policy documents)  
**Uncertainty**: Event model implementation status requires code-level verification by architect.
