---
id: TASK-226
title: Automate database migrations in staging deployment
status: Done
assignee: []
created_date: '2026-04-09 16:26'
updated_date: '2026-04-09 19:52'
labels: []
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Database migrations in staging currently require manual execution via SSH, which is error-prone and leads to downtime (e.g., ERR_MODULE_NOT_FOUND or 42P01 errors). We need to integrate migration execution into the Fly.io deployment process or the GitHub Action pipeline.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Migrations are automatically applied during deployment or via a post-deploy command.
- [ ] #2 Deployment pipeline fails if migrations fail.
- [ ] #3 No manual SSH commands required for schema updates.
<!-- AC:END -->
