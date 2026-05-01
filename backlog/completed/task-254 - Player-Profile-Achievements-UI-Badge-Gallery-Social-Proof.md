---
id: TASK-254
title: 'Player Profile Achievements UI: Badge Gallery & Social Proof'
status: Done
assignee: []
created_date: '2026-04-30 22:32'
updated_date: '2026-05-01 16:36'
labels:
  - client
  - ui
  - ux
milestone: 'Wave 4: Player Engagement & Achievements'
dependencies: []
priority: medium
ordinal: 4030
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build the user interface for viewing achievements on the public player profile. This creates social proof and provides a sense of progression for the player.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 #1 Update the Player Profile page to show a gallery of earned badges.
- [x] #2 #2 Each badge displays an emoji, a title, the date earned, and a link to the match replay.
- [x] #3 #3 Implement a 'Locked' state for unearned achievements to encourage discovery.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
PublicProfileView in lobby.tsx now fetches /api/users/:userId/achievements in parallel with the profile. Renders all 18 achievement types as an emoji badge grid: earned badges show emoji + title with green border; unearned show ??? with 35% opacity. Clicking an earned badge that has a matchId opens the replay viewer. All 326 server + 195 client + 236 engine tests passing.
<!-- SECTION:FINAL_SUMMARY:END -->
