---
id: DRAFT-003
title: V2-GODOT-038 - Steam-native Lobby & Matchmaking Integration
status: Draft
assignee: []
created_date: ''
updated_date: '2026-06-18 23:26'
labels: []
dependencies:
  - DRAFT-001
---

## Description
Integrate Steam Lobbies as a native matchmaking alternative for PvP/PvB.

## Requirements
- Map `Lobby.gd` signaling to `Steam.createLobby()` / `Steam.joinLobby()`.
- Synchronize Steam-Lobby state with the backend-authoritative match state.

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-06-18 23:25
---
Deferred by Codex on 2026-06-18 cleanup pass. Steam-native lobby/matchmaking is not in scope while the user is avoiding Steam accounts and core service-internal changes.
---
<!-- COMMENTS:END -->
