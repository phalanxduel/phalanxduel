---
id: TASK-221
title: Fix Schema.org gamePlatform from Tabletop to Web Browser
status: To Do
assignee: []
created_date: '2026-04-07 02:44'
labels:
  - site
  - seo
  - p1
  - promotion-readiness
dependencies:
  - TASK-217
references:
  - ../site/_layouts/default.html
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The site structured data (JSON-LD in default.html) lists gamePlatform as Tabletop. This is incorrect — the digital game is a web browser application. Should be Web Browser or an array including both.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Schema.org gamePlatform is set to Web Browser
- [ ] #2 Schema validation passes with correct gamePlatform
<!-- AC:END -->
