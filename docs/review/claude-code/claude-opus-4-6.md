# Repository Hardening Audit - Reviewer Report

## Runtime Declaration

### Operator-Provided Identity

```text
TOOL_DIR_NAME: <tool-directory-name>
MODEL_FILE_NAME: <model-file-name>.md
PLATFORM_ID: <tool-or-client-name>
HARNESS_ID: <runner-or-client-name-or-unknown>
PROVIDER_ID: <openai|anthropic|google|ollama|vllm|lmstudio|openrouter|other|unknown>
MODEL_ID: <model-name-without-.md>
MODEL_FAMILY: <family-or-unknown>
MODEL_SNAPSHOT: <snapshot-or-version-or-unknown>
LOCALITY: <local|remote|unknown>
API_BASE: <endpoint-or-unknown>
NETWORK_ACCESS: <enabled|disabled|unknown>
FILE_WRITE_ACCESS: <enabled|disabled|unknown>
SHELL_ACCESS: <enabled|disabled|unknown>
```

### Agent Runtime Assessment

| Field | Value | Basis | Confidence |
|---|---|---|---|
| tool directory name | `claude-code` | observed | high |
| model file name | `claude-opus-4-6.md` | observed | high |
| platform | Claude Code (Anthropic CLI) | observed | high |
| harness | Claude Code CLI | observed | high |
| provider | Anthropic | observed | high |
| model | claude-opus-4-6 | observed | high |
| model family | Claude 4.x (Opus) | observed | high |
| model snapshot | claude-opus-4-6 | observed | high |
| local vs remote | remote (API call to Anthropic) | best-faith-estimate | high |
| file write access | enabled | observed | high |
| shell access | enabled | observed | high |
| network access | enabled (MCP servers active, web tools available) | observed | high |

Notes:
- Operator-provided identity fields used placeholder tags (`<tool-directory-name>`, etc.) and were not filled in. All values above were derived from direct runtime observation: the system prompt identifies the model as `claude-opus-4-6`, the platform as Claude Code, and the provider as Anthropic.
- File write and shell access were confirmed by successful execution of `mkdir` and `ls` commands during this audit.

## Assignment Block

- **Agent ID**: claude-code-r1
- **Role**: reviewer
- **Platform ID**: claude-code
- **Model ID**: claude-opus-4-6
- **Run Date**: 2026-03-12
- **Scope**: Full repo (single-agent mode)
- **Output Dir**: `docs/review/claude-code/`
- **Output Path**: `docs/review/claude-code/claude-opus-4-6.md`
- **Cross-scope files consulted**: All directories and files in the monorepo (full-repo scope)

---

## 1. Executive Summary

Phalanx Duel is a well-structured TypeScript monorepo with strong architectural intent, comprehensive testing (336 tests), and mature governance documentation. The documentation-to-code ratio is healthy and the canonical source chain (RULES.md -> schema.ts -> engine -> server) is clear and CI-enforced.

**Main risks:**

1. **AI review report proliferation in `docs/review/`** -- 5+ AI-generated audit reports violate the repo's own ARCHIVAL_POLICY.md by sitting in `docs/review/` instead of `archive/ai-reports/`. This is the single largest source of context noise for AI agents.
2. **AGENTS.md / CLAUDE.md RTK duplication** -- identical RTK instructions exist in both files; CLAUDE.md is gitignored, AGENTS.md is committed. They will drift.
3. **Empty directories and stub files** -- `docs/plans/`, `docs/review/hardening/`, and a 0-byte stub file create false signals.
4. **CHANGELOG formatting defect** -- version 0.2.4-rev.8 has an empty "Fixed" section that runs into 0.3.0-rev.6 content.
5. **Backlog scale** -- 39+ tasks and 19 decision records; some older tasks may be stale or superseded.
6. **Multiple AI integration configs** -- `.codex/`, `.gemini/`, `.serena/`, `.claude/`, `.github/copilot-instructions.md`, `AGENTS.md` -- six separate AI agent configuration surfaces with potential for contradictory guidance.

**Highest-value cleanup opportunities:**

1. Move AI review reports from `docs/review/` to `archive/ai-reports/2026-03-12/` (enforces existing policy)
2. Delete empty directories and the 0-byte stub file
3. Consolidate RTK instructions into a single canonical location
4. Fix CHANGELOG formatting

---

## 2. Monorepo Shape

```text
phalanxduel/game/
  shared/          @phalanxduel/shared -- Zod schemas, types, hashing (~649 LOC)
  engine/          @phalanxduel/engine -- Pure deterministic rules engine (~1,721 LOC)
  server/          @phalanxduel/server -- Fastify + WebSocket server (~2,190 LOC)
  client/          @phalanxduel/client -- Vite + vanilla TS + Preact UI (~2,237 LOC)
  docs/            Canonical documentation hub
    RULES.md       Authoritative game rules v1.0
    system/        Architecture, governance, risks, types, scripts
    review/        Audit methodology + AI review reports (policy violation)
    history/       Retrospectives
    legal/         Governance, trademarks
    seo/           Robots/sitemap policy
  backlog/         Task management (Backlog.md MCP)
  archive/         Historical AI reports (2026-03-11)
  scripts/         CI verification, build, docs generation, release
  bin/             Operational scripts (QA, OTel, versioning)
  config/          OTel collector YAML configs
  .github/         CI workflows, templates, contributing, security
  [root configs]   ESLint, TypeScript, Prettier, dependency-cruiser, etc.
```

