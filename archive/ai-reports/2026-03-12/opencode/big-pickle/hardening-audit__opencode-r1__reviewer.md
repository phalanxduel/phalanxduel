# Repository Hardening Audit - Reviewer Report

## Assignment Block

- Agent ID: `opencode-reviewer-001`
- Role: `reviewer`
- Platform ID: `opencode`
- Model ID: `big-pickle`
- Run Date: `2026-03-12`
- Scope: `full repository`
- Output Dir: `/Users/mike/github.com/phalanxduel/game/docs/review/opencode/`
- Output Path: `/Users/mike/github.com/phalanxduel/game/docs/review/opencode/big-pickle.md`
- Cross-scope files consulted: N/A (single-agent full-repo review)

---

## Runtime Declaration

### Operator-Provided Identity

- TOOL_DIR_NAME: `opencode`
- MODEL_FILE_NAME: `big-pickle.md`
- PLATFORM_ID: `opencode`
- HARNESS_ID: `unknown`
- PROVIDER_ID: `unknown`
- MODEL_ID: `big-pickle`
- MODEL_FAMILY: `big-pickle`
- MODEL_SNAPSHOT: `unknown`
- LOCALITY: `unknown`
- API_BASE: `unknown`
- NETWORK_ACCESS: `enabled`
- FILE_WRITE_ACCESS: `enabled`
- SHELL_ACCESS: `enabled`

### Agent Runtime Assessment

| Field | Value | Basis | Confidence |
|-------|-------|-------|------------|
| tool directory name | `opencode` | operator-provided | high |
| model file name | `big-pickle.md` | operator-provided | high |
| platform | `opencode` | operator-provided | high |
| harness | `unknown` | unknown | none |
| provider | `unknown` | unknown | none |
| model | `big-pickle` | operator-provided | high |
| model family | `big-pickle` | operator-provided | high |
| model snapshot | `unknown` | unknown | none |
| local vs remote | `unknown` | unknown | none |
| file write access | `enabled` | observed | high |
| shell access | `enabled` | observed | high |
| network access | `enabled` | best-faith-estimate | medium |

---

## 1. Executive Summary

The Phalanx Duel monorepo is a well-structured TypeScript project implementing a tactical 1v1 card combat game with clear package boundaries (client, server, engine, shared). The repo demonstrates good hygiene in most areas but has several noise and duplication issues that reduce context quality for AI agents and human contributors.

**Primary Risks:**
- Documentation duplication between AGENTS.md and CLAUDE.md wastes context space
- Empty `docs/plans/` directory creates false expectation
- Generated API documentation (HTML) committed to repo bloats context
- Mixed historical audit reports creating confusion about canonical outputs

**Highest-Value Cleanup Opportunities:**
1. Consolidate AGENTS.md and CLAUDE.md RTK content
2. Remove empty `docs/plans/` directory
3. Consider removing or archiving generated `docs/api/` HTML files
4. Clarify output location conventions between `archive/ai-reports/` and `docs/review/`

---

## 2. Monorepo Shape

This is a TypeScript pnpm workspace monorepo implementing a card game with four primary packages:

| Package | Path | Purpose |
|---------|------|---------|
| `@phalanxduel/shared` | `shared/` | Zod schemas, JSON Schema, state hashing |
| `@phalanxduel/engine` | `engine/` | Pure deterministic game rules engine |
| `@phalanxduel/server` | `server/` | Fastify + WebSocket + OpenTelemetry match server |
| `@phalanxduel/client` | `client/` | Vite + TypeScript web UI |

**Top-Level Organization:**
- `bin/` - Operational scripts (QA simulation, OTEL, versioning)
- `scripts/` - Build and CI/CD automation
- `docs/` - Canonical documentation
- `backlog/` - Task management via Backlog.md
- `archive/` - Historical AI reports
- `.github/` - GitHub workflows, templates, contributing guidelines

---

## 3. Canonical Sources

