---
id: TASK-44.5
title: Generated Artifact Pipeline Hardening
status: Done
assignee: []
created_date: '2026-03-14 04:00'
updated_date: '2026-03-29 11:28'
labels:
  - ci
  - tooling
  - repo-hygiene
dependencies: []
references:
  - docs/system/KNIP_REPORT.md
  - docs/system/SITE_FLOW.md
  - knip.json
  - scripts/ci/verify-doc-artifacts.sh
  - scripts/docs/render-site-flow.sh
  - scripts/docs/render-knip-report.sh
parent_task_id: TASK-44
priority: medium
ordinal: 30000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Three related concerns about generated documentation artifacts: (1) `docs/system/KNIP_REPORT.md` publishes false positives because `knip.json` doesn't cover nested `.mjs` and shell-driven tooling paths — the report flags `@viz-js/viz` as unused despite `scripts/docs/render-dependency-graph.mjs` importing it directly. (2) Site-flow diagrams (`docs/system/site-flow-*.mmd`, `site-flow-*.svg`) are tracked and positioned as system docs but are not included in `pnpm docs:check` or `pnpm docs:artifacts`, and `render-site-flow.sh` uses unpinned `npx -y @mermaid-js/mermaid-cli`. (3) No consolidated policy document states which generated artifacts are tracked, which are local-only, and which checks keep them current.

**Concern sources:**
- **Codex/GPT-5**: Identified Knip false positive as a demonstrable trust issue: "the file looks authoritative while overstating dead-code/dependency issues." Recommended expanding `knip.json` or replacing raw output with a triaged summary. Also flagged site-flow diagrams as "not included in `pnpm docs:check`" with unpinned Mermaid CLI creating "silent drift risk."
- **Claude Code/Opus 4.6**: Noted `docs/system/SITE_FLOW.md` and diagrams are "not covered by `pnpm docs:check`" and called for pinning Mermaid CLI.
- **Codex/GPT-5**: Recommended a "generated artifact policy" documenting which artifacts are tracked vs. local-only.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `knip.json` workspace entry coverage is expanded to include `scripts/**/*.mjs` and other nested tooling paths, eliminating the `@viz-js/viz` false positive.
- [ ] #2 `docs/system/KNIP_REPORT.md` is regenerated and contains no known false positives.
- [ ] #3 Site-flow diagram generation (`render-site-flow.sh`) uses a pinned Mermaid CLI version, not `npx -y @mermaid-js/mermaid-cli`.
- [ ] #4 Site-flow artifacts are either added to `pnpm docs:check` / `verify-doc-artifacts.sh` or explicitly downgraded to manual/reference-only status with documentation.
- [ ] #5 A brief generated-artifact policy note documents which artifacts are tracked+CI-verified, which are tracked+manual, and which are local-only.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Expand `knip.json` root workspace `entry` to cover `scripts/**/*.mjs`, `scripts/**/*.ts`, `bin/**/*.ts`, `bin/**/*.zsh`.
2. Regenerate `docs/system/KNIP_REPORT.md` via `pnpm docs:knip` and verify `@viz-js/viz` no longer appears as unused.
3. Pin `@mermaid-js/mermaid-cli` in `package.json` devDependencies or document a specific version in `render-site-flow.sh`.
4. Decide: add site-flow to `verify-doc-artifacts.sh` or mark as manual. Update accordingly.
5. Add a "Generated Artifacts" section to `docs/system/ARCHITECTURE.md` or a standalone policy note listing: dependency-graph.svg (tracked, CI-verified), KNIP_REPORT.md (tracked, CI-verified), site-flow-*.svg (tracked, status TBD), docs/api/ (local-only, gitignored).
6. Run `pnpm docs:check` and `pnpm check:quick` to verify.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 **Code quality (DoD §4)**: `knip.json` coverage matches actual tooling entry points; no false positives in the tracked report.
- [ ] #2 **Verification (DoD §2)**: `pnpm docs:check` passes; regenerated Knip report matches committed version; site-flow artifacts are either CI-verified or documented as manual.
- [ ] #3 **Accessibility (DoD §6)**: Contributors can find a clear statement about which generated artifacts are tracked, how they're kept current, and which are local-only.
<!-- DOD:END -->
