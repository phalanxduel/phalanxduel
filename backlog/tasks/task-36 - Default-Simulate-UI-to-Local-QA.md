---
id: TASK-36
title: Default Simulate-UI to Local QA
status: To Do
assignee: []
created_date: '2026-03-12 14:40'
updated_date: '2026-03-15 18:18'
labels: []
dependencies: []
ordinal: 16000
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
- [ ] #1 The primary simulate-ui workflow no longer defaults silent QA runs to production.
- [ ] #2 Operators get an explicit warning or override when a simulate-ui run targets production.
<!-- AC:END -->