### Product Behavior / Rules
- `docs/RULES.md` - **Canonical** game rules specification v1.0
- `engine/src/` - **Authoritative** implementation of rules

### Architecture
- `docs/system/ARCHITECTURE.md` - System design, event sourcing, data flow

### Local Development
- `README.md` - Quick start, environment setup, ports
- `.env.local`, `.env.release.example` - Environment templates
- `mise.toml` - Node.js version pinning

### Testing / QA
- `scripts/ci/verify-*.ts` - Verification scripts
- `bin/qa/simulate-headless.ts` - QA playthrough simulation

### CI/CD / Release
- `.github/workflows/` - GitHub Actions workflows
- `scripts/release/deploy-fly.sh` - Fly.io deployment
- `Dockerfile` - Container build

### Contributor Guidance
- `README.md` - Primary onboarding
- `.github/CONTRIBUTING.md` - Contributor setup and validation workflow
- `docs/system/AI_COLLABORATION.md` - Human/AI collaboration expectations
- `CLAUDE.md` / `AGENTS.md` - AI agent guidance (see duplication issue)

### Operational Tooling
- `bin/maint/run-otel-*.sh` - OTEL collection scripts
- `bin/maint/report-diagnostics.sh` - Diagnostic reporting

### Missing Canonical Declarations
- No single "monorepo map" document (README.md has partial coverage)
- No explicit test strategy document (scattered in package.json scripts)
- No formal archive policy (partially in `docs/system/ARCHIVAL_POLICY.md`)

---

## 4. Noise and Duplication Findings

### 4.1 Documentation Duplication

| Path | Classification | Problem | Recommended Action |
|------|---------------|---------|-------------------|
| `AGENTS.md` (lines 28-160) | DUPLICATE | Identical RTK instructions duplicated in CLAUDE.md; both files contain the same token-optimized commands section | CONSOLIDATE - Merge into single source, keep in CLAUDE.md (more commonly used by AI agents), remove from AGENTS.md |
| `CLAUDE.md` (lines 1-132) | DUPLICATE | See above - same RTK content | CONSOLIDATE |

**Evidence:** Both files contain `<!-- rtk-instructions v2 -->` blocks with identical content.

### 4.2 Empty / Stale Directories

| Path | Classification | Problem | Recommended Action |
|------|---------------|---------|-------------------|
| `docs/plans/` | DELETE | Empty directory since at least March 12, creates false expectation | DELETE |
| `docs/review/trae/` | NEEDS OWNER DECISION | Empty directory created but never used; indicates abandoned audit run | DELETE or document intent |

### 4.3 Generated Files in Repo

| Path | Classification | Problem | Recommended Action |
|------|---------------|---------|-------------------|
| `docs/api/**/*.html` | ARCHIVE | Generated TypeDoc HTML output (13,000+ lines total); should not be committed | ARCHIVE to archive/docs-api/ or generate at build time |
| `docs/api/**/*.css`, `docs/api/**/*.js` | ARCHIVE | Generated assets for TypeDoc | ARCHIVE as above |
| `.next/` | NEEDS OWNER DECISION | Next.js build artifacts (may be intentional for deployment) | Clarify in .gitignore or document |
| `*/dist/` (client, server, engine, shared) | NEEDS OWNER DECISION | Build output directories | Confirm .gitignore coverage |

### 4.4 AI Context Hazards

| Path | Classification | Problem | Recommended Action |
|------|---------------|---------|-------------------|
| `archive/ai-reports/` | NOISE | Multiple historical audit reports with inconsistent naming; risks confusing AI agents about current canonical outputs | CONSOLIDATE - Keep latest per platform/model, archive older |
| `docs/review/hardening/` | OBSOLETE | Hardening subdirectory may be leftover from older layout | Verify if still needed |

---

## 5. Earlier Artifact Review

### 5.1 AI Audit Reports