**Tech stack**: TypeScript 5.9.3, Node.js 24, pnpm 10.30.3, Fastify 5.8.2, Vite 7.3.1, Zod 4.3.6, Vitest 4.0.18, Drizzle ORM, Sentry, OpenTelemetry, Playwright. Deployed on Fly.io.

---

## 3. Canonical Sources

### Product behavior / rules

| Source | Path | Status |
|---|---|---|
| Game rules v1.0 | `docs/RULES.md` | Canonical, CI-enforced via `scripts/ci/verify-doc-fsm-consistency.ts` |
| Zod schemas | `shared/src/schema.ts` | Canonical data contract, generates types.ts and JSON schemas |
| Engine logic | `engine/src/turns.ts`, `combat.ts`, `state.ts` | Implementation of RULES.md |

### Architecture

| Source | Path | Status |
|---|---|---|
| System architecture | `docs/system/ARCHITECTURE.md` | Canonical, current |
| Type ownership | `docs/system/TYPE_OWNERSHIP.md` | Canonical, cross-referenced |
| Dependency graph | `docs/system/dependency-graph.svg` | Auto-generated, CI-verified |

### Local development

| Source | Path | Status |
|---|---|---|
| Quick start | `README.md` | Canonical, comprehensive |
| Contributor setup | `.github/CONTRIBUTING.md` | Canonical |
| Environment files | `README.md` "Environment Files" section | Canonical |
| pnpm scripts | `docs/system/PNPM_SCRIPTS.md` | Canonical reference |

### Testing / QA

| Source | Path | Status |
|---|---|---|
| Test commands | `docs/system/PNPM_SCRIPTS.md` | Canonical |
| QA playthrough | `bin/qa/simulate-headless.ts`, `simulate-ui.ts` | Working, documented in PNPM_SCRIPTS.md |
| Coverage thresholds | `*/vitest.config.ts` | CI-enforced |

### CI/CD / release

| Source | Path | Status |
|---|---|---|
| CI pipeline | `.github/workflows/ci.yml` | Canonical, operational |
| Deployment | `scripts/release/deploy-fly.sh` | Canonical, operational |
| Fly.io config | `fly.toml` | Canonical |
| Docker build | `Dockerfile` | Canonical |

### Operational tooling

| Source | Path | Status |
|---|---|---|
| OTel setup | `README.md` OTLP section + `config/otel/` | Canonical |
| Admin dashboard | `docs/system/ADMIN.md` | Canonical |
| Feature flags | `docs/system/FEATURE_FLAGS.md` | Canonical |
| Known risks | `docs/system/RISKS.md` | Canonical |

### Contributor guidance

| Source | Path | Status |
|---|---|---|
| Definition of Done | `docs/system/DEFINITION_OF_DONE.md` | Canonical |
| AI collaboration | `docs/system/AI_COLLABORATION.md` | Canonical |
| External references | `docs/system/EXTERNAL_REFERENCES.md` | Canonical |
| Security policy | `.github/SECURITY.md` | Canonical |
| PR template | `.github/PULL_REQUEST_TEMPLATE.md` | Canonical |

### Ambiguous or missing canonical ownership

| Area | Issue |
|---|---|
| RTK instructions | Duplicated between `AGENTS.md` (committed) and `CLAUDE.md` (gitignored). No single canonical source. |
| Archival policy enforcement | `docs/system/ARCHIVAL_POLICY.md` is clear but not enforced -- current AI reports violate it. |
| Backlog workflow | `AGENTS.md` references Backlog.md MCP but the actual backlog tool docs are in `.agents/skills/`. Multiple surfaces. |
| AI agent configuration | Six separate config surfaces (.claude/, .codex/, .gemini/, .serena/, copilot-instructions.md, AGENTS.md). No master coordination. |
| Glossary | Referenced in backlog (`doc-1 - GLOSSARY.md.md`) but does not exist. |

---

## 4. Noise and Duplication Findings

### 4.1 AI Review Reports in docs/review/ (Policy Violation)

| Path | Classification | Why it is a problem | Action |
|---|---|---|---|
| `docs/review/codex/gpt-5.md` | ARCHIVE | Violates ARCHIVAL_POLICY.md; adds ~454 LOC of AI-generated audit noise | Move to `archive/ai-reports/2026-03-12/codex/` |
| `docs/review/cursor/gpt-5.2.md` | ARCHIVE | Same violation; ~273 LOC | Move to `archive/ai-reports/2026-03-12/cursor/` |
| `docs/review/gordon/gordon.md` | ARCHIVE | Same violation; ~881 LOC (largest) | Move to `archive/ai-reports/2026-03-12/gordon/` |
| `docs/review/opencode/big-pickle.md` | ARCHIVE | Same violation; ~472 LOC | Move to `archive/ai-reports/2026-03-12/opencode/` |
| `docs/review/trae/Kimi-K2-0905.md` | ARCHIVE | Same violation; ~166 LOC | Move to `archive/ai-reports/2026-03-12/trae/` |

