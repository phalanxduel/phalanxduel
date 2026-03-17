---
id: TASK-64
title: "Standardize Environment Variables Documentation"
status: To Do
priority: MEDIUM
assignee: null
parent: TASK-50
labels:
  - documentation
  - operations
created: "2025-03-17"
updated: "2025-03-17"
---

# TASK-64: Standardize Environment Variables Documentation

## Description

Create canonical reference for all environment variables used by app, server, and containers. Separate sections for dev/prod/self-hosted.

## Acceptance Criteria

- [ ] File: docs/system/ENVIRONMENT_VARIABLES.md
- [ ] Each var: name, purpose, default, required/optional, example
- [ ] Sections: Development, Production (Fly.io), Self-hosted
- [ ] Links to secret management docs
- [ ] Referenced from README + docs index
- [ ] Comments in Dockerfile

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

