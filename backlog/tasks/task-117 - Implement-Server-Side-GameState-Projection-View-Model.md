---
id: TASK-117
title: Implement Server-Side GameState Projection (View Model)
status: Done
assignee:
  - '@codebase_investigator'
  - '@generalist'
created_date: '2026-03-29 22:14'
updated_date: '2026-03-30 00:17'
labels:
  - api
  - decoupling
  - contract
milestone: m-1
dependencies: []
references:
  - /Users/mike/github.com/just3ws/lawnstarter-engineer-assessment
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The server currently broadcasts the raw 'GameState' to all clients. To fully decouple the UI and enforce an authoritative server model, the server must project a 'View Model' tailored to the specific viewer (Player 1, Player 2, or Spectator). This model must redact hidden information (fog of war) and explicitly list valid actions the user can currently take.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Create a ViewModel schema that redacts opponent hidden information based on viewer identity.
- [x] #2 Create a ViewModel schema that includes 'validActions' array indicating what the viewer is legally allowed to do in the current phase.
- [x] #3 Update the WebSocket broadcast logic to send the ViewModel instead of the raw GameState to clients.
- [x] #4 Update the OpenAPI specs to document the ViewModel structure instead of the raw GameState.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
TASK-117 was implemented in commit b669e36.

Key achievements:
1. Created identity-aware ViewModels (Player 0, Player 1, Spectator) in `@phalanxduel/shared`.
2. Implemented redaction logic to enforce "Fog of War".
3. Added `validActions` discovery to the ViewModel.
4. Refactored MatchManager to broadcast projected ViewModels.
5. Updated OpenAPI specs and contract snapshots.
<!-- SECTION:FINAL_SUMMARY:END -->
