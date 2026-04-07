---
id: TASK-214
title: Fix social preview (OG) images on both domains
status: To Do
assignee: []
created_date: '2026-04-07 02:19'
labels:
  - seo
  - site
  - client
  - p0
  - promotion-readiness
dependencies: []
references:
  - client/index.html
  - ../site/_layouts/default.html
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Neither domain produces a working social preview when URLs are shared on Reddit/Discord/Twitter. The game client uses og:image='/images/avatar.webp' (relative path — crawlers need absolute URLs). The site uses an SVG og-image.svg (many platforms won't render SVG). Create a proper 1200x630 PNG or WEBP OG image with a gameplay screenshot and title overlay, and use absolute URLs on both domains.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Paste play.phalanxduel.com into Discord — image preview appears
- [ ] #2 Paste phalanxduel.com into Discord — image preview appears
- [ ] #3 og:image uses absolute URL (https://...) not relative path
- [ ] #4 Image is PNG or WEBP format, 1200x630 dimensions
<!-- AC:END -->
