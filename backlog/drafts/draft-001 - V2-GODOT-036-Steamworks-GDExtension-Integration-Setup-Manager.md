---
id: DRAFT-001
title: V2-GODOT-036 - Steamworks GDExtension Integration (Setup & Manager)
status: Draft
assignee: []
created_date: ''
updated_date: '2026-06-18 23:26'
labels: []
dependencies:
  - TASK-328.18
---

## Description
Integrate `godot-steam` GDExtension to enable native Steamworks API access in the Godot client.

## Requirements
- Add pre-compiled binaries to `godot/client/addons/`.
- Configure `project.godot` for extension loading.
- Create `SteamManager.gd` singleton to handle initialization.
- Implement headless stubbing for CI/QA parity stability.

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-06-18 23:25
---
Deferred by Codex on 2026-06-18 cleanup pass. Do not start Steamworks GDExtension work until the Godot parity exit gate is complete and a human explicitly confirms Steam account/platform setup is in scope. No account creation, Steam auth-ticket backend work, or core service-internal changes are approved right now.
---
<!-- COMMENTS:END -->
