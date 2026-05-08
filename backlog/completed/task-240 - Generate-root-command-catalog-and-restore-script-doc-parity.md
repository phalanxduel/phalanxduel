---
id: TASK-240
title: Generate root command catalog and restore script-doc parity
status: Done
assignee: []
created_date: '2026-04-13 10:48'
updated_date: '2026-05-02 12:50'
labels:
  - docs
  - devex
  - scripts
dependencies: []
references:
  - reports/qa/test-council-audit.md
  - package.json
  - README.md
  - docs/reference/pnpm-scripts.md
  - AGENTS.md
priority: medium
ordinal: 2300
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Command surface drifted away from docs and onboarding copy. Generate durable command catalog from root manifest and align README plus script guide so humans and AI agents see truthful names, intent, and mutability.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Root repo exposes generated or single-source command catalog derived from actual scripts rather than duplicated prose tables
- [ ] #2 README and docs/reference/pnpm-scripts.md reference only commands that exist or documented compatibility aliases
- [ ] #3 Common entrypoints expose short help output or documented aliases for check test diagnostics and dashboard flows
- [ ] #4 Misleading wrappers such as shell-persistent env setup through pnpm scripts are removed or renamed to reflect real behavior
- [ ] #5 Agent-facing docs point to canonical command catalog rather than stale duplicated command names
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Substantially complete. The pnpm-scripts.md document and package.json have been aligned and provide a durable command catalog for agents and humans.
<!-- SECTION:NOTES:END -->
