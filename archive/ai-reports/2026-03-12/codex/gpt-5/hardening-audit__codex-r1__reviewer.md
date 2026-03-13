# Repository Hardening Audit - Reviewer Report

## Runtime Declaration

## Operator-Provided Identity

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

## Agent Runtime Assessment

| Field | Value | Basis | Confidence |
| --- | --- | --- | --- |
| tool directory name | `codex` | observed | high |
| model file name | `gpt-5.md` | observed | high |
| platform | `codex` | observed | high |
| harness | `codex` | best-faith-estimate | medium |
| provider | `openai` | best-faith-estimate | medium |
| model | `gpt-5` | observed | high |
| model family | `gpt-5` | observed | high |
| model snapshot | `unknown` | unknown | none |
| local vs remote | `unknown` | unknown | none |
| file write access | `enabled` | observed | high |
| shell access | `enabled` | observed | high |
| network access | `enabled` | best-faith-estimate | medium |

Observed conflicts and notes:

- The operator-provided identity block uses placeholders. The assessment above records the runtime values I could actually observe or infer.
- `docs/review/HARDENING.md` says generated audit output belongs under `archive/ai-reports/...`, but the bootstrap for this run explicitly overrode placement to `docs/review/codex/gpt-5.md`. This report follows the bootstrap for placement and `HARDENING.md` for audit method/content.
- Shell network access is restricted by the harness, but internet-capable tools are available in the runtime overall. That is why `network access` is assessed as enabled with medium confidence.

## Assignment Block

- Agent ID: `codex-gpt-5-r1`
- Role: `reviewer`
- Platform ID: `codex`
- Model ID: `gpt-5`
- Run Date: `2026-03-13`
- Scope: `repo/** (full repo, single-agent run)`
- Output Dir: `docs/review/codex/`
- Output Path: `docs/review/codex/gpt-5.md`
- Cross-scope files consulted:
  - `README.md`
  - `.github/CONTRIBUTING.md`
  - `.github/SECURITY.md`
  - `.github/copilot-instructions.md`
  - `.github/workflows/ci.yml`
  - `package.json`
  - `knip.json`
  - `docs/system/ARCHITECTURE.md`
  - `docs/system/AI_COLLABORATION.md`
  - `docs/system/ARCHIVAL_POLICY.md`
  - `docs/system/DEFINITION_OF_DONE.md`
  - `docs/system/FEATURE_FLAGS.md`
  - `docs/system/PNPM_SCRIPTS.md`
  - `docs/system/RISKS.md`
  - `docs/system/SITE_FLOW.md`
  - `docs/system/KNIP_REPORT.md`
  - `archive/ai-reports/README.md`
  - `backlog/decisions/README.md`
  - `backlog/docs/ai-agent-workflow.md`
  - `scripts/ci/verify-doc-artifacts.sh`
  - `scripts/ci/verify-doc-fsm-consistency.ts`
  - `scripts/docs/render-dependency-graph.mjs`
  - `scripts/docs/render-knip-report.sh`
  - `scripts/docs/render-site-flow.sh`

## 1. Executive Summary

This repo is already substantially hardened compared to a typical early-stage monorepo. Canonical product and workflow docs are clear, `backlog/decisions/README.md` is acting as a real decision index, `archive/ai-reports/README.md` and `docs/system/ARCHIVAL_POLICY.md` define an archive boundary, and the repo’s own fast guardrail path is real: `pnpm check:quick` passed during this audit, including lint, typecheck, schema drift, rules/FSM consistency, feature-flag validation, docs artifact regeneration, and markdown lint.

The highest-value cleanup work is not broad deletion. It is sharpening a few misleading or under-enforced context surfaces:

