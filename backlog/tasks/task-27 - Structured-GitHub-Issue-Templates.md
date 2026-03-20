---
id: TASK-27
title: Structured GitHub Issue Templates
status: Planned
assignee: []
created_date: ''
updated_date: '2026-03-20 21:40'
labels:
  - docs
  - repo-hygiene
  - github
dependencies: []
priority: high
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Issue intake is part of the product-development surface. Without structured
templates, bugs, feature ideas, rules questions, and architecture proposals all
arrive with different levels of detail, which slows triage and creates avoidable
ambiguity.

## Problem Scenario

Given contributors open GitHub issues today, when maintainers triage them, then
the reports do not reliably capture reproduction steps, value case, rule impact,
or decision framing in a consistent way.

## Planned Change

Add opinionated issue templates for bugs, feature requests, rules
clarifications, and architecture decisions. This plan improves intake quality at
the earliest point instead of asking every reviewer to reconstruct missing
context manually.

## Delivery Steps

- Given the repo's main issue types, when the template set is added, then each
  issue category asks for the minimum information needed to act on it.
- Given rules-sensitive and architecture-sensitive work, when those templates
  are used, then they capture options, rationale, and rule impact explicitly.
- Given maintainers triage issues, when new reports arrive, then the issue body
  is more testable and comparable across categories.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- Given `.github/ISSUE_TEMPLATE/`, when contributors open a bug, feature, rules,
  or decision issue, then the relevant template is available.
- Given a bug report, when the template is used, then it asks for reproduction,
  expected behavior, and verification context.
- Given an architecture-decision issue, when the template is used, then it
  captures problem, options, chosen direction, and rationale.

<!-- AC:END -->

## References
- `archive/ai-reports/2026-03-11/Gordon-Default/production-readiness-report.md` (L420, L929)
- `archive/ai-reports/2026-03-11/Claude-Opus/production-readiness-report.md` (L428)

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 **Spec Alignment (DoD §1)**: Implementation matches canonical rules and architectural constraints.
- [ ] #2 **Verification (DoD §2)**: All changes are covered by automated tests and manual verification evidence is recorded.
- [ ] #3 **Trust and Safety (DoD §3)**: The server remains authoritative; no secrets or hidden info leaked.
- [ ] #4 **Code Quality (DoD §4)**: Code follows project conventions, modularity, and naming standards.
- [ ] #5 **Observability (DoD §5)**: Critical paths emit necessary logs and telemetry for operations.
- [ ] #6 **Accessibility (DoD §6)**: Changes are documented and understandable for contributors and users.
- [ ] #7 **AI-Assisted Work (DoD §7)**: AI changes are reviewed by a human and follow AGENTS.md.
<!-- DOD:END -->
