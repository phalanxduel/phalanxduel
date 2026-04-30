---
id: TASK-250
title: 'Semantic Event Normalization: Enrich transactionLog with cause tags'
status: To Do
assignee: []
created_date: '2026-04-30 22:00'
labels:
  - engine
  - ui
  - combat-fidelity
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Enrich the transactionLog to include explicit cause tags for combat events. This is the next phase of Combat Explanation Fidelity, allowing the UI to explain WHY damage was doubled or absorbed, rather than just WHAT happened.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 Add explicit cause tags (e.g., 'CLUB BONUS', 'HEART SHIELD', 'REINFORCE') to the transactionLog payload in the shared state model.
- [ ] #2 #2 Update the rules engine to emit these tags during combat resolution.
- [ ] #3 #3 Update the combat log and UI banner to consume and display these enriched explanations.
<!-- AC:END -->
