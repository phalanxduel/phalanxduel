---
id: TASK-212
title: Remove committed production secrets and rotate credentials
status: To Do
assignee: []
created_date: '2026-04-07 02:16'
updated_date: '2026-04-30 22:14'
labels:
  - security
  - infra
  - p0
  - promotion-readiness
milestone: m-4
dependencies: []
references:
  - .env.production
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
.env.production is committed to the repo containing real DATABASE_URL (with password), JWT_SECRET, PHALANX_ADMIN_PASSWORD, and PHALANX_ADMIN_USER. If the repo is public or shared for promotion, these are immediately compromised. Remove the file, ensure .gitignore catches it, and rotate all exposed secrets via Fly.io secrets management.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 No .env.production file tracked in git (git ls-files .env.production returns empty)
- [ ] #2 All exposed secrets rotated: DB password, JWT secret, admin password
- [ ] #3 Fly.io secrets set for DATABASE_URL, JWT_SECRET, PHALANX_ADMIN_PASSWORD, PHALANX_ADMIN_USER
- [ ] #4 Server health check passes after rotation
<!-- AC:END -->
