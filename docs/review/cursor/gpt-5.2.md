# Repository Hardening Audit - Reviewer Report

## Runtime Declaration

### Operator-Provided Identity

Runtime identity for this run:
- TOOL_DIR_NAME: <tool-directory-name>
- MODEL_FILE_NAME: <model-file-name>.md
- PLATFORM_ID: <tool-or-client-name>
- HARNESS_ID: <runner-or-client-name-or-unknown>
- PROVIDER_ID: <openai|anthropic|google|ollama|vllm|lmstudio|openrouter|other|unknown>
- MODEL_ID: <model-name-without-.md>
- MODEL_FAMILY: <family-or-unknown>
- MODEL_SNAPSHOT: <snapshot-or-version-or-unknown>
- LOCALITY: <local|remote|unknown>
- API_BASE: <endpoint-or-unknown>
- NETWORK_ACCESS: <enabled|disabled|unknown>
- FILE_WRITE_ACCESS: <enabled|disabled|unknown>
- SHELL_ACCESS: <enabled|disabled|unknown>

### Agent Runtime Assessment

| Field | Value | Basis | Confidence |
|---|---|---:|---:|
| tool directory name | `cursor-gpt-5.2` | observed | high |
| model file name | `gpt-5.2.md` | observed | high |
| platform | `cursor` | best-faith-estimate | medium |
| harness | `unknown` | unknown | none |
| provider | `openai` | best-faith-estimate | medium |
| model | `gpt-5.2` | best-faith-estimate | medium |
| model family | `unknown` | unknown | none |
| model snapshot | `unknown` | unknown | none |
| local vs remote | `unknown` | unknown | none |
| file write access | `enabled` | observed | high |
| shell access | `enabled` | observed | high |
| network access | `unknown` | unknown | none |

**Identity/layout note (operator vs base prompt conflict):**
- `docs/review/HARDENING.md` specifies audit outputs must be under `archive/ai-reports/...` and requires an explicit assignment block for multi-agent runs.
- The operator bootstrap for this run explicitly required output under `docs/review/<tool>/<model>.md`.
- This report follows the operator bootstrap for output placement and uses `HARDENING.md` for audit method and report contents.

---

## Assignment Block (best-faith, single-agent reviewer)

- Agent ID: `cursor-gpt-5.2-r1`
- Role: `reviewer`
- Platform ID: `cursor`
- Model ID: `gpt-5.2`
- Run Date: `2026-03-13`
- Scope: `repo/** (full repo, single-agent run)`
- Output Dir: `docs/review/cursor-gpt-5.2/` *(operator bootstrap override; base prompt prefers `archive/ai-reports/...`)*
- Output Path: `docs/review/cursor-gpt-5.2/gpt-5.2.md`
- Cross-scope files consulted:
  - `docs/RULES.md`
  - `docs/system/ARCHITECTURE.md`
  - `docs/review/HARDENING.md`
  - `.gitignore`
  - `package.json`
  - `Dockerfile`
  - `server/src/app.ts`
  - `engine/src/turns.ts`
  - `engine/src/replay.ts`
  - `shared/src/hash.ts`

---

## 1. Executive Summary

The repo is already trending toward a “hardened” shape: canonical rule spec (`docs/RULES.md`), clear architecture doc (`docs/system/ARCHITECTURE.md`), a strong CI verification surface (`pnpm rules:check`, `pnpm schema:check`, `pnpm docs:check`), and an explicit archive boundary for AI reports (`archive/ai-reports/**`).

The main hardening risks are **context hazards and security foot-guns**:

- **Secrets present in working tree `.env` / `.env.local`** (even if gitignored) create a high-risk “accidental commit” and “AI over-reading secrets” surface.
- **Generated documentation artifacts appear committed** (`docs/api/**`), while `.gitignore` claims to ignore them; this creates ambiguity about what is canonical, what is generated, and what must be kept current.
- **Archive naming/layout drift** exists in `archive/ai-reports/**` (platform/model naming not consistently normalized), which undermines the base hardening prompt’s goal of predictable, non-polluting AI report storage.
- **Duplication risk** between “plans” documents (`docs/plans/**`) and backlog plans (`backlog/**`) may confuse future agents about what is current vs historical vs normative.

Highest-value cleanup opportunities (no code changes implied; this is analysis only):
- Establish a single canonical policy for generated docs (commit vs don’t commit) and enforce it in CI.
- Ensure secrets are never present in repo worktrees by default (templates only, and stronger pre-commit/CI guardrails).
- Normalize archival layout and provide a manifest/index as the only entry point for old reports.

---

## 2. Monorepo Shape