| Path | Likely Origin | Still Matters? | Risk if Left |
|------|---------------|----------------|--------------|
| `archive/ai-reports/2026-03-11/documentation-audit-*.json` | Previous AI documentation audits | No - superseded by current audit cycle | Medium - bloats context |
| `archive/ai-reports/2026-03-11/*/production-readiness-report.md` | Previous production readiness reviews | No - historical reference only | Low - useful for traceability |
| `docs/review/cursor-gpt-5.2/gpt-5.2.md` | Previous review run | Current - matches expected output location | None - proper placement |

### 5.2 Legacy Configurations

| Path | Likely Origin | Still Matters? | Risk if Left |
|------|---------------|----------------|--------------|
| `.serena/` | Serena IDE configuration | Low - personal/tool config | None if in .gitignore |
| `.idea/` | IntelliJ configuration | Low - personal/tool config | None if in .gitignore |
| `.playwright-mcp/` | MCP server config | Medium - indicates active tool | None |

---

## 6. Tooling and Operational Artifact Review

### 6.1 Dev Tools

| Tool | Status | Notes |
|------|--------|-------|
| `mise.toml` | REAL | Node.js version management - actively used |
| `package.json` scripts | REAL | Well-documented via `pnpm --help` |
| `knip.json` | REAL | Unused code detection - actively used |
| `.dependency-cruiser.json` | REAL | Dependency analysis - actively used |

### 6.2 QA Tools

| Tool | Status | Notes |
|------|--------|-------|
| `bin/qa/simulate-headless.ts` | REAL | QA playthrough simulation - actively used |
| `bin/qa/simulate-ui.ts` | REAL | UI simulation - actively used |
| `scripts/ci/verify-playthrough-anomalies.ts` | REAL | Anomaly detection - actively used |
| `scripts/ci/verify-feature-flag-env.ts` | REAL | Feature flag validation - actively used |

### 6.3 CI/CD

| Tool | Status | Notes |
|------|--------|-------|
| `.github/workflows/` | REAL | GitHub Actions - actively used |
| `Dockerfile` | REAL | Container build - actively used |
| `fly.toml` | REAL | Fly.io deployment config - actively used |

### 6.4 Documentation Scripts

| Tool | Status | Notes |
|------|--------|-------|
| `scripts/docs/render-dependency-graph.sh` | REAL | Generates dependency visualization |
| `scripts/docs/render-knip-report.sh` | REAL | Generates knip report |
| `typedoc.json` | REAL | API documentation generation |

### 6.5 Obsolete / Confusing

| Tool | Status | Notes |
|------|--------|-------|
| `dashing.json` | UNCLEAR | Unclear purpose - needs investigation |
| `docs/system/site-flow-*.mmd`, `docs/system/site-flow-*.svg` | LEGACY | Site flow diagrams - unclear if still relevant |

---

## 7. Missing Documentation

### 7.1 Needed

| Gap | Priority | Notes |
|-----|----------|-------|
| **Single monorepo map doc** | High | README has partial coverage but no dedicated document |
| **Archive policy** | Medium | `docs/system/ARCHIVAL_POLICY.md` exists but may be incomplete |
| **Test strategy** | Medium | No explicit test strategy document |
| **Package ownership** | Low | Clear from structure but could be documented |

### 7.2 Not Needed (Already Adequate)

- Environment setup - adequately covered in README.md and .env.example files
- CI/CD explanation - adequately covered in .github/workflows/ and scripts/
- Deployment docs - adequately covered in scripts/release/ and fly.toml

---

## 8. Recommended Target Documentation Model

### 8.1 Top-Level Docs (Keep)

| Document | Purpose | Keep? |
|----------|---------|-------|
| `README.md` | Primary onboarding, quick start | YES |
| `CLAUDE.md` | AI agent guidance (after consolidation) | YES |
| `docs/RULES.md` | Canonical game rules | YES |
| `LICENSE` | License terms | YES |
| `CHANGELOG.md` | Version history | YES |

### 8.2 docs/system/ (Consolidate)