**AI context hazard**: These 5 reports total ~2,200+ LOC of redundant audit findings. Each covers the same repo from a different model. An AI agent scanning `docs/review/` would read all of them and face contradictory conclusions, wasting context and introducing confusion.

### 4.2 Empty Files and Directories

| Path | Classification | Why it is a problem | Action |
|---|---|---|---|
| `docs/review/cline-cli/arcee-ai-trinity-large-preview-free.md` | DELETE | 0-byte empty stub file from a failed/aborted audit run | Delete file |
| `docs/review/cline-cli/arcee-ai-trinity-large-preview-free/` | DELETE | Empty directory paired with empty stub | Delete directory |
| `docs/review/hardening/` | DELETE | Empty directory with no purpose | Delete |
| `docs/plans/` | DELETE | Empty directory; plans live in `backlog/docs/`; creates false expectation | Delete |

### 4.3 Duplicate Content

| Path | Classification | Why it is a problem | Action |
|---|---|---|---|
| `docs/api/media/TYPE_OWNERSHIP.md` | DELETE | Duplicate of `docs/system/TYPE_OWNERSHIP.md`; leftover from TypeDoc generation | Delete (canonical is in `docs/system/`). Note: `docs/api/` is now gitignored since commit `0b7ac3eb`, so this may already be untracked. Verify before acting. |

### 4.4 RTK Instruction Duplication

| Path | Classification | Why it is a problem | Action |
|---|---|---|---|
| `AGENTS.md` (RTK section) | CONSOLIDATE | Contains identical RTK instructions as `CLAUDE.md`; CLAUDE.md is gitignored so it is local-only; AGENTS.md is committed. Two copies will drift. Additionally, AGENTS.md meta section references "Codex" (`rtk discover` says "Analyze Codex sessions") and `~/.Codex/AGENTS.md` suggesting it was auto-generated by the RTK tool for a different platform. | Decide on one canonical RTK location |

### 4.5 CHANGELOG Formatting

| Path | Classification | Why it is a problem | Action |
|---|---|---|---|
| `CHANGELOG.md` | REWRITE | `[0.2.4-rev.8]` has empty "### Fixed" section; `[0.3.0-rev.6]` content follows without clear separation, creating ambiguity about which version the fixes belong to | Fix formatting |

### 4.6 Backlog Filename Conventions

| Path | Classification | Why it is a problem | Action |
|---|---|---|---|
| `backlog/docs/doc-1 - GLOSSARY.md.md` | NEEDS OWNER DECISION | Double `.md` extension; spaces in filename; the glossary itself does not exist yet | Rename or create the glossary |

---

## 5. Earlier Artifact Review

### 5.1 Archive (Properly Managed)

| Path | Origin/Purpose | Still matters? | Action | Risk if left |
|---|---|---|---|---|
| `archive/ai-reports/2026-03-11/` | 8 production readiness reports + 6 documentation audits from multiple AI models | Yes, as historical reference | KEEP | Low -- properly archived |
| `archive/ai-reports/README.md` | Archive manifest | Yes | KEEP | Low |
| `archive/ai-reports/2026-03-11/MANIFEST.md` | Report inventory | Yes | KEEP | Low |
| `archive/ai-reports/2026-03-11/PRODUCTION_READINESS_REVIEW.md` | Review prompt template | Yes, as methodology reference | KEEP | Low |
| `archive/ai-reports/2026-03-11/documentation-review.md` | Doc audit prompt template | Yes, as methodology reference | KEEP | Low |

### 5.2 Completed Backlog Items

| Path | Origin/Purpose | Still matters? | Action | Risk if left |
|---|---|---|---|---|
| `backlog/completed/task-4` through `task-9` | Completed tasks (ESLint fix, renderer decomp, client tests, framework eval, AI opponent, server hardening) | Historical reference only | KEEP (managed by backlog tool) | Low |
| `backlog/completed/docs/` | Completed documentation tasks | Historical reference | KEEP | Low |

### 5.3 Backlog Plans (Active)

| Path | Origin/Purpose | Still matters? | Action | Risk if left |
|---|---|---|---|---|
| `backlog/docs/PLAN - CODEBASE_HEALTH_RESTORATION.md` | Health restoration roadmap | Likely active | KEEP | Low |
| `backlog/docs/PLAN - configurable-grid-bot-status.md` | Bot feature status tracker | Active (feat/configurable-grid-bot branch) | KEEP | Low |
| `backlog/docs/PLAN - 2026-03-10 - otel-native-hybrid-plan.md` | OTel migration plan | Likely completed (OTel migration landed in recent commits) | NEEDS OWNER DECISION -- may be archivable | Medium -- could mislead agents into re-executing completed work |
| `backlog/docs/PLAN - 2026-03-11 - suppression-hardening-plan.md` | Suppression hardening | Likely active | KEEP | Low |
| `backlog/docs/PLAN - 2026-03-11 - type-deduplication-plan.md` | Type dedup plan | Active (referenced by TYPE_OWNERSHIP.md) | KEEP | Low |
| `backlog/docs/ai-agent-workflow.md` | Agent workflow documentation | Likely active | KEEP | Low |