- `docs/system/KNIP_REPORT.md` is CI-enforced and tracked, but it currently publishes at least one demonstrable false positive because `knip.json` does not cover nested `.mjs` and shell-driven tooling paths.
- `docs/system/SITE_FLOW.md` and its `site-flow-*.mmd` / `site-flow-*.svg` companions look like generated canonical docs, but they are not covered by `pnpm docs:check`, and their generator falls back to unpinned `npx -y @mermaid-js/mermaid-cli`.
- `README.md` describes `docs/review/` as the review “corpus,” while the archive policy and archive README say generated AI outputs belong under `archive/ai-reports/`. That wording drift invites future output sprawl.
- The current working tree contains several untracked local agent-output and scratch-doc artifacts. They are not tracked repo content, but they are immediate AI context hazards in this checkout.

Overall assessment: the repo’s real problem is not uncontrolled top-level sprawl. It is a smaller set of “official-looking but not fully trustworthy” documentation artifacts and output-placement signals.

## 2. Monorepo Shape

Major areas observed:

- Product/runtime code: `shared/`, `engine/`, `server/`, `client/`
- Canonical docs: `docs/RULES.md`, `docs/system/**`, `.github/CONTRIBUTING.md`, `.github/SECURITY.md`
- Review guidance: `docs/review/HARDENING.md`, `docs/review/META_ANALYSIS.md`, `docs/review/PRODUCTION_PATH_REVIEW_GUIDELINE.md`
- Historical material: `archive/ai-reports/**`, `docs/history/**`, `backlog/completed/**`, `backlog/archive/**`
- Planning and policy: `backlog/tasks/**`, `backlog/docs/**`, `backlog/decisions/**`
- Tooling and CI: `bin/**`, `scripts/**`, `.github/workflows/**`, `.github/commands/**`
- Agent/tool-specific collaboration surfaces: `AGENTS.md`, `.github/copilot-instructions.md`, `.github/instructions/**`, `.agents/**`, `.codex/**`, `.claude/**`

Shape verdict:

- The repo has a clear separation between product code, tooling, canonical docs, and historical/archive material.
- The strongest hardening signal is that drift-sensitive docs are already partially wired into CI.
- The weakest shape boundary is around “active review guidance vs generated review outputs,” because different files signal different homes for those artifacts.

## 3. Canonical Sources

### Product behavior / rules

- `docs/RULES.md`
- `shared/src/schema.ts`

### Architecture

- `docs/system/ARCHITECTURE.md`
- `backlog/decisions/README.md`

### Local development

- `README.md`
- `.github/CONTRIBUTING.md`
- `docs/system/PNPM_SCRIPTS.md`

### Testing / QA

- `package.json` root scripts
- `docs/system/RISKS.md`
- `backlog/docs/ai-agent-workflow.md`

### CI/CD / release

- `.github/workflows/ci.yml`
- `scripts/ci/**`
- `scripts/release/**`

### Operational tooling

- `docs/system/ADMIN.md`
- `docs/system/FEATURE_FLAGS.md`
- `.github/SECURITY.md`

### Contributor guidance

- `.github/CONTRIBUTING.md`
- `docs/system/DEFINITION_OF_DONE.md`
- `docs/system/AI_COLLABORATION.md`
- `.github/copilot-instructions.md`
- `AGENTS.md`

### Where canonical ownership is missing or ambiguous

- `README.md` says `docs/review/` is the review corpus, but `docs/system/ARCHIVAL_POLICY.md` and `archive/ai-reports/README.md` say generated review outputs belong under `archive/ai-reports/`.
- `docs/system/KNIP_REPORT.md` is treated like a canonical tracked artifact, but it is raw generated tool output and is currently not fully trustworthy.
- `docs/system/SITE_FLOW.md` plus `site-flow-*.mmd` / `site-flow-*.svg` look like canonical generated docs, but unlike the dependency graph and Knip report they are outside the enforced docs artifact pipeline.
- `docs/api/` is generated local output (`typedoc.json` targets it, `.gitignore` excludes it) rather than a tracked canonical doc surface. That boundary exists, but it is not called out prominently in contributor docs.

## 4. Noise and Duplication Findings

### Finding 1

