---
id: TASK-116
title: Document Game Logic and State Machine Constraints in API Specs
status: Planned
assignee: []
created_date: '2026-03-29 18:12'
labels: []
milestone: v0.5.0 - Stability & Playability
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A schema-valid message can still be semantically invalid (e.g., a 'deploy' action sent during 'AttackPhase'). This task formalizes the state machine constraints in the API documentation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Add 'description' fields to each WebSocket action schema in shared/src/schema.ts or docs/api/asyncapi.yaml explaining valid phases and requirements.
- [ ] #2 Add Zod constraints (min/max/regex) to numeric and string fields in action schemas so they appear in the OpenAPI/AsyncAPI outputs.
- [ ] #3 Add a top-level OpenAPI description that formally links to docs/RULES.md as the authoritative logic source for clients.
<!-- AC:END -->