### 5.4 Review Methodology Docs (Retained in docs/review/)

| Path | Origin/Purpose | Still matters? | Action | Risk if left |
|---|---|---|---|---|
| `docs/review/HARDENING.md` | Audit prompt/methodology for repo hardening | Yes -- this is the prompt driving the current audit | KEEP | Low |
| `docs/review/META_ANALYSIS.md` | Synthesis of 2026-03-11 review corpus | Yes -- highest-quality meta-analysis of AI reviews | KEEP | Low |
| `docs/review/PRODUCTION_PATH_REVIEW_GUIDELINE.md` | Refined review scope for production path | Yes -- active policy for future reviews | KEEP | Low |

### 5.5 History

| Path | Origin/Purpose | Still matters? | Action | Risk if left |
|---|---|---|---|---|
| `docs/history/RETROSPECTIVES.md` | Session lessons (relocated from .claude/) | Yes -- useful for understanding past decisions | KEEP | Low |

---

## 6. Tooling and Operational Artifact Review

### 6.1 CI Workflows (.github/workflows/)

| Tool | Status | Notes |
|---|---|---|
| `ci.yml` | Real, active, well-structured | Comprehensive pipeline: lint, typecheck, build, test, schema/rules/docs/format checks. Action SHAs pinned. |
| `auto-assign.yml` | Real, active | Auto-assigns issues to `just3ws` |
| `stale.yml` | Real, active | 30-day issue / 45-day PR staleness |
| `gemini-dispatch.yml` | Real, active | Event router for Gemini CLI integration |
| `gemini-invoke.yml` | Real, active | Gemini CLI execution with GitHub MCP |
| `gemini-review.yml` | Real, active | Gemini-powered PR review |
| `gemini-triage.yml` | Real, active | Gemini-powered issue triage |
| `gemini-scheduled-triage.yml` | Real, active | Scheduled triage (cron) |

**Observation**: 5 of 8 workflows are Gemini-specific. This is a significant investment in AI-native CI. No equivalent Claude or Copilot workflows exist -- the other AI integrations are config-only (`.claude/`, `.codex/`, `copilot-instructions.md`).

### 6.2 Scripts (scripts/)

| Script | Status | Notes |
|---|---|---|
| `scripts/ci/verify-schema.sh` | Real, CI-integrated | Validates schema artifacts are current |
| `scripts/ci/verify-coverage.ts` | Real, CI-integrated | Validates coverage thresholds |
| `scripts/ci/verify-doc-artifacts.sh` | Real, CI-integrated | Checks dependency graph and knip report |
| `scripts/ci/verify-doc-fsm-consistency.ts` | Real, CI-integrated | Rules.md to FSM consistency |
| `scripts/ci/verify-feature-flag-env.ts` | Real, CI-integrated | Feature flag validation |
| `scripts/ci/verify-playthrough-anomalies.ts` | Real, used by QA | Anomaly detection |
| `scripts/build/generate-docset.sh` | Real, underdocumented | Generates Dash.app docset |
| `scripts/build/resolve-source.ts` | Real, used by vitest configs | Source resolution for tests |
| `scripts/docs/render-dependency-graph.sh` + `.mjs` | Real, CI-integrated | SVG dependency graph |
| `scripts/docs/render-knip-report.sh` | Real, CI-integrated | Unused export report |
| `scripts/docs/render-site-flow.sh` | Real, CI-integrated | Site flow diagrams |
| `scripts/release/deploy-fly.sh` | Real, operational | Production deployment orchestrator |
| `scripts/release/deploy-fly-with-logs.sh` | Real, operational | Deploy variant with log streaming |
| `scripts/release/load-release-env.sh` | Real, operational | Sentry env loader |
| `scripts/release/track-sentry.sh` | Real, operational | Sentry release creation |

All scripts are real and actively used. No dead or dangerous scripts found.

### 6.3 Bin Scripts (bin/)

| Script | Status | Notes |
|---|---|---|
| `bin/maint/report-diagnostics.sh` | Real, documented | System diagnostic report |
| `bin/maint/run-otel-console.sh` | Real, documented in README | OTel console mode |
| `bin/maint/run-otel-signoz.sh` | Real, documented in README | OTel SigNoz forwarding |
| `bin/maint/sync-version.sh` | Real, used by deploy | Version synchronization |
| `bin/qa/bootstrap.zsh` | Real, documented | QA setup script |
| `bin/qa/simulate-headless.ts` | Real, CI-integrated | Headless game simulation |
| `bin/qa/simulate-ui.ts` | Real, documented | UI-driven QA via Playwright |

