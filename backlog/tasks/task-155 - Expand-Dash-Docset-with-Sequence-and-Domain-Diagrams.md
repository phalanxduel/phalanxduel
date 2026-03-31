---
id: TASK-155
title: Expand Dash Docset with Sequence and Domain Diagrams
status: To Do
assignee: []
created_date: '2026-03-31 22:20'
labels:
  - documentation
  - docs
  - dash
dependencies:
  - TASK-140
  - TASK-142
  - TASK-144
references:
  - docs/system/ARCHITECTURE.md
  - docs/system/SITE_FLOW.md
  - docs/system/DURABLE_AUDIT_TRAIL.md
priority: medium
---

## Description

Add richer sequence-oriented and domain-model-oriented documentation to the
curated Dash docset so Dash.app becomes a useful systems-navigation surface, not
just an API browser.

## Rationale

The current docset now stages architecture, flow, and data-model landing pages,
but the repo still lacks enough sequence diagrams and explicit model maps for
common execution paths such as:

- client intent to server validation to engine apply to broadcast
- match persistence and audit-trail append flow
- OTEL signal emission to collector to centralized backend

Without those views, Dash remains helpful but still incomplete for architecture
onboarding and operational debugging.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The repo contains at least one canonical sequence diagram for request/action execution through client, server, engine, and shared contract boundaries.
- [ ] #2 The repo contains at least one canonical sequence diagram for persistence and replay/audit flow.
- [ ] #3 The curated Dash docset links those sequence diagrams from its landing or architecture pages.
- [ ] #4 Domain-model pages in the Dash docset clearly connect runtime schemas, persistence records, and event-log structures.
- [ ] #5 The added diagrams/docs are generated or curated from canonical sources and do not create contradictory parallel documentation.
<!-- AC:END -->

## Expected Outputs

- New or updated canonical sequence diagrams
- Updated Dash docset landing pages or staging inputs
- Verification note confirming the diagrams are reachable in Dash

## Do Not Break

- Do not fork canonical architecture semantics into Dash-only prose.
- Do not add diagrams that drift from the actual server-authoritative runtime.
