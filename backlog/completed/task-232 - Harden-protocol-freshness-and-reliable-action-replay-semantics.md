---
id: TASK-232
title: Harden protocol freshness and reliable-action replay semantics
status: Done
assignee:
  - '@antigravity'
created_date: '2026-04-13 03:50'
updated_date: '2026-04-16 18:53'
labels:
  - qa
  - protocol
  - fairness
  - server
  - client
  - shared
dependencies: []
references:
  - reports/qa/test-council-audit.md
  - server/src/app.ts
  - client/src/connection.ts
  - client/src/game-preact.tsx
  - shared/src/schema.ts
priority: high
ordinal: 100
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The test council audit found a fairness-critical protocol gap: gameplay actions are not bound to the authoritative state the player saw, and duplicate reliable-message replay can trigger extra state fanout. Add protocol-level freshness protection so stale, late, replayed, or reconnect-flushed actions cannot apply in a later legal window than intended, and tighten receipt replay behavior so duplicate deliveries are safe without amplifying match-state broadcasts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Gameplay action messages include an explicit freshness token or equivalent protocol binding to authoritative turn or state version
- [ ] #2 Server rejects stale late or replayed action submissions over both WebSocket and REST without mutating authoritative state
- [ ] #3 Duplicate reliable action deliveries do not trigger extra gameplay fanout beyond the original accepted result path
- [ ] #4 Reconnect-time queued actions are revalidated or invalidated before flush so outdated intent cannot apply in a later legal window
- [ ] #5 Negative tests cover duplicate action msgId replay stale reconnect-flushed action out-of-order authenticate/rejoin/action sequencing and ACK-loss retry behavior
<!-- AC:END -->
