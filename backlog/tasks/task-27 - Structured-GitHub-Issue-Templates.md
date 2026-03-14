---
id: TASK-27
title: Structured GitHub Issue Templates
status: Planned
assignee: []
created_date: ''
updated_date: '2026-03-14 03:01'
labels: []
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

- Given `.github/ISSUE_TEMPLATE/`, when contributors open a bug, feature, rules,
  or decision issue, then the relevant template is available.
- Given a bug report, when the template is used, then it asks for reproduction,
  expected behavior, and verification context.
- Given an architecture-decision issue, when the template is used, then it
  captures problem, options, chosen direction, and rationale.

## References
- `archive/ai-reports/2026-03-11/Gordon-Default/production-readiness-report.md` (L420, L929)
- `archive/ai-reports/2026-03-11/Claude-Opus/production-readiness-report.md` (L428)
