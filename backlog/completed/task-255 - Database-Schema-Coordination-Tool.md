---
id: TASK-255
title: Database Schema Coordination Tool
status: Done
assignee: []
created_date: '2026-05-01 22:31'
updated_date: '2026-05-02 12:50'
labels: []
dependencies: []
priority: medium
ordinal: 129000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement a database schema coordination tool to ensure alignment across development, test, staging, and production environments. The tool should use pg_dump to identify structural drifts and check the migrations table for version parity.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 pnpm db:diff-report script exists in root package.json
- [x] #2 scripts/maint/db-schema-diff.ts successfully compares schemas across environments
- [x] #3 Script filters out noise (extensions, search_path, etc.) for clean diffs
- [x] #4 Latest migration version is reported for each environment
<!-- AC:END -->
