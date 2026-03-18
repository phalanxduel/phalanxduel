---
id: TASK-64
title: Standardize Environment Variables Documentation
status: Done
assignee:
  - 'null'
created_date: ''
updated_date: '2026-03-18 02:47'
labels:
  - documentation
  - operations
dependencies: []
priority: medium
ordinal: 36000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create canonical reference for all environment variables used by app, server, and containers. Separate sections for dev/prod/self-hosted.
<!-- SECTION:DESCRIPTION:END -->

# TASK-64: Standardize Environment Variables Documentation

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 File: docs/system/ENVIRONMENT_VARIABLES.md
- [x] #2 Each var: name, purpose, default, required/optional, example
- [x] #3 Sections: Development, Production (Fly.io), Self-hosted
- [x] #4 Links to secret management docs
- [x] #5 Referenced from README + docs index
- [x] #6 Comments in Dockerfile

## Implementation

Audit codebase for all env var usage; document each.

## Verification

Manual review for completeness.

## Risk Assessment

**Risk Level**: None — Documentation only

---

**Effort Estimate**: 1.5 hours  
**Priority**: MEDIUM (Operational clarity)  
**Complexity**: Low (documentation)
<!-- AC:END -->
