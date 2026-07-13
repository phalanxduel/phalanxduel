---
id: decision-009
title: 'DEC-2C-004 - Official spectator delay policy'
status: locked
owner: Project Owner
date: 2026-02-26
---

# DEC-2C-004 - Official spectator delay policy

Official spectator delay policy minimum floor is `2` turns with default `3` turns; event-configurable override allowed.

Live frames are reconstructed from the authoritative action history and must
satisfy `visibleTurn <= authoritativeTurn - delay`. Reconstruction errors fail
closed: current state is never substituted. The delay applies while the match
is live; terminal replay follows the completed-match visibility lifecycle in
`docs/gameplay/rules.md` §21.5.
