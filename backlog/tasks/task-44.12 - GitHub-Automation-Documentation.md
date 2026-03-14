---
id: TASK-44.12
title: GitHub Automation Documentation
status: To Do
assignee: []
created_date: '2026-03-14 04:00'
updated_date: '2026-03-14 04:00'
labels:
  - docs
  - ci
  - ai-collaboration
dependencies: []
references:
  - .github/workflows/gemini-dispatch.yml
  - .github/workflows/gemini-review.yml
  - .github/workflows/gemini-invoke.yml
  - .github/workflows/gemini-triage.yml
  - .github/workflows/gemini-scheduled-triage.yml
  - .github/commands/
parent_task_id: TASK-44
priority: low
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Five of eight GitHub Actions workflows are Gemini-specific AI automation (PR review, issue triage, event dispatch, invocation, scheduled triage). These are operationally important — they can review PRs, triage issues, and run agent workflows from GitHub events/comments — but no human-facing documentation explains what they do, how they're triggered, which instruction sources they consume, or what safety boundaries apply. Contributors encountering these workflows have no context for understanding the AI automation surface.

**Concern sources:**
- **Claude Code/Opus 4.6**: Observed "5 of 8 workflows are Gemini-specific" with "no equivalent Claude or Copilot workflows" and noted they are underdocumented in human-facing docs.
- **Codex/GPT-5**: Flagged missing "AI automation map" — "what automations exist, who owns them, how they are triggered, which instruction sources they consume, what safety boundaries apply."
- **Gordon**: Noted Gemini workflows are "real but specialized" and "not documented in main docs."
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A documented "GitHub Automation" section exists (in `docs/system/` or `CONTRIBUTING.md`) listing each automation workflow with: name, trigger, purpose, instruction sources consumed, and safety boundaries.
- [ ] #2 The `.github/commands/*.toml` command files are documented with their intended usage.
- [ ] #3 The documentation clarifies which automations are active, which are optional, and how to disable them if needed.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Read each `gemini-*.yml` workflow to understand triggers, actions, and instruction sources.
2. Read `.github/commands/*.toml` to understand command definitions.
3. Draft a "GitHub Automation" doc section covering each workflow.
4. Link from `CONTRIBUTING.md` or `docs/system/` as appropriate.
5. Run `pnpm lint:md` to verify formatting.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 **Docs/tooling alignment (DoD §1)**: Documented workflows match actual `.github/workflows/` contents.
- [ ] #2 **Verification (DoD §2)**: `pnpm lint:md` passes; documented trigger mechanisms match workflow YAML.
- [ ] #3 **Accessibility (DoD §6)**: A contributor can understand what AI automations exist, when they fire, and how to interact with them without reading workflow YAML.
<!-- DOD:END -->