- path: `docs/system/KNIP_REPORT.md`, `knip.json`, `scripts/docs/render-knip-report.sh`, `scripts/docs/render-dependency-graph.mjs`
- classification: `REWRITE`
- why it is a problem: `docs/system/KNIP_REPORT.md` is treated as a tracked, CI-checked documentation artifact, but it currently includes at least one demonstrable false positive. The report flags `@viz-js/viz` as unused, yet `scripts/docs/render-dependency-graph.mjs` imports it directly. The root cause is visible in `knip.json`: the root workspace only covers `scripts/*.ts` and `bin/*.zsh`, not nested `scripts/**/*.mjs` or most shell-driven doc pipelines. This is an AI context hazard because the file looks authoritative while overstating dead-code/dependency issues.
- recommended action: either expand `knip.json` so the generated report is trustworthy, or stop treating the raw Knip output as a canonical tracked doc and replace it with a triaged summary.

### Finding 2

- path: `docs/system/SITE_FLOW.md`, `docs/system/site-flow-1.mmd`, `docs/system/site-flow-1.svg`, `docs/system/site-flow-2.mmd`, `docs/system/site-flow-2.svg`, `scripts/docs/render-site-flow.sh`, `scripts/ci/verify-doc-artifacts.sh`
- classification: `REWRITE`
- why it is a problem: the site-flow diagrams are tracked and positioned as part of the system docs, but they are not included in `pnpm docs:artifacts` or `pnpm docs:check`. `scripts/docs/render-site-flow.sh` also falls back to `npx -y @mermaid-js/mermaid-cli`, which is unpinned and network-dependent. That creates silent drift risk: the diagrams can look canonical without being reproducibly regenerated or CI-checked.
- recommended action: pin the Mermaid CLI in repo tooling and either add `site-flow-*` generation to the docs artifact check or clearly downgrade these files to manual/reference-only status.

### Finding 3

- path: `README.md`, `docs/system/ARCHIVAL_POLICY.md`, `archive/ai-reports/README.md`
- classification: `REWRITE`
- why it is a problem: the tracked archive policy is internally consistent about generated AI output belonging under `archive/ai-reports/`, but `README.md` still describes `docs/review/` as the review “corpus.” That wording is broad enough to invite contributors and agents to put outputs next to prompts and guidelines instead of under the archive boundary.
- recommended action: rewrite the `README.md` monorepo map entry so `docs/review/` is explicitly “review prompts and guidance,” while generated review outputs go to `archive/ai-reports/`.

### Finding 4

- path: `.markdownlint-cli2.jsonc`, `docs/review/HARDENING.md`, `docs/review/META_ANALYSIS.md`, `docs/review/PRODUCTION_PATH_REVIEW_GUIDELINE.md`
- classification: `NEEDS OWNER DECISION`
- why it is a problem: `docs/review/**` is excluded from markdown lint along with archived material. That may be intentional for generated outputs, but the tracked files under `docs/review/` are active operator guidance and prompts, not just history. Exempting them entirely weakens the “prompts are operational docs” stance.
- recommended action: either keep the exemption and document why prompt files are intentionally outside markdown lint, or narrow the ignore rule so tracked prompt/guideline sources are linted while generated outputs remain ignored.

## 5. Earlier Artifact Review

### Historical archive that still matters

- path: `archive/ai-reports/2026-03-11/**`
- likely origin/purpose: prior AI-generated production and documentation audits
- whether it still matters: yes; it is useful historical comparison material and the repo already treats it as archive-only context
- action: `KEEP`
- risk of leaving it as-is: moderate AI context hazard if someone reads raw reports instead of `archive/ai-reports/README.md` or `docs/review/META_ANALYSIS.md`

### Historical plans already segregated reasonably well

- path: `backlog/completed/docs/**`
- likely origin/purpose: completed implementation plans and design notes preserved with their finished work
- whether it still matters: yes; it preserves rationale without polluting `docs/`
- action: `KEEP`
- risk of leaving it as-is: low, provided contributors understand `backlog/decisions/**` and current tasks are the active surfaces

### Assistant-neutral retrospective migration

