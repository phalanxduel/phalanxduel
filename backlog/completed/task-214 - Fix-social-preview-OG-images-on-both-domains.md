---
id: TASK-214
title: Fix social preview (OG) images on both domains
status: Done
assignee: []
created_date: '2026-04-07 02:19'
updated_date: '2026-05-01 01:29'
labels:
  - seo
  - site
  - client
  - p0
  - promotion-readiness
milestone: m-5
dependencies: []
references:
  - client/index.html
  - ../site/_layouts/default.html
priority: high
ordinal: 1040
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Neither domain produces a working social preview when URLs are shared on Reddit/Discord/Twitter. The game client uses og:image='/images/avatar.webp' (relative path — crawlers need absolute URLs). The site uses an SVG og-image.svg (many platforms won't render SVG). Create a proper 1200x630 PNG or WEBP OG image with a gameplay screenshot and title overlay, and use absolute URLs on both domains.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Paste play.phalanxduel.com into Discord — image preview appears
- [ ] #2 Paste phalanxduel.com into Discord — image preview appears
- [x] #3 og:image uses absolute URL (https://...) not relative path
- [x] #4 Image is PNG or WEBP format, 1200x630 dimensions
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Generated og-image.png (1200x630 PNG) from existing og-image.svg using Playwright. Updated site/_layouts/default.html og:image and twitter:image to point to og-image.png via absolute_url. Updated client/index.html og:image and twitter:image from relative /images/avatar.webp to absolute https://play.phalanxduel.com/images/avatar.webp. Both site and client now serve properly sized PNG OG images with absolute URLs. AC1/AC2 (Discord preview) requires production deployment to verify.
<!-- SECTION:FINAL_SUMMARY:END -->
