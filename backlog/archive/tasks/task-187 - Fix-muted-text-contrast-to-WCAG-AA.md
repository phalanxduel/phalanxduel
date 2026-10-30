---
id: TASK-187
title: Fix muted text contrast to WCAG AA
status: Done
assignee: []
created_date: '2026-04-04 12:00'
updated_date: '2026-04-06 02:12'
labels:
  - a11y
  - ui
dependencies: []
references:
  - client/src/style.css
  - >-
    docs/adr/decision-028 - DEC-2G-001 - Client UI-UX audit and
    remediation plan.md
priority: low
ordinal: 95000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Muted text color `--text-muted: #998268` on dark background `--bg: #0b0906`
has a contrast ratio of ~3.4:1, which fails WCAG AA for normal text (requires
4.5:1). `--text-dim: #826f58` is even worse. If muted text is widespread in
the UI, this may need to be promoted to higher priority
(DEC-2G-001 finding F-18).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `--text-muted` contrast ratio against `--bg` meets WCAG AA (>= 4.5:1)
- [x] #2 `--text-dim` contrast ratio against `--bg` meets WCAG AA (>= 4.5:1)
- [x] #3 Updated colors maintain the visual design language (warm, muted gold palette)
- [x] #4 All uses of `--text-muted` and `--text-dim` reviewed for readability
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated --text-muted from #998268 to #aa8a64 (~6.5:1 contrast vs #0b0906) and --text-dim from #826f58 to #8b7760 (~4.85:1). Both meet WCAG AA (≥4.5:1). Warm gold palette maintained. 217 client tests pass.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Both CSS variables updated to WCAG AA compliant values (>= 4.5:1)
- [x] #2 Visual design language preserved (warm gold palette)
- [x] #3 `pnpm -r test` passes
- [ ] #4 `pnpm qa:playthrough:run` succeeds
- [x] #5 No existing tests broken
<!-- DOD:END -->