- path: `docs/history/RETROSPECTIVES.md`
- likely origin/purpose: historical implementation notes moved out of `.claude/RETROSPECTIVES.md`
- whether it still matters: yes; this is a good example of moving useful history into an assistant-neutral docs location
- action: `KEEP`
- risk of leaving it as-is: low

### Historical changelog with stale path references

- path: `CHANGELOG.md`
- likely origin/purpose: release/change history
- whether it still matters: yes, as history
- action: `KEEP`
- risk of leaving it as-is: medium AI context hazard if readers mistake historical references for current docs. Older entries point to now-missing paths such as `docs/CLI.md`, `docs/TECHNICAL_REFERENCE.md`, and `docs/PRIVACY_AND_ETHICS.md`.

### Working-tree residue observed during the audit (not tracked repo content)

- path: `archive/ai-reports/2026-03-12/`, `docs/review/cursor-gpt-5.2/`, `docs/review/opencode/`, `docs/review/trae/`, `backlog/docs/doc-1 - GLOSSARY.md.md`
- likely origin/purpose: local agent outputs and a local backlog-generated glossary draft
- whether it still matters: not as repo content, but yes as checkout-local context
- action: `NEEDS OWNER DECISION`
- risk of leaving it as-is: high local AI context hazard. These files are untracked, but future local agents can still read them and mistake them for authoritative repo material.

## 6. Tooling and Operational Artifact Review

### Root verification and CI

- `package.json` root scripts and `.github/workflows/ci.yml` are real and still used.
- `pnpm check:quick` passed during this audit.
- The repo is already enforcing meaningful drift checks:
  - `pnpm schema:check`
  - `pnpm rules:check`
  - `pnpm flags:check`
  - `pnpm docs:check`
  - `pnpm lint:md`

### Documentation artifact tooling

- `scripts/ci/verify-doc-artifacts.sh` is real and still used.
- It currently enforces only `docs/system/dependency-graph.svg` and `docs/system/KNIP_REPORT.md`.
- That selective enforcement is useful but incomplete, because `SITE_FLOW` assets are tracked and generated but not part of the verified set.

### AI collaboration and instruction surfaces

- `AGENTS.md`, `.github/copilot-instructions.md`, `.github/instructions/trust-boundaries.instructions.md`, `docs/system/AI_COLLABORATION.md`, and `backlog/docs/ai-agent-workflow.md` are real and still used.
- This surface is larger than ideal, but it is mostly disciplined:
  - the GitHub Copilot instructions are short and defer to canonical docs
  - `docs/system/AI_COLLABORATION.md` sets policy instead of restating repo detail
  - the Codex `context-hunter` entrypoint points to the `.agents` copy
- Risk: there is still no single tracked doc that maps the GitHub Gemini automation surface (`.github/workflows/gemini-*.yml`, `.github/commands/*.toml`) to its intended use and ownership.

### GitHub automation

- `.github/workflows/gemini-dispatch.yml`, `.github/workflows/gemini-review.yml`, `.github/workflows/gemini-invoke.yml`, and the corresponding `.github/commands/*.toml` files appear real and active, not dead placeholders.
- They are operationally important because they can review PRs, triage issues, and run agent workflows from GitHub events/comments.
- They are under-documented in the human-facing docs surface.

### Local generated docs

- `typedoc.json` outputs to `docs/api/`, and `.gitignore` excludes `docs/api/`.
- `dashing.json` is also gitignored.
- This is a good boundary: those are local/generated artifacts, not tracked repo docs.

## 7. Missing Documentation

### 1. AI automation map

Needed because `.github/workflows/gemini-*.yml` and `.github/commands/*.toml` are meaningful operator surfaces, but there is no concise canonical doc that explains:

- what automations exist
- who owns them
- how they are triggered
- which instruction sources they consume
- what safety boundaries apply

### 2. Generated artifact policy

Needed because tracked and untracked generated docs are currently mixed across several patterns:

- tracked and CI-checked: `docs/system/dependency-graph.svg`, `docs/system/KNIP_REPORT.md`
- tracked but not CI-checked: `docs/system/site-flow-*.svg`
- generated local only: `docs/api/`, `dashing.json`

