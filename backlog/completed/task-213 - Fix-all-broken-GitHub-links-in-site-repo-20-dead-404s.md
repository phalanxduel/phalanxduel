---
id: TASK-213
title: Fix all broken GitHub links in site repo (20+ dead 404s)
status: Done
assignee: []
created_date: '2026-04-07 02:18'
updated_date: '2026-05-01 01:14'
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
- [x] #2 All external GitHub links resolve (no 404s) — spot-check 5 links manually
- [x] #3 Doc paths match actual game repo structure
- [x] #4 All external GitHub doc links resolve (no 404s) — spot-check 5 links manually
- [x] #5 docs/formats/duel/RULES.md references updated to docs/gameplay/rules.md
- [x] #6 docs/system/CONTRIBUTING.md references updated to .github/CONTRIBUTING.md
- [x] #7 References to non-existent files (PROTOCOL.md, CLIENT_CONTRACT.md, TESTPLAN.md, TASKS.md) removed or replaced with valid alternatives
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed stale doc paths in site/status.md and site/build-with-phalanx.md. Mapping applied: docs/RULES.md → docs/gameplay/rules.md, docs/api/openapi.yaml → docs/api/openapi.json, docs/system/ARCHITECTURE.md → docs/architecture/principles.md, docs/system/TELEMETRY.md → docs/ops/slo.md, docs/system/SITE_FLOW.md → docs/architecture/site-flow.md, docs/system/CLIENT_COMPATIBILITY.md → docs/reference/client-compatibility.md, docs/system/DEVELOPER_GUIDE.md → docs/tutorials/developer-guide.md. Committed to phalanxduel/site repo. AC1 note: grep for phalanxduel/phalanxduel still returns results — those are correct links to the GitHub repo (the repo IS named phalanxduel/phalanxduel), only the internal paths were stale.
<!-- SECTION:FINAL_SUMMARY:END -->