Observed top-level structure (from repository listing and docs):
- Product packages: `shared/`, `engine/`, `server/`, `client/`
- Documentation: `docs/**` (rules, system docs, plans), plus additional governance/legal docs in root
- CI workflows: `.github/workflows/**`
- Tooling/scripts: `bin/**`, `scripts/**`
- Archive boundary: `archive/ai-reports/**` (AI-generated analysis and report runs)
- Backlog system: `backlog/**` (tasks/decisions/completed items)

---

## 3. Canonical Sources

### Product behavior / rules (canonical)
- `docs/RULES.md` (explicitly “Canonical Rules Specification v1.0 (Final)”)

### Architecture (canonical-ish)
- `docs/system/ARCHITECTURE.md` (maps packages, data flow, hashing model, replay endpoint)

### Local development / onboarding
- `README.md` (ports, dev commands, local OTLP instructions)
- `CONTRIBUTING.md` (validation commands, repo layout, doc pointers)

### Testing / QA
- `package.json` scripts (`pnpm test`, `pnpm qa:*`, `pnpm rules:check`, `pnpm schema:check`)
- `engine/tests/**`, `server/tests/**` (tests are part of correctness and drift detection)

### CI/CD / release
- `.github/workflows/ci.yml` (lint, typecheck, build, test, schema/rules checks, formatting)
- `Dockerfile` (build + runtime packaging)
- `fly.toml` (deployment presence; not deeply reviewed here)

### Operational tooling
- `docs/system/ADMIN.md` (exists; not deep-read in this audit)
- `/health` endpoint documented in README and implemented in `server/src/app.ts`

### Contributor guidance
- `CONTRIBUTING.md`
- `SECURITY.md` (security policy and CI pinning guidance; not deeply reviewed here)

### Where canonical ownership is missing/ambiguous
- **Generated docs**: `.gitignore` lists `docs/api/` as ignored, but `docs/api/**` exists in-repo. This conflicts with “generated artifacts should not be committed unless there’s a clear policy.”
- **AI report output policy**: base hardening prompt says “Generated outputs belong under `archive/ai-reports/`, not under `docs/review/`,” yet older historical material and new runs appear in both places (see `archive/ai-reports/**` listing).

---

## 4. Noise and Duplication Findings

1) **`docs/api/**`**
- **classification**: NEEDS OWNER DECISION → (either KEEP with explicit policy, or ARCHIVE/DELETE from mainline and generate in CI)
- **why it is a problem**: Looks like generated TypeDoc/HTML. If committed, it becomes a drift magnet and a large AI context hazard. If not committed, it should be removed and generated on demand.
- **evidence**:
  - Large set of HTML assets under `docs/api/**` were detected by repo scan.
  - `.gitignore` includes `docs/api/` under “Documentation Artifacts,” implying it should not be committed.
- **recommended action**:
  - Choose one: (A) commit and enforce `pnpm docs:build` + `pnpm docs:check` to guarantee freshness, or (B) stop committing and move to release artifacts / GitHub Pages output only.

2) **AI reports / prior audits**
- **classification**: CONSOLIDATE / ARCHIVE (policy), KEEP (archive)
- **why it is a problem**: Multiple naming conventions and paths increase confusion for both humans and agents; they’ll over-read old opinions as truth.
- **evidence**: `archive/ai-reports/2026-03-11/**` contains multiple platform/model directories including inconsistent naming (e.g., combined names like `cursor-gpt-5.2__gpt-5.2`).
- **recommended action**: enforce the normalized layout described in `docs/review/HARDENING.md` going forward and add an index/manifest as the canonical entry point.

3) **Plans duplication (`docs/plans/**` vs `backlog/**`)**
- **classification**: CONSOLIDATE (policy) / ARCHIVE (older plans)
- **why it is a problem**: Two parallel planning systems increase drift and “what is current?” ambiguity.
- **evidence**:
  - `docs/plans/**` contains many dated plans and design docs.
  - `backlog/**` also contains plans/decisions/completed items.
- **recommended action**: declare one canonical planning home and define archival rules for the other.

---

## 5. Earlier Artifact Review

### `archive/ai-reports/**`
- **likely origin/purpose**: accumulated AI audit outputs and prompts
- **still matters?**: Yes as historical traceability and comparison across models/runs
- **recommended**: KEEP but consolidate naming; ensure a manifest links to “latest” results
- **AI context hazard**: High if agents treat older reports as authoritative. Mitigate by adding a short “READ THIS FIRST” index and by moving old prompts/specs into clearly marked “historical” sections.

---

## 6. Tooling and Operational Artifact Review

