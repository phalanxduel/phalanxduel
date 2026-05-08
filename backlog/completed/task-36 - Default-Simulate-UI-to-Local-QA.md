---
id: TASK-36
title: Default Simulate-UI to Local QA
status: Done
assignee: []
created_date: '2026-03-12 14:40'
updated_date: '2026-05-02 12:29'
labels:
  - qa
  - tooling
  - ui
milestone: v0.5.0 - Stability & Playability
dependencies:
  - TASK-35
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Promote the `simulate-ui.ts` production-default hazard into tracked backlog
work. QA automation should be local-safe by default, with explicit operator
intent required before a run targets production.

## Problem Scenario

Given an engineer or automation flow runs `simulate-ui`, when they do not
override the target explicitly, then the command can point at production-like
infrastructure instead of the intended local QA environment.

## Planned Change

Reverse the default so local QA is the safe path and production targeting
requires an explicit opt-in. This plan protects the most common workflow first
and makes high-risk production targeting deliberate instead of accidental.

## Delivery Steps

- Given the current `simulate-ui` entry point, when defaults are updated, then
  local QA becomes the primary target.
- Given a production target is still sometimes necessary, when an operator
  chooses it, then the workflow requires an explicit confirmation or override.
- Given silent mis-targeting is the risk, when the command runs, then the chosen
  environment is visible to the operator.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The primary simulate-ui workflow no longer defaults silent QA runs to production.
- [x] #2 Operators get an explicit warning or override when a simulate-ui run targets production.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
AC1 was already satisfied: default baseUrl is `http://127.0.0.1:5173`. AC2 implemented: added a `console.warn` after OPTIONS is parsed that fires when `!isLocalBaseUrl(OPTIONS.baseUrl)`, printing the non-local target URL and a local alternative hint. pnpm check passes.
<!-- SECTION:FINAL_SUMMARY:END -->

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
