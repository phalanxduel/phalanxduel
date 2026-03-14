---
id: TASK-28
title: Advanced Contributor Workflow Guide
status: Planned
assignee: []
created_date: ''
updated_date: '2026-03-14 03:01'
labels: []
dependencies: []
priority: high
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The repo already contains deep engineering conventions around Backlog usage,
rules-safe changes, replay integrity, and multi-package QA, but most of that
knowledge is scattered across plans and internal docs. This task creates one
advanced contributor guide for engineers who need the repo-specific workflows
that go beyond the basic README.

## Problem Scenario

Given an experienced engineer joins the project, when they need to perform
non-trivial work, then the basic docs do not give them a single place to learn
the repo's deeper workflows, review expectations, and Phalanx-specific mental
models.

## Planned Change

Create an advanced contributing guide that connects repo workflow, game-domain
mental models, and high-signal validation practices. The plan favors one
maintained guide over more scattered ad hoc notes so advanced contributors can
become productive faster without reading historical implementation plans first.

## Delivery Steps

- Given the existing workflow docs, when the guide is written, then it links the
  most important advanced flows instead of duplicating every detail.
- Given deeper engineering tasks, when contributors read the guide, then they
  understand rules-safe change expectations, replay/hash concerns, and
  cross-package validation patterns.
- Given onboarding, when someone moves from basic to advanced work, then there
  is a clear next-step document instead of hidden tribal knowledge.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

- Given `docs/CONTRIBUTING_ADVANCED.md`, when an advanced contributor reads it,
  then it explains repo-specific workflows that are not obvious from the README.
- Given rules-engine or replay-sensitive work, when the guide discusses
  validation, then it points to the canonical checks and review expectations.
- Given the game domain, when the guide describes mental models, then it helps a
  contributor map gameplay concepts to code and tests.

## References
- `archive/ai-reports/2026-03-11/Gordon-Default/production-readiness-report.md` (L960, L1009)
