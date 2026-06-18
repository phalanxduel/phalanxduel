---
id: DRAFT-005
title: V2-GODOT-040 - Card Visual Parity Implementation
status: Draft
assignee: []
created_date: ''
updated_date: '2026-06-18 23:26'
labels: []
dependencies:
  - TASK-328.02
---

## Description
Implement the rendering logic in `CardView.gd` to ensure visual parity with the browser-based card design (suit, face, value).

## Requirements
- Consume `card_data` (suit, face, value).
- Use `ThemeManager` for color consistency.
- Implement UI rendering (Label/Icon) to reflect the card's suit and face.
- Register visual components with `data_test_id` for automation.

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-06-18 23:25
---
Deferred by Codex on 2026-06-18 cleanup pass. This is a Godot visual parity concern, not Steam platform integration. Keep it behind TASK-328.02 until artifact capture and parity evidence are stable; then reshape it with acceptance criteria before implementation.
---
<!-- COMMENTS:END -->