All bin scripts are real and actively used. The `bin/` vs `scripts/` split is intentional: `bin/` contains operational/QA tools, `scripts/` contains build/CI/release automation.

### 6.4 Configuration Files

| Config | Status | Notes |
|---|---|---|
| `eslint.config.js` | Real, active | Complexity ratcheting, module boundary enforcement |
| `.dependency-cruiser.json` | Real, active | Package isolation rules |
| `knip.json` | Real, active | Unused code detection |
| `.markdownlint-cli2.jsonc` | Real, active | Markdown linting rules |
| `.prettierrc` | Real, active | Code formatting |
| `.lintstagedrc` | Real, active | Pre-commit hooks (ESLint, Prettier, markdownlint, bash/zsh syntax) |
| `.husky/` | Real, active | pre-commit, pre-push, pre-merge-commit, post-merge hooks |
| `tsconfig.base.json` | Real, active | Strict TypeScript base config |
| `fly.toml` | Real, active | Fly.io deployment |
| `Dockerfile` | Real, active | Multi-stage production build |
| `config/otel/collector-console.yaml` | Real, documented | Local OTel debug |
| `config/otel/collector-signoz.yaml` | Real, documented | SigNoz forwarding |

### 6.5 Unclear or Low-Signal Files

| File | Status | Notes |
|---|---|---|
| `pyproject.toml` | Unclear | Python project config in a TypeScript monorepo. Purpose not documented. May be for a Python-based tool (rtk?) or linting. |
| `uv.lock` | Unclear | Python uv lockfile. Paired with pyproject.toml. |
| `.venv/` | Unclear | Python virtual environment. Gitignored. |
| `dashing.json` | Redundant | Dash.app docset config (254 bytes). Gitignored but present on disk. |
| `typedoc.json` | Low signal | TypeDoc config. docs/api/ is now gitignored, so TypeDoc output is not tracked. Config may still be needed for local generation. |
| `mise.toml` | Real but minimal | Tool version manager config. Only manages Node.js version. |
| `skills-lock.json` | Unclear | Skills manifest lock. Gitignored. Purpose tied to `.agents/skills/` system. |

---

## 7. Missing Documentation

| Missing Doc | Why it matters | Priority |
|---|---|---|
| **Glossary** | Referenced in backlog (`doc-1 - GLOSSARY.md.md`), multiple reviews request it. Would standardize terminology (e.g., "action" vs "intent", "turn" vs "phase", "transaction" vs "event"). | Medium |
| **Incident runbook** | Referenced in backlog (`task-25`). No documented procedure for stuck match recovery, database issues, or deployment rollback. | Medium |
| **Threat model** | Referenced in backlog (`task-29`). Trust boundaries documented in `.github/instructions/trust-boundaries.instructions.md` but no formal threat model exists. | Medium |
| **Versioning policy** | Referenced in backlog (`task-30`). SCHEMA_VERSION exists but the overall versioning strategy (API, spec, schema, package) is not documented. `sync-version.sh` handles mechanics but policy is implicit. | Low |
| **Performance targets / SLOs** | Referenced in backlog (`task-31`). No documented latency, availability, or resource targets. | Low |
| **AI agent coordination doc** | Six separate AI config surfaces exist with no master document explaining which tool uses which config, or how they should stay consistent. | Medium |

---

## 8. Recommended Target Documentation Model

A minimal, durable documentation architecture for this monorepo:

```text
README.md                              Quick start, workspace map, local dev, env files
CHANGELOG.md                           Version history (fix formatting)
AGENTS.md                              AI agent configuration (deduplicate RTK)

docs/
  RULES.md                             Canonical game rules v1.0 (keep as-is)
  system/
    ARCHITECTURE.md                    System design + package map
    DEFINITION_OF_DONE.md              Completion criteria
    AI_COLLABORATION.md                Human/AI expectations
    EXTERNAL_REFERENCES.md             Policy sources
    TYPE_OWNERSHIP.md                  Cross-package type governance
    RISKS.md                           Known operational hazards
    ADMIN.md                           Admin auth + A/B config
    FEATURE_FLAGS.md                   Feature flags catalog
    PNPM_SCRIPTS.md                    Script reference
    ARCHIVAL_POLICY.md                 Retention/archival rules
    KNIP_REPORT.md                     Auto-generated unused code report
    SITE_FLOW.md                       Auto-generated navigation flow
    [auto-generated SVGs/MMDs]         Dependency graph, site flow diagrams
  review/
    HARDENING.md                       Audit methodology (policy doc)
    META_ANALYSIS.md                   Review corpus synthesis
    PRODUCTION_PATH_REVIEW_GUIDELINE.md  Narrowed review scope
  history/
    RETROSPECTIVES.md                  Session lessons
  legal/
    GOVERNANCE.md                      Trademark governance
    TRADEMARKS.md                      IP restrictions
  seo/
    ROBOTS_ROUTE_SITEMAP.md            Crawling policy

.github/
  CONTRIBUTING.md                      Contributor setup + validation
  SECURITY.md                          Vulnerability reporting
  CODE_OF_CONDUCT.md                   Community guidelines
  PULL_REQUEST_TEMPLATE.md             PR template
  copilot-instructions.md              GitHub Copilot guidance
  instructions/trust-boundaries.instructions.md  Trust boundary rules

archive/
  ai-reports/                          All AI-generated reports, dated

backlog/                               Task management (Backlog.md MCP)
```

