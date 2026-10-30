---
id: TASK-222
title: Harmonize game client visual identity with STYLE_GUIDE.md
status: Done
assignee:
  - '@claude'
created_date: '2026-04-07 02:54'
updated_date: '2026-04-07 14:19'
labels:
  - client
  - design
  - p1
  - promotion-readiness
dependencies:
  - TASK-211
references:
  - ../site/STYLE_GUIDE.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Game client uses Cinzel+Crimson Pro+gold, but STYLE_GUIDE.md prescribes Inter+JetBrains Mono with Red/Blue suit families on Deep Space background. Align the client to the canonical style guide for visual continuity across the site-to-game transition.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Client uses Inter for display and JetBrains Mono for data elements
- [x] #2 Suit colors match style guide: Red #FF3E3E for Hearts/Diamonds, Blue #3E82FF for Clubs/Spades
- [x] #3 Background uses Deep Space #050505 and Bunker Grey #0F0F0F
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Commit df8bb1c7: Full color scheme alignment with STYLE_GUIDE.md. Fonts: Cinzel/Crimson Pro/IBM Plex Mono → Inter/JetBrains Mono. Suit colors: #e03030/#3a6ea8 → #FF3E3E/#3E82FF. Background: #0b0906 → #050505 Deep Space, #151009 → #0F0F0F Bunker Grey. Gold accent system replaced with neutral grey. All hardcoded rgba gold values, favicon, and test expectations updated. bin/check passes.
<!-- SECTION:FINAL_SUMMARY:END -->