| Document | Purpose | Action |
|----------|---------|--------|
| `ARCHITECTURE.md` | System design | KEEP |
| `AI_COLLABORATION.md` | Human/AI collaboration | KEEP |
| `DEFINITION_OF_DONE.md` | Completion criteria | KEEP |
| `PNPM_SCRIPTS.md` | Script reference | KEEP |
| `RISKS.md` | Risk assessment | KEEP |
| `ARCHIVAL_POLICY.md` | Archive rules | KEEP |
| `site-flow-*` | Legacy diagrams | ARCHIVE/DELETE |
| `dependency-graph.svg` | Generated, keep | KEEP (generated) |
| `KNIP_REPORT.md` | Generated, keep | KEEP (generated) |
| `TYPE_OWNERSHIP.md` | Type ownership | KEEP |

### 8.3 Structure Recommendation

```
docs/
├── RULES.md              # Canonical game rules
├── api/                  # GENERATED - remove from repo
├── system/               # Technical specifications
│   ├── ARCHITECTURE.md
│   ├── AI_COLLABORATION.md
│   ├── DEFINITION_OF_DONE.md
│   ├── PNPM_SCRIPTS.md
│   └── ...
├── review/               # Audit reports (current convention)
│   ├── HARDENING.md      # Audit methodology
│   ├── cursor-gpt-5.2/
│   └── opencode/
├── history/              # Retrospectives
│   └── RETROSPECTIVES.md
└── plans/                # DELETE - empty
```

---

## 9. Proposed File Actions

### Delete Now

- `docs/plans/` - Empty directory

### Archive

- `docs/api/**/*.html`, `docs/api/**/*.css`, `docs/api/**/*.js` - Generated TypeDoc output
- `archive/ai-reports/2026-03-11/*` - Older audit reports (keep latest per platform only after current cycle)
- `docs/system/site-flow-*.mmd`, `docs/system/site-flow-*.svg` - Legacy diagrams

### Consolidate into Canonical Docs

- Merge RTK content from `AGENTS.md` into `CLAUDE.md`, remove from `AGENTS.md`
- Relocate old audit JSON files to archive subdirectory

### Rewrite Soon

- `dashing.json` - Investigate and document or remove

### Keep As-Is

- All package source code (`client/`, `server/`, `engine/`, `shared/`)
- All CI/CD configuration (`.github/workflows/`, `Dockerfile`, `fly.toml`)
- All operational scripts (`bin/`, `scripts/`)
- Primary documentation (`README.md`, `docs/RULES.md`, `docs/system/*.md`)

---

## 10. Risk Notes

### High-Risk (Proceed with Caution)

1. **Generated API docs removal**: If `docs/api/` is removed, ensure `pnpm docs:build` still works and produces artifacts appropriately

### Medium-Risk

1. **Audit report consolidation**: Ensure current audit outputs are preserved; only archive clearly superseded reports
2. **CLAUDE.md/AGENTS.md merge**: Ensure no configuration relying on AGENTS.md specifically breaks

### Low-Risk

1. **Empty directories**: `docs/plans/` removal has no dependencies
2. **Legacy diagrams**: `site-flow-*` files appear unused

---

## 11. Next-Step Plan

### Phase 1: No-Risk Consolidation and Labeling (Do First)

1. [ ] Merge RTK instructions from `AGENTS.md` into `CLAUDE.md`, remove duplicate from `AGENTS.md`
2. [ ] Mark `docs/plans/` for deletion (empty)
3. [ ] Label `docs/api/` as generated in documentation

### Phase 2: Archival and Deletion of Stale Artifacts (Do Second)

1. [ ] Archive or remove `docs/api/` generated HTML files
2. [ ] Archive legacy site-flow diagrams
3. [ ] Consolidate older audit reports in `archive/ai-reports/`

### Phase 3: Canonical Doc Rewrite / Tightening (Do Third)

1. [ ] Create or enhance monorepo map document
2. [ ] Update `docs/system/ARCHIVAL_POLICY.md` with clear retention rules

