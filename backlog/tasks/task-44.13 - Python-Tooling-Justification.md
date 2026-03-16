---
id: TASK-44.13
title: Python Tooling Justification
status: Planned
assignee: []
created_date: '2026-03-14 04:00'
updated_date: '2026-03-15 22:18'
labels:
  - repo-hygiene
  - docs
dependencies: []
references:
  - pyproject.toml
  - uv.lock
parent_task_id: TASK-44
priority: low
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`pyproject.toml` and `uv.lock` exist in the root of a TypeScript monorepo with no documented explanation of their purpose. This creates confusion about whether Python tooling is required, what scripts depend on it, and whether these files are actively maintained or remnants of an earlier experiment.

**Concern sources:**
- **Claude Code/Opus 4.6**: Listed `pyproject.toml` and `uv.lock` as "Unclear — Python project config in TS monorepo. Purpose not documented."
- **Gemini CLI**: Noted "Python helpers for AI agents" with unclear script dependencies — "adds 'tooling bloat' if unused." Recommended documenting specific script dependencies.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The purpose of `pyproject.toml` and `uv.lock` is documented (e.g., in `README.md` or a comment in `pyproject.toml` itself) explaining what Python tooling they support.
- [ ] #2 If the Python tooling is no longer needed, the files are removed.
- [ ] #3 If retained, the specific scripts or tools that depend on Python are identified and documented.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Read `pyproject.toml` to identify declared dependencies and entry points.
2. Search the repo for Python script invocations or references to Python tools.
3. Determine: Is the Python tooling actively used (e.g., for RTK, AI agent helpers, or linting)?
4. If used: Add a brief note in `README.md` or `pyproject.toml` explaining its purpose.
5. If unused: Remove `pyproject.toml`, `uv.lock`, and `.venv/` references.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 **Code quality (DoD §4)**: No mystery configuration files exist without documented purpose; no orphan tooling remains.
- [ ] #2 **Verification (DoD §2)**: If retained, the Python tooling's purpose is verified by running the dependent script; if removed, `pnpm check:quick` still passes.
- [ ] #3 **Accessibility (DoD §6)**: A contributor encountering `pyproject.toml` in a TypeScript monorepo can immediately understand why it exists.
<!-- DOD:END -->