A short canonical policy should state which artifacts are tracked, which are local-only, and which checks keep them current.

### 3. Local working-tree hygiene for AI outputs

Needed because this checkout already contains several untracked local agent-output directories and scratch docs. The archive policy covers tracked historical outputs, but there is no short operator-facing rule for local-only outputs and scratch docs that should not linger in active worktrees.

## 8. Recommended Target Documentation Model

Minimal durable model for this repo:

- `README.md`
  - quick start
  - monorepo map
  - “where canonical truth lives”
- `.github/CONTRIBUTING.md`
  - contributor workflow
  - risk-matched verification commands
- `docs/RULES.md`
  - canonical gameplay behavior
- `docs/system/ARCHITECTURE.md`
  - package/runtime boundaries
- `docs/system/ADMIN.md`, `docs/system/FEATURE_FLAGS.md`, `docs/system/RISKS.md`
  - operator and rollout surfaces
- `docs/system/DEFINITION_OF_DONE.md`, `docs/system/AI_COLLABORATION.md`
  - contribution and AI-assistance policy
- `backlog/decisions/README.md`
  - canonical decision index
- `docs/system/ARCHIVAL_POLICY.md` plus `archive/ai-reports/README.md`
  - history/archive rules
- `docs/review/**`
  - prompts, review rubrics, synthesis/meta-guidance only
- `archive/ai-reports/**`
  - generated review output only

Two explicit principles should be added to that model:

- raw tool output is not a canonical doc unless its trustworthiness is validated and maintained
- tracked generated artifacts must either be reproducibly CI-checked or clearly marked as manual/reference-only

## 9. Proposed File Actions

### Delete now

- None recommended for tracked repo files.

### Archive

- No urgent tracked-file moves. The repo is already doing the right thing by keeping historical AI reports in `archive/ai-reports/**` and completed plans in `backlog/completed/**`.

### Consolidate into canonical docs

- Consolidate review-output placement guidance:
  - `README.md`
  - `docs/system/ARCHIVAL_POLICY.md`
  - `archive/ai-reports/README.md`
- Consolidate generated artifact guidance into one canonical policy note covering:
  - dependency graph
  - Knip report
  - site-flow diagrams
  - TypeDoc output
  - Dash docset output

### Rewrite soon

- `knip.json`
- `scripts/docs/render-knip-report.sh`
- `docs/system/KNIP_REPORT.md`
- `scripts/docs/render-site-flow.sh`
- `scripts/ci/verify-doc-artifacts.sh`
- `README.md` section that describes `docs/review/`
- `.markdownlint-cli2.jsonc` ignore policy for `docs/review/**`

### Keep as-is

- `docs/RULES.md`
- `docs/system/ARCHITECTURE.md`
- `docs/system/AI_COLLABORATION.md`
- `docs/system/DEFINITION_OF_DONE.md`
- `docs/system/ARCHIVAL_POLICY.md`
- `archive/ai-reports/README.md`
- `.github/CONTRIBUTING.md`
- `.github/SECURITY.md`
- `.github/workflows/ci.yml`
- `backlog/decisions/README.md`
- `docs/history/RETROSPECTIVES.md`

## 10. Risk Notes

- Tightening archive or review-output rules carelessly could destroy historical traceability. Keep manifests and README-level redirects in place when moving old material.
- Reclassifying generated docs without updating CI and contributor docs will create a new round of drift. The artifact policy must move together with the checks.
- Fixing `KNIP_REPORT.md` by suppressing everything would reduce noise but also destroy useful signal. The right fix is to make the report trustworthy, not simply quieter.
- Removing local untracked review outputs and scratch docs is safe from a repo-history perspective, but only if operators agree those files are truly disposable. Some may still be part of active local workflows.

## 11. Next-Step Plan

### Phase 1: no-risk consolidation and labeling

Work this scope owner can do:

- Rewrite the `README.md` description of `docs/review/` to match the archive policy.
- Add a short generated-artifact note to the canonical docs surface.
- Decide whether tracked `docs/review/**` prompt files should remain outside markdown lint.