### CI verification surface (`package.json`, `.github/workflows/ci.yml`)
- **status**: real and still used (directly invoked by CI)
- **hardening-positive**: includes rules/spec drift checks (`pnpm rules:check`) and schema snapshot checks (`pnpm schema:check`), plus `pnpm docs:check`

### QA tooling (`bin/qa/**`, `scripts/**`)
- **status**: appears real and still used (multiple scripts referenced from `package.json`)
- **gap**: discovery docs for QA tools are limited (**insufficient evidence** of a single canonical QA guide)

---

## 7. Missing Documentation

Only listing missing docs that materially improve correctness/safety:

1) **Generated docs policy**
- A short doc answering: “Is `docs/api/**` committed output or generated output?” and “How is it kept current?”

2) **Secrets hygiene / environment contract**
- Even if `.env*` files are gitignored, provide a canonical doc that explains what must never be committed and how the repo prevents it (CI checks, pre-commit, templates).

3) **Archive policy for AI reports**
- There is a hardening prompt describing the desired layout, but the repo needs a single canonical policy doc + automated checks to prevent drift back to ad-hoc directories.

---

## 8. Recommended Target Documentation Model

Minimal, durable structure (proposal):

- `README.md`: quick start + “where is canonical truth”
- `docs/RULES.md`: canonical spec (already strong)
- `docs/system/ARCHITECTURE.md`: canonical architecture map (already strong)
- `docs/system/ADMIN.md`: ops/admin (exists; ensure current)
- `docs/system/ARCHIVAL_POLICY.md`: what gets archived, where, and why (exists; ensure it references AI reports policy)
- `archive/ai-reports/README.md` + `archive/ai-reports/<RUN_DATE>/<platform>/<model>/...`: the only place AI outputs go
- `docs/plans/**`: explicitly “historical design notes” (or move to `archive/` if they’re no longer operational)

---

## 9. Proposed File Actions

### Delete now
- **None recommended in this report** (analysis-only; deletions should be executed by owner with care).

### Archive
- Consider archiving older `docs/plans/**` items that are superseded by backlog decisions (owner decision).

### Consolidate into canonical docs
- Consolidate event/replay explanation into either `docs/system/ARCHITECTURE.md` or a dedicated canonical “Event Model” doc, and ensure other docs defer to it instead of restating.

### Rewrite soon
- Add explicit generated-doc policy for `docs/api/**` (keep vs generate).
- Add explicit AI-report archival and naming normalization enforcement.

### Keep as-is
- `docs/RULES.md`, `docs/system/ARCHITECTURE.md`, `README.md`, `CONTRIBUTING.md` are strong canonical anchors.

---

## 10. Risk Notes

### High-risk: secrets in local env files
- **evidence**: `.env` contains `SENTRY_AUTH_TOKEN` and Sentry DSNs; `.env.local` contains admin credentials and a `DATABASE_URL` (observed by reading file contents).
- **risk**: accidental commit, leakage via logs/screenshots, and AI agents reading secrets.
- **mitigation**: ensure templates (`.env.example`) are the only committed baseline; add CI and pre-commit scanning guardrails; keep secrets out of default worktree state.

### Medium-risk: generated docs drift
- If `docs/api/**` is committed, it must be continuously regenerated/verified. If not, it should not be present in the repo.

---

## 11. Next-Step Plan

Phase 1 (no-risk consolidation and labeling)
- Add/strengthen canonical “what to read first” docs for humans/agents (README pointers + archive index).
- Document generated-doc policy and AI-report policy.

Phase 2 (archival/deletion of stale artifacts)
- Move stale plans and old reports into `archive/` per policy; keep manifests to preserve traceability.

Phase 3 (canonical doc tightening)
- Ensure all non-canonical docs link to canonical sources instead of duplicating content.

Phase 4 (guardrails)
- Add CI checks that fail if AI reports appear outside the archive layout.
- Add checks that prevent committing `.env*` or other secret-bearing files.

---

## 12. Appendix: File Inventory (selected)

- `docs/RULES.md` — KEEP (canonical rules)
- `docs/system/ARCHITECTURE.md` — KEEP (canonical architecture)
- `README.md` — KEEP (onboarding)
- `CONTRIBUTING.md` — KEEP (developer workflow)
- `docs/api/**` — NEEDS OWNER DECISION (generated vs committed)
- `archive/ai-reports/**` — KEEP + CONSOLIDATE NAMING (archive boundary)
- `.gitignore` — KEEP (but ensure it matches reality; generated docs + env files policy)
- `docs/review/HARDENING.md` — KEEP (audit method; ensure its output-layout rules match how audits are actually run)

