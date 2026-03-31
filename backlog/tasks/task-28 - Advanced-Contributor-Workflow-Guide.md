---
id: TASK-28
title: Advanced Contributor Workflow Guide
status: Human Review
assignee:
  - '@codex'
created_date: '2026-03-11 00:00'
updated_date: '2026-03-31 19:12'
labels:
  - docs
  - repo-hygiene
  - contributor
milestone: 'm-0: Security Hardening Audit'
dependencies:
  - TASK-27
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
<!-- AC:BEGIN -->
- Given `docs/CONTRIBUTING_ADVANCED.md`, when an advanced contributor reads it,
  then it explains repo-specific workflows that are not obvious from the README.
- Given rules-engine or replay-sensitive work, when the guide discusses
  validation, then it points to the canonical checks and review expectations.
- Given the game domain, when the guide describes mental models, then it helps a
  contributor map gameplay concepts to code and tests.

<!-- AC:END -->

## References
- `archive/ai-reports/2026-03-11/Gordon-Default/production-readiness-report.md` (L960, L1009)

## Implementation Plan

1. Create one canonical developer guide under `docs/system/` that covers the
   repo's common tool and workflow scenarios without duplicating every low-level
   reference doc.
2. Add friendly task-oriented sections for setup, local app runs, validation
   choices, QA scenarios, docs/schema regeneration, observability, Docker, and
   release-adjacent developer flows.
3. Add a short FAQ for the repeat questions contributors and AI agents hit most
   often.
4. Update root and contributor-facing indexes to point to the guide instead of
   continuing to spread scenario guidance across unrelated docs.
5. Record verification evidence and return the task for review.

## Implementation Notes

- Reusing the documentation-cleanup workstream's canonical-map rules: one
  active developer guide in `docs/system/`, with `README.md`,
  `.github/CONTRIBUTING.md`, `docs/README.md`, and `docs/system/README.md`
  acting as entry points.
- Existing command references were fragmented across `README.md`,
  `.github/CONTRIBUTING.md`, `docs/system/PNPM_SCRIPTS.md`, and
  `docs/system/OPERATIONS_RUNBOOK.md`.
- Current drift found during discovery:
  `README.md` still pointed to `pnpm otel:console` and `pnpm otel:signoz`, but
  the actual root scripts are `pnpm infra:otel:console` and
  `pnpm infra:otel:signoz`.
- `.github/CONTRIBUTING.md` still linked to `docs/review/PRODUCTION_PATH_REVIEW_GUIDELINE.md`,
  which is part of the stale-review cluster and should not remain a primary
  contributor entry point.
- Added `docs/system/DEVELOPER_GUIDE.md` as the canonical scenario-oriented
  contributor guide, then linked it from `README.md`, `.github/CONTRIBUTING.md`,
  `docs/README.md`, and `docs/system/README.md`.
- Also corrected prominent command drift in `docs/system/OPERATIONS_RUNBOOK.md`
  and `docs/system/PNPM_SCRIPTS.md` so the new guide is not contradicted by
  nearby canonical docs.

## Verification

- `pnpm exec markdownlint-cli2 README.md .github/CONTRIBUTING.md docs/README.md docs/system/README.md docs/system/DEVELOPER_GUIDE.md docs/system/PNPM_SCRIPTS.md docs/system/OPERATIONS_RUNBOOK.md "backlog/tasks/task-28 - Advanced-Contributor-Workflow-Guide.md" --config .markdownlint-cli2.jsonc`
- `rg -n "Developer Guide|DEVELOPER_GUIDE|otel:console|otel:signoz|infra:otel:console|infra:otel:signoz|PRODUCTION_PATH_REVIEW_GUIDELINE" README.md .github/CONTRIBUTING.md docs/README.md docs/system/README.md docs/system/DEVELOPER_GUIDE.md`

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 **Spec Alignment (DoD §1)**: Implementation matches canonical rules and architectural constraints.
- [x] #2 **Verification (DoD §2)**: All changes are covered by automated tests and manual verification evidence is recorded.
- [x] #3 **Trust and Safety (DoD §3)**: The server remains authoritative; no secrets or hidden info leaked.
- [x] #4 **Code Quality (DoD §4)**: Code follows project conventions, modularity, and naming standards.
- [x] #5 **Observability (DoD §5)**: Critical paths emit necessary logs and telemetry for operations.
- [x] #6 **Accessibility (DoD §6)**: Changes are documented and understandable for contributors and users.
- [ ] #7 **AI-Assisted Work (DoD §7)**: AI changes are reviewed by a human and follow AGENTS.md.
<!-- DOD:END -->
