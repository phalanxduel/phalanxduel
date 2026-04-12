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
- [x] #1 File: docs/reference/environment-variables.md
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

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 **Spec Alignment (DoD §1)**: Implementation matches canonical rules and architectural constraints.
- [x] #2 **Verification (DoD §2)**: All changes are covered by automated tests and manual verification evidence is recorded.
- [x] #3 **Trust and Safety (DoD §3)**: The server remains authoritative; no secrets or hidden info leaked.
- [x] #4 **Code Quality (DoD §4)**: Code follows project conventions, modularity, and naming standards.
- [x] #5 **Observability (DoD §5)**: Critical paths emit necessary logs and telemetry for operations.
- [x] #6 **Accessibility (DoD §6)**: Changes are documented and understandable for contributors and users.
- [x] #7 **AI-Assisted Work (DoD §7)**: AI changes are reviewed by a human and follow AGENTS.md.
<!-- DOD:END -->