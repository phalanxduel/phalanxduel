---
id: TASK-187
title: Fix muted text contrast to WCAG AA
status: Planned
assignee: []
created_date: '2026-04-04 12:00'
labels:
  - a11y
  - ui
dependencies: []
references:
  - client/src/style.css
  - backlog/decisions/decision-028 - DEC-2G-001 - Client UI-UX audit and remediation plan.md
priority: low
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
- [ ] #1 `--text-muted` contrast ratio against `--bg` meets WCAG AA (>= 4.5:1)
- [ ] #2 `--text-dim` contrast ratio against `--bg` meets WCAG AA (>= 4.5:1)
- [ ] #3 Updated colors maintain the visual design language (warm, muted gold palette)
- [ ] #4 All uses of `--text-muted` and `--text-dim` reviewed for readability
<!-- AC:END -->

## Verification

```bash
# Verify contrast ratios (manual or tool-assisted)
# --text-muted on --bg must be >= 4.5:1
# --text-dim on --bg must be >= 4.5:1

pnpm --filter @phalanxduel/client test
# Expected: all tests pass

pnpm -r test
# Expected: no regressions
```

## QA Impact

No QA automation changes expected. CSS variable changes are purely visual.

## Changelog

```markdown
### Fixed
- **Readability**: Muted text throughout the interface is now easier to read,
  meeting accessibility contrast standards. Stats, labels, and secondary
  information are clearer without changing the visual design.
```

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] Both CSS variables updated to WCAG AA compliant values (>= 4.5:1)
- [ ] Visual design language preserved (warm gold palette)
- [ ] `pnpm -r test` passes
- [ ] `pnpm qa:playthrough:run` succeeds
- [ ] No existing tests broken
<!-- DOD:END -->