### Phase 4: Guardrails to Prevent Noise (Do Fourth)

1. [ ] Add `docs/api/` to `.gitignore` or document why it's committed
2. [ ] Create guidance for where new documentation should live
3. [ ] Document expected audit output locations to prevent future confusion

---

## 12. Appendix: File Inventory

### Root Configuration

| Path | Classification |
|------|---------------|
| `package.json` | KEEP |
| `pnpm-workspace.yaml` | KEEP |
| `mise.toml` | KEEP |
| `tsconfig.base.json` | KEEP |
| `AGENTS.md` | CONSOLIDATE |
| `CLAUDE.md` | KEEP (after merge) |
| `README.md` | KEEP |
| `CHANGELOG.md` | KEEP |
| `LICENSE` | KEEP |
| `Dockerfile` | KEEP |
| `fly.toml` | KEEP |
| `dashing.json` | NEEDS OWNER DECISION |
| `knip.json` | KEEP |
| `eslint.config.js` | KEEP |
| `.env*` | KEEP |
| `.gitignore` | KEEP |

### Source Packages

| Path | Classification |
|------|---------------|
| `client/` | KEEP |
| `server/` | KEEP |
| `engine/` | KEEP |
| `shared/` | KEEP |

### Documentation

| Path | Classification |
|------|---------------|
| `docs/RULES.md` | KEEP |
| `docs/api/` | ARCHIVE |
| `docs/system/ARCHITECTURE.md` | KEEP |
| `docs/system/AI_COLLABORATION.md` | KEEP |
| `docs/system/DEFINITION_OF_DONE.md` | KEEP |
| `docs/system/PNPM_SCRIPTS.md` | KEEP |
| `docs/system/RISKS.md` | KEEP |
| `docs/system/EXTERNAL_REFERENCES.md` | KEEP |
| `docs/system/TYPE_OWNERSHIP.md` | KEEP |
| `docs/system/site-flow-*` | ARCHIVE |
| `docs/system/dependency-graph.svg` | KEEP |
| `docs/system/KNIP_REPORT.md` | KEEP |
| `docs/system/ARCHIVAL_POLICY.md` | KEEP |
| `docs/review/HARDENING.md` | KEEP |
| `docs/review/META_ANALYSIS.md` | KEEP |
| `docs/review/PRODUCTION_PATH_REVIEW_GUIDELINE.md` | KEEP |
| `docs/plans/` | DELETE |
| `docs/history/RETROSPECTIVES.md` | KEEP |

### Scripts and Automation

| Path | Classification |
|------|---------------|
| `bin/` | KEEP |
| `scripts/build/` | KEEP |
| `scripts/ci/` | KEEP |
| `scripts/docs/` | KEEP |
| `scripts/release/` | KEEP |

### CI/CD and GitHub

| Path | Classification |
|------|---------------|
| `.github/workflows/` | KEEP |
| `.github/CONTRIBUTING.md` | KEEP |
| `.github/CODE_OF_CONDUCT.md` | KEEP |
| `.github/SECURITY.md` | KEEP |
| `.github/PULL_REQUEST_TEMPLATE.md` | KEEP |
| `.github/copilot-instructions.md` | KEEP |

### Archive

| Path | Classification |
|------|---------------|
| `backlog/` | KEEP |
| `archive/ai-reports/` | CONSOLIDATE |

---

## Conclusion

This repository demonstrates good overall hygiene with clear package boundaries, active use of modern tooling (pnpm workspaces, TypeScript, Vitest, OTEL), and comprehensive documentation in most areas. The primary cleanup opportunities are:

1. **Documentation consolidation**: Merge duplicate AI agent guidance
2. **Generated file management**: Address committed TypeDoc output
3. **Empty directory cleanup**: Remove unused `docs/plans/`
4. **Historical artifact management**: Consolidate older audit reports

The repo is in good shape for continued development; the above improvements would sharpen context quality without disrupting existing workflows.