### Phase 2: archival and deletion of stale artifacts

Work another scope owner or the local operator should do:

- Clean up checkout-local untracked agent-output directories and scratch docs once they are no longer needed.
- Keep generated review outputs out of tracked active-doc directories unless there is an explicit exception.

### Phase 3: canonical doc rewrite / tightening

Work this scope owner can do:

- Expand `knip.json` coverage so `docs/system/KNIP_REPORT.md` stops publishing known false positives.
- Decide whether `KNIP_REPORT.md` should remain raw generated output or become a smaller triaged summary.
- Pin Mermaid CLI usage for `render-site-flow.sh` and decide whether the site-flow artifacts are canonical tracked outputs.

### Phase 4: guardrails to prevent noise from returning

Work the repo owner should decide:

- Add `site-flow-*` to docs artifact verification if those files remain tracked.
- Add a documented rule for local-only AI review outputs and scratch docs.
- Document the GitHub automation surface so contributors know what is active and supported.

## 12. Appendix: File Inventory

- `README.md` — `KEEP`, but rewrite the `docs/review/` description to match archive policy
- `.github/CONTRIBUTING.md` — `KEEP`, strong contributor workflow anchor
- `.github/SECURITY.md` — `KEEP`, clear disclosure and Actions pinning policy
- `.github/workflows/ci.yml` — `KEEP`, real CI source of truth
- `.github/workflows/gemini-dispatch.yml` — `KEEP`, active automation surface that needs better documentation
- `.github/workflows/gemini-review.yml` — `KEEP`, active automation surface that needs better documentation
- `package.json` — `KEEP`, canonical command map
- `knip.json` — `REWRITE`, current coverage misses nested script/tooling entry points
- `docs/RULES.md` — `KEEP`, canonical gameplay rules
- `docs/system/ARCHITECTURE.md` — `KEEP`, canonical system map
- `docs/system/AI_COLLABORATION.md` — `KEEP`, concise policy doc
- `docs/system/ARCHIVAL_POLICY.md` — `KEEP`, policy is directionally correct
- `docs/system/DEFINITION_OF_DONE.md` — `KEEP`, high-signal completion bar
- `docs/system/PNPM_SCRIPTS.md` — `KEEP`, accurate root-script reference
- `docs/system/RISKS.md` — `KEEP`, good operational hazard ledger
- `docs/system/KNIP_REPORT.md` — `REWRITE`, authoritative-looking raw output with current false positives
- `docs/system/SITE_FLOW.md` — `REWRITE`, useful doc with under-hardened artifact pipeline
- `docs/system/site-flow-1.mmd` — `REWRITE`, tracked generated-source artifact outside CI check
- `docs/system/site-flow-1.svg` — `REWRITE`, tracked generated artifact outside CI check
- `docs/system/site-flow-2.mmd` — `REWRITE`, tracked generated-source artifact outside CI check
- `docs/system/site-flow-2.svg` — `REWRITE`, tracked generated artifact outside CI check
- `docs/review/HARDENING.md` — `KEEP`, active audit prompt/guidance
- `docs/review/META_ANALYSIS.md` — `KEEP`, useful synthesis of prior review corpus
- `docs/review/PRODUCTION_PATH_REVIEW_GUIDELINE.md` — `KEEP`, active review rubric
- `archive/ai-reports/README.md` — `KEEP`, good archive boundary doc
- `archive/ai-reports/2026-03-11/**` — `KEEP`, historical archive with explicit caution
- `backlog/decisions/README.md` — `KEEP`, canonical active decision index
- `backlog/docs/ai-agent-workflow.md` — `KEEP`, repo-local backlog workflow guidance
- `backlog/completed/docs/**` — `KEEP`, reasonable historical plan storage
- `docs/history/RETROSPECTIVES.md` — `KEEP`, assistant-neutral historical notes
- `CHANGELOG.md` — `KEEP`, historical log; do not treat as current doc inventory

