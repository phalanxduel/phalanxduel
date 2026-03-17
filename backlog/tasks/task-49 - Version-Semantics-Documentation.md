---
id: TASK-49
title: Version Semantics Documentation for External Clients
status: To Do
assignee: []
created_date: '2026-03-17'
updated_date: '2026-03-17'
labels: [docs, contract]
dependencies: []
priority: low
ordinal: 4900
---

## Description

External clients need clear guidance on which version identifier to use
for compatibility checks. `docs/RULE_AMENDMENTS.md` RA-002 provides the
basic clarification but a dedicated versioning guide would help.

## Planned Change

1. Add a `docs/VERSIONING.md` explaining the version scheme
2. Add version fields to the `/api/defaults` response metadata
3. Document the compatibility matrix (which `specVersion` works with which
   `SCHEMA_VERSION` ranges)

## Verification

- `docs/VERSIONING.md` exists with clear guidance
- `/api/defaults` response includes version metadata
- `docs/RULE_AMENDMENTS.md` RA-002 links to the new doc
