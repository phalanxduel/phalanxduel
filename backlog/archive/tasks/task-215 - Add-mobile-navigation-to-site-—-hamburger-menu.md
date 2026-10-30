---
id: TASK-215
title: Add mobile navigation to site — hamburger menu
status: Done
assignee: []
created_date: '2026-04-07 02:29'
updated_date: '2026-05-01 01:33'
labels:
  - site
  - ux
  - responsive
  - p0
  - promotion-readiness
milestone: m-5
dependencies: []
references:
  - ../site/assets/css/site.css
priority: high
ordinal: 1050
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On mobile viewports below 768px, the site CSS hides .nav-list entirely with no hamburger menu replacement. Mobile users lose ALL navigation including the Play Now CTA. Add a CSS/JS hamburger or drawer menu. At minimum keep the Play Now button visible.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 phalanxduel.com on 375px viewport shows accessible navigation
- [x] #2 Play Now CTA is visible and clickable on mobile
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added hamburger menu to site/_includes/header.html with accessible aria-expanded/aria-controls attributes. Added CSS in site.css: hamburger button (hidden on desktop via display:none, shown on mobile), animated X/close transform, and absolute-positioned dropdown nav-list that opens on toggle (.nav-open class). Added toggle JS in default.html that fires on DOMContentLoaded — closes menu on nav link click. Play Now CTA is in the nav-list and visible when menu is open.
<!-- SECTION:FINAL_SUMMARY:END -->
