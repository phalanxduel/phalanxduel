---
id: TASK-229
title: 'Update engine tests to support restricted system:init action type'
status: Completed
assignee:
  - Gemini CLI
created_date: '2026-04-12 17:09'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update all engine unit tests in engine/tests/ to pass { allowSystemInit: true } when calling applyAction or validateAction with a 'system:init' action type. This is required because I narrowed the engine to reject system:init by default unless explicitly allowed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All engine unit tests listed pass { allowSystemInit: true } when calling applyAction or validateAction with 'system:init' action.
- [ ] #2 Tests pass without errors.
- [ ] #3 ApplyActionOptions is imported if required.
<!-- AC:END -->
