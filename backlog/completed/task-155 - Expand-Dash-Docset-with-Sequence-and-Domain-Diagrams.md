---
id: TASK-155
title: Expand Dash Docset with Sequence and Domain Diagrams
status: Done
assignee:
  - '@codex'
created_date: '2026-03-31 22:20'
updated_date: '2026-04-01 04:34'
labels:
  - documentation
  - docs
  - dash
dependencies:
  - TASK-140
  - TASK-142
  - TASK-144
references:
  - docs/architecture/principles.md
  - docs/architecture/site-flow.md
  - docs/architecture/audit-trail.md
priority: medium
ordinal: 71000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add richer sequence-oriented and domain-model-oriented documentation to the
curated Dash docset so Dash.app becomes a useful systems-navigation surface, not
just an API browser.

## Rationale

The current docset now stages architecture, flow, and data-model landing pages,
but the repo still lacks enough sequence diagrams and explicit model maps for
common execution paths such as:

- client intent to server validation to engine apply to broadcast
- match persistence and audit-trail append flow
- OTEL signal emission to collector to centralized backend

Without those views, Dash remains helpful but still incomplete for architecture
onboarding and operational debugging.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The repo contains at least one canonical sequence diagram for request/action execution through client, server, engine, and shared contract boundaries.
- [x] #2 The repo contains at least one canonical sequence diagram for persistence and replay/audit flow.
- [x] #3 The curated Dash docset links those sequence diagrams from its landing or architecture pages.
- [x] #4 Domain-model pages in the Dash docset clearly connect runtime schemas, persistence records, and event-log structures.
- [x] #5 The added diagrams/docs are generated or curated from canonical sources and do not create contradictory parallel documentation.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added four canonical Mermaid sources under `docs/system/`:
  `gameplay-sequence-1.mmd`, `persistence-sequence-1.mmd`,
  `observability-sequence-1.mmd`, and `domain-model-1.mmd`.
- Broadened `scripts/docs/render-site-flow.sh` so `pnpm docs:site-flow` now
  refreshes all tracked Mermaid diagrams in `docs/system/`, not only the two
  site-flow files.
- Expanded `scripts/build/generate-docset.sh` so the Dash landing page,
  `architecture.html`, and `data-models.html` expose the new sequence diagrams
  and the runtime/persistence model map.
- Updated canonical docs and contributor guidance so the new diagrams have one
  clear home and one clear refresh path:
  `docs/architecture/principles.md`, `docs/architecture/audit-trail.md`,
  `docs/system/README.md`, `docs/tutorials/developer-guide.md`,
  `docs/reference/pnpm-scripts.md`, `docs/architecture/site-flow.md`, and
  `.github/CONTRIBUTING.md`.
- Extended `scripts/ci/verify-doc-artifacts.sh` so the new generated SVGs are
  treated as tracked documentation artifacts going forward.

## Verification

- `rtk pnpm docs:site-flow`
- `rtk pnpm docs:dash`
- `rtk pnpm exec markdownlint-cli2 docs/architecture/principles.md docs/architecture/audit-trail.md docs/system/README.md docs/tutorials/developer-guide.md docs/reference/pnpm-scripts.md docs/architecture/site-flow.md .github/CONTRIBUTING.md "backlog/tasks/task-155 - Expand-Dash-Docset-with-Sequence-and-Domain-Diagrams.md" --config .markdownlint-cli2.jsonc`
- `rtk bash scripts/ci/verify-doc-artifacts.sh`
  Result: the verifier regenerated all expected artifacts and then failed only
  because the newly added SVGs are new tracked outputs not yet committed in the
  worktree.
<!-- SECTION:NOTES:END -->
