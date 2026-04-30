---
id: TASK-213
title: Fix all broken GitHub links in site repo (20+ dead 404s)
status: Ready
assignee: []
created_date: '2026-04-07 02:18'
updated_date: '2026-04-30 22:23'
labels:
  - site
  - content
  - p0
  - promotion-readiness
milestone: m-5
dependencies: []
references:
  - ../site/faq.md
  - ../site/status.md
priority: high
ordinal: 1030
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Site repo links to several doc paths that no longer exist in the game repo (github.com/phalanxduel/phalanxduel). The GitHub repo name is correct, but the doc paths within it are stale. Paths needing correction: docs/formats/duel/RULES.md should be docs/gameplay/rules.md. docs/system/PROTOCOL.md, docs/system/CLIENT_CONTRACT.md, docs/system/TESTPLAN.md, docs/system/TASKS.md do not exist — remove or replace with valid links. docs/system/CONTRIBUTING.md should be .github/CONTRIBUTING.md. docs/architecture/principles.md is correct. Affected files: faq.md, status.md, roadmap.md, build-with-phalanx.md, support.md, contribute/index.md, contribute/playtesting.md, CONTRIBUTING.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 grep -r phalanxduel/phalanxduel across site repo returns 0 results
- [ ] #2 All external GitHub links resolve (no 404s) — spot-check 5 links manually
- [ ] #3 Doc paths match actual game repo structure
- [ ] #4 All external GitHub doc links resolve (no 404s) — spot-check 5 links manually
- [ ] #5 docs/formats/duel/RULES.md references updated to docs/gameplay/rules.md
- [ ] #6 docs/system/CONTRIBUTING.md references updated to .github/CONTRIBUTING.md
- [ ] #7 References to non-existent files (PROTOCOL.md, CLIENT_CONTRACT.md, TESTPLAN.md, TASKS.md) removed or replaced with valid alternatives
<!-- AC:END -->
