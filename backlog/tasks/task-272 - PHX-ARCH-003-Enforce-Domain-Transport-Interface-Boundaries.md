---
id: TASK-272
title: PHX-ARCH-003 - Enforce Domain-Transport Interface Boundaries
status: To Do
assignee: []
created_date: '2026-05-02 20:46'
labels: []
milestone: m-11
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Strictly define the interface between infrastructure (transport) and domain (MatchManager) to ensure that protocol-agnostic validation can be reliably executed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Define 'MatchTransport' interface for protocol-agnostic communication.
- [ ] #2 Ensure both REST and WebSocket handlers adhere strictly to the 'MatchTransport' interface.
- [ ] #3 Flag and refactor any infrastructure-specific logic leaking into MatchManager.
<!-- AC:END -->
