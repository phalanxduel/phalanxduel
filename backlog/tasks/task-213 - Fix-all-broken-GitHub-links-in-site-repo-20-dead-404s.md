---
id: TASK-213
title: Fix all broken GitHub links in site repo (20+ dead 404s)
status: To Do
assignee: []
created_date: '2026-04-07 02:18'
labels:
  - site
  - content
  - p0
  - promotion-readiness
dependencies: []
references:
  - ../site/faq.md
  - ../site/status.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
All external GitHub links across the site repo point to github.com/phalanxduel/phalanxduel (non-existent) instead of github.com/phalanxduel/game. Doc paths are also wrong: docs/formats/duel/RULES.md should be docs/RULES.md, docs/system/TASKS.md does not exist, docs/system/CONTRIBUTING.md should be .github/CONTRIBUTING.md. Affected files: faq.md, status.md, roadmap.md, build-with-phalanx.md, support.md, contribute/index.md, contribute/playtesting.md, CONTRIBUTING.md. This is the kind of thing Reddit commenters call out immediately.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 grep -r phalanxduel/phalanxduel across site repo returns 0 results
- [ ] #2 All external GitHub links resolve (no 404s) — spot-check 5 links manually
- [ ] #3 Doc paths match actual game repo structure
<!-- AC:END -->