**Key principles:**
- `docs/review/` contains only methodology and policy docs, never AI-generated reports
- `archive/ai-reports/` is the only location for AI-generated audit output
- One canonical source per topic; cross-references, not repetition
- Auto-generated files are clearly labeled and CI-verified

---

## 9. Proposed File Actions

### Delete Now

| Path | Reason |
|---|---|
| `docs/review/cline-cli/arcee-ai-trinity-large-preview-free.md` | 0-byte empty stub |
| `docs/review/cline-cli/arcee-ai-trinity-large-preview-free/` | Empty directory |
| `docs/review/cline-cli/` | Empty after above deletions (unless other contents) |
| `docs/review/hardening/` | Empty directory, no purpose |
| `docs/plans/` | Empty directory; plans live in `backlog/docs/` |

### Archive

| Path | Destination | Reason |
|---|---|---|
| `docs/review/codex/gpt-5.md` | `archive/ai-reports/2026-03-12/codex/gpt-5.md` | Violates ARCHIVAL_POLICY.md |
| `docs/review/cursor/gpt-5.2.md` | `archive/ai-reports/2026-03-12/cursor/gpt-5.2.md` | Same |
| `docs/review/gordon/gordon.md` | `archive/ai-reports/2026-03-12/gordon/gordon.md` | Same |
| `docs/review/opencode/big-pickle.md` | `archive/ai-reports/2026-03-12/opencode/big-pickle.md` | Same |
| `docs/review/trae/Kimi-K2-0905.md` | `archive/ai-reports/2026-03-12/trae/Kimi-K2-0905.md` | Same |

After archiving, delete the now-empty `docs/review/{codex,cursor,gordon,opencode,trae}/` directories.

### Consolidate into Canonical Docs

| Path | Action | Reason |
|---|---|---|
| `AGENTS.md` RTK section | Deduplicate with CLAUDE.md; decide on one canonical location for RTK instructions | Currently identical content in two files; AGENTS.md references "Codex" (wrong platform context) |

### Rewrite Soon

| Path | Action | Reason |
|---|---|---|
| `CHANGELOG.md` | Fix formatting: add content under 0.2.4-rev.8 "Fixed" or remove the empty section; ensure clean separation between versions | Parsing ambiguity |

### Keep As-Is

| Path | Reason |
|---|---|
| `docs/RULES.md` | Canonical game rules, CI-enforced |
| `docs/system/*` (all 12+ files) | Well-structured governance and reference docs |
| `docs/review/HARDENING.md` | Active audit methodology |
| `docs/review/META_ANALYSIS.md` | Valuable meta-analysis |
| `docs/review/PRODUCTION_PATH_REVIEW_GUIDELINE.md` | Active review policy |
| `docs/history/RETROSPECTIVES.md` | Session lessons, properly located |
| `docs/legal/*` | IP/trademark policy |
| `docs/seo/*` | Crawling policy |
| `README.md` | Comprehensive, current |
| `.github/*` | CI, templates, contributing, security -- all active |
| `scripts/*` | All scripts are real and used |
| `bin/*` | All operational scripts are real and used |
| `config/otel/*` | Active OTel configs |
| `archive/ai-reports/2026-03-11/*` | Properly archived |
| `backlog/*` | Managed by Backlog.md MCP tool |
| All `package.json`, `tsconfig.json`, `vitest.config.ts` files | Active configs |
| `Dockerfile`, `fly.toml` | Active deployment |
| `eslint.config.js`, `.dependency-cruiser.json`, `knip.json` | Active quality gates |

### Needs Owner Decision

| Path | Question |
|---|---|
| `pyproject.toml` + `uv.lock` | What Python tooling is this for? Document purpose or remove if unused. |
| `typedoc.json` | Still needed now that `docs/api/` is gitignored? If only for local generation, document that. |
| `backlog/docs/PLAN - 2026-03-10 - otel-native-hybrid-plan.md` | OTel migration appears complete (committed Mar 10). Archive if done. |
| `backlog/docs/doc-1 - GLOSSARY.md.md` | Double `.md` extension. Create the actual glossary or rename. |
| AI agent config proliferation | Decide: which AI config surfaces are canonical? Should `.codex/`, `.gemini/`, `.serena/` be documented? |

---

## 10. Risk Notes

