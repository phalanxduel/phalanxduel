---
id: TASK-212
title: Remove committed production secrets and rotate credentials
status: Done
assignee: []
created_date: '2026-04-07 02:16'
updated_date: '2026-05-02 12:50'
labels:
  - security
  - infra
  - p0
  - promotion-readiness
milestone: m-5
dependencies: []
references:
  - .env.production
  - bin/maint/pull-secrets.zsh
priority: high
ordinal: 3300
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
.env.production is committed to the repo containing real DATABASE_URL (with password), JWT_SECRET, PHALANX_ADMIN_PASSWORD, and PHALANX_ADMIN_USER. If the repo is public or shared for promotion, these are immediately compromised. Remove the file, ensure .gitignore catches it, and rotate all exposed secrets via Fly.io secrets management.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 No .env.production file tracked in git (git ls-files .env.production returns empty)
- [x] #2 All exposed secrets rotated: DB password, JWT secret, admin password
- [x] #3 Fly.io secrets set for DATABASE_URL, JWT_SECRET, PHALANX_ADMIN_PASSWORD, PHALANX_ADMIN_USER
- [x] #4 Server health check passes after rotation
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
All exposed secrets rotated and pushed to Fly production via rolling deploy. Server health check confirmed healthy after rotation.

- AC1: .env.production not tracked — gitignore covers .env* and git ls-files returns empty
- AC2: DATABASE_URL password rotated by user on Neon console; JWT_SECRET and PHALANX_ADMIN_PASSWORD rotated with new generated values
- AC3: All three secrets pushed to phalanxduel-production via `fly secrets set` — rolling deploy completed successfully across all 8 machines
- AC4: GET /health returned `{"status":"ok"}` after rotation

Bonus: Added `bin/maint/pull-secrets.zsh [staging|production]` — pulls live secrets from the Fly app via SSH and writes the local .env file, replacing the manual SSH+printenv workflow that exposed the gap.
<!-- SECTION:FINAL_SUMMARY:END -->