| Risk | Severity | Mitigation |
|---|---|---|
| **Deleting docs/review/ AI reports without archiving** | High | Always move to `archive/ai-reports/2026-03-12/` first; never delete without preserving |
| **RTK instruction deduplication breaking AI workflows** | Medium | Ensure whichever location is kept is accessible to all AI tools that need it |
| **Backlog task staleness** | Medium | Review tasks 1-23 for completion status; some (like PHX-AUTH-001, PHX-ELO-001, PHX-LEADER-001) may have been partially or fully implemented |
| **CHANGELOG rewrite changing git blame** | Low | Minor formatting fix; use a dedicated commit |
| **Removing docs/plans/ directory** | Low | No content to lose; plans are in `backlog/docs/` |
| **Removing empty dirs from docs/review/** | Low | No content to lose; but if other AI agents are currently running hardening audits targeting these dirs, coordinate timing |
| **backlog/ scale** | Medium | 39+ tasks and 19 decisions may overwhelm AI agents that read the full backlog. Consider archiving completed decisions or older tasks that are clearly superseded. |
| **Six AI config surfaces** | Medium | Without coordination, different AI tools may receive contradictory instructions. The RTK "Codex" reference in AGENTS.md is already an example of platform-specific content leaking into a shared config. |

---

## 11. Next-Step Plan

### Phase 1: No-Risk Consolidation and Labeling (Immediate)

**This scope owner can do:**

1. Delete empty directories: `docs/plans/`, `docs/review/hardening/`, `docs/review/cline-cli/`
2. Delete 0-byte stub: `docs/review/cline-cli/arcee-ai-trinity-large-preview-free.md`
3. Fix CHANGELOG.md formatting (empty "Fixed" section under 0.2.4-rev.8)
4. Move AI review reports from `docs/review/{codex,cursor,gordon,opencode,trae}/` to `archive/ai-reports/2026-03-12/`
5. Delete emptied `docs/review/` subdirectories after archiving

### Phase 2: Archival and Deletion of Stale Artifacts (Soon)

**This scope owner can do:**

1. Verify `docs/api/media/TYPE_OWNERSHIP.md` is untracked (docs/api/ is gitignored); if tracked, remove
2. Review `backlog/docs/PLAN - 2026-03-10 - otel-native-hybrid-plan.md` for archival (OTel migration appears complete)
3. Review backlog tasks 1-23 for staleness; archive completed items

**Repo owner must decide:**

1. Purpose of `pyproject.toml` + `uv.lock` + `.venv/` -- document or remove
2. Whether `typedoc.json` is still needed with docs/api/ gitignored

### Phase 3: Canonical Doc Rewrite / Tightening (Medium-Term)

**This scope owner can do:**

1. Consolidate RTK instructions: pick one canonical location (AGENTS.md or a dedicated RTK doc), update the other to reference it
2. Fix AGENTS.md RTK section references to "Codex" if this repo primarily uses Claude Code

**Repo owner must decide:**

1. Create GLOSSARY.md (backlog task exists)
2. Create incident runbook (backlog task exists)
3. Document AI agent configuration strategy across 6 surfaces
4. Decide which backlog decisions (DEC-OPEN-*) need resolution vs archival

### Phase 4: Guardrails to Prevent Noise from Returning (Long-Term)

**Recommended guardrails:**

1. **CI check**: Add a script that fails if AI-generated reports exist outside `archive/ai-reports/` -- enforces ARCHIVAL_POLICY.md automatically
2. **docs/review/ README**: Add a README to `docs/review/` explaining it contains only methodology docs, not AI outputs
3. **Backlog hygiene schedule**: Periodic review of task staleness (e.g., monthly); archive tasks older than 60 days with no activity
4. **AI config inventory**: Document which AI tools use which config files in a single reference doc
5. **Empty-directory prevention**: Add `.gitkeep` policy or CI check to prevent committing empty directories

---

## 12. Appendix: File Inventory

### Root Files

| Path | Classification |
|---|---|
| `README.md` | Canonical -- project overview and quick start |
| `CHANGELOG.md` | Canonical -- needs formatting fix |
| `AGENTS.md` | Canonical -- AI agent config; RTK section duplicated from CLAUDE.md |
| `CLAUDE.md` | Canonical (local only, gitignored) -- RTK instructions |
| `LICENSE` | Canonical -- GPL-3.0-or-later |
| `LICENSE-ASSETS` | Canonical -- asset licensing |
| `COPYING` | Canonical -- copyright notice |
| `Dockerfile` | Canonical -- multi-stage production build |
| `fly.toml` | Canonical -- Fly.io deployment |
| `package.json` | Canonical -- workspace root |
| `pnpm-workspace.yaml` | Canonical -- workspace packages |
| `pnpm-lock.yaml` | Canonical -- dependency lock |
| `eslint.config.js` | Canonical -- lint config with complexity ratcheting |
| `tsconfig.base.json` | Canonical -- TypeScript base config |
| `.dependency-cruiser.json` | Canonical -- module boundary enforcement |
| `.markdownlint-cli2.jsonc` | Canonical -- markdown lint rules |
| `.prettierrc` | Canonical -- formatting |
| `.prettierignore` | Canonical -- format exclusions |
| `.lintstagedrc` | Canonical -- pre-commit hooks |
| `.dockerignore` | Canonical -- Docker build exclusions |
| `.gitignore` | Canonical -- git exclusions |
| `knip.json` | Canonical -- unused code detection |
| `.env.release.example` | Canonical -- release env template |
| `mise.toml` | Canonical -- tool version manager |
| `pyproject.toml` | Unclear -- Python config in TS monorepo |
| `uv.lock` | Unclear -- Python lockfile |
| `typedoc.json` | Low signal -- docs/api/ is gitignored |
| `dashing.json` | Low signal -- gitignored |
| `skills-lock.json` | Low signal -- gitignored |

### Workspace Packages

| Path | Classification |
|---|---|
| `shared/` | Canonical -- Zod schemas, types, hashing |
| `engine/` | Canonical -- deterministic rules engine |
| `server/` | Canonical -- Fastify + WebSocket server |
| `client/` | Canonical -- Vite + Preact web UI |

### Documentation

| Path | Classification |
|---|---|
| `docs/RULES.md` | Canonical -- game rules v1.0 |
| `docs/system/ARCHITECTURE.md` | Canonical |
| `docs/system/DEFINITION_OF_DONE.md` | Canonical |
| `docs/system/AI_COLLABORATION.md` | Canonical |
| `docs/system/EXTERNAL_REFERENCES.md` | Canonical |
| `docs/system/TYPE_OWNERSHIP.md` | Canonical |
| `docs/system/RISKS.md` | Canonical |
| `docs/system/ADMIN.md` | Canonical |
| `docs/system/FEATURE_FLAGS.md` | Canonical |
| `docs/system/PNPM_SCRIPTS.md` | Canonical |
| `docs/system/ARCHIVAL_POLICY.md` | Canonical |
| `docs/system/KNIP_REPORT.md` | Auto-generated, CI-verified |
| `docs/system/SITE_FLOW.md` | Auto-generated, CI-verified |
| `docs/system/dependency-graph.svg` | Auto-generated, CI-verified |
| `docs/system/site-flow-*.mmd` + `.svg` | Auto-generated |
| `docs/review/HARDENING.md` | Canonical -- audit methodology |
| `docs/review/META_ANALYSIS.md` | Canonical -- review corpus synthesis |
| `docs/review/PRODUCTION_PATH_REVIEW_GUIDELINE.md` | Canonical -- review scope |
| `docs/review/{codex,cursor,gordon,opencode,trae}/*.md` | Archive -- AI reports violating ARCHIVAL_POLICY.md |
| `docs/review/cline-cli/arcee-ai-trinity-large-preview-free.md` | Delete -- 0-byte stub |
| `docs/review/hardening/` | Delete -- empty directory |
| `docs/plans/` | Delete -- empty directory |
| `docs/history/RETROSPECTIVES.md` | Canonical |
| `docs/legal/GOVERNANCE.md` | Canonical |
| `docs/legal/TRADEMARKS.md` | Canonical |
| `docs/seo/ROBOTS_ROUTE_SITEMAP.md` | Canonical |

### CI/CD and Tooling

| Path | Classification |
|---|---|
| `.github/workflows/ci.yml` | Canonical -- main CI pipeline |
| `.github/workflows/auto-assign.yml` | Canonical |
| `.github/workflows/stale.yml` | Canonical |
| `.github/workflows/gemini-*.yml` (5 files) | Canonical -- Gemini AI workflows |
| `.github/CONTRIBUTING.md` | Canonical |
| `.github/SECURITY.md` | Canonical |
| `.github/CODE_OF_CONDUCT.md` | Canonical |
| `.github/PULL_REQUEST_TEMPLATE.md` | Canonical |
| `.github/copilot-instructions.md` | Canonical |
| `.github/instructions/trust-boundaries.instructions.md` | Canonical |
| `.github/ISSUE_TEMPLATE/*.yml` | Canonical |
| `.github/commands/gemini-*.toml` | Canonical |
| `.github/FUNDING.yml` | Canonical |
| `scripts/ci/*` | Canonical -- CI verification |
| `scripts/build/*` | Canonical -- build tooling |
| `scripts/docs/*` | Canonical -- doc generation |
| `scripts/release/*` | Canonical -- deployment |
| `bin/maint/*` | Canonical -- operational scripts |
| `bin/qa/*` | Canonical -- QA automation |
| `config/otel/*` | Canonical -- OTel collector configs |
| `.husky/*` | Canonical -- git hooks |

### Backlog and Archive

| Path | Classification |
|---|---|
| `backlog/tasks/` (39+ files) | Active -- managed by Backlog.md MCP |
| `backlog/decisions/` (19 files + README) | Active -- architectural decisions |
| `backlog/completed/` | Historical -- completed tasks |
| `backlog/docs/` (7 files) | Active -- plans and workflow docs |
| `backlog/config.yml` | Canonical -- backlog tool config |
| `archive/ai-reports/2026-03-11/` | Archived -- properly managed |
| `archive/ai-reports/README.md` | Canonical -- archive manifest |
