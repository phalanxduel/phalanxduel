---
id: TASK-42
title: Backlog.md Homebrew Install and Project Reinitialization
status: Done
assignee:
  - '@codex'
created_date: '2026-03-13 21:46'
updated_date: '2026-03-13 22:45'
labels: []
dependencies: []
references:
  - package.json
  - pnpm-lock.yaml
  - backlog/docs/ai-agent-workflow.md
  - backlog/config.yml
priority: medium
ordinal: 250
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the repo-local Backlog.md installation path with a Homebrew-managed backlog-md installation, then re-initialize the phalanxduel Backlog project so the MCP hooks and configuration are aligned with the supported setup.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The repo no longer depends on installing Backlog.md directly into the codebase for normal local use.
- [x] #2 Contributor-facing docs describe brew install backlog-md as the preferred setup path where that convention is intended to apply.
- [x] #3 The phalanxduel Backlog project has been re-initialized and the resulting MCP hooks and configuration are correct.
- [x] #4 The task records the exact repo changes and validation steps needed to confirm the new setup works.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Remove the direct Backlog.md package dependency and any repo-local installation path that assumes Backlog lives inside the codebase.
2. Update docs and workflow instructions to use brew install backlog-md as the preferred local setup path.
3. Re-initialize the Backlog project for phalanxduel using the Homebrew-installed CLI.
4. Verify the resulting MCP hooks and project configuration are correct and check in any required repo changes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Kept TASK-42 assigned to `@codex`; assignee ownership follows the executing tool slug unless a human explicitly chooses a different owner.
- Removed the direct `backlog.md` package dependency and the repo-local package-script wrapper from `package.json`, then refreshed `pnpm-lock.yaml` with `pnpm install --lockfile-only`.
- Updated the live Backlog operator docs and agent-facing task-manager guidance to prefer `brew install backlog-md` plus the global `backlog` CLI instead of repo-local package execution.
- Re-ran `backlog init phalanxduel --defaults --integration-mode mcp`; the command preserved the existing project settings and normalized `backlog/config.yml`.
- Updated `.gemini/settings.json` so the Gemini MCP client launches Backlog with `backlog mcp start` instead of `npx backlog.md mcp start`.

Verification:
- Confirmed `package.json` and `pnpm-lock.yaml` no longer contain `backlog.md`.
- Ran `backlog task list --plain`.
- Ran `backlog config list`.
- Parsed `.gemini/settings.json` successfully with Node.
- Ran targeted `markdownlint-cli2` on the touched Backlog docs, agent instructions, and TASK-42 record with zero errors.

- Clarified the Definition of Done per review: the completion bar is that both the Backlog.md MCP path and CLI usage are based on the Homebrew-installed version, and tasks can be managed through `backlog`.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Backlog.md MCP and CLI are based on the Homebrew version and tasks can be managed through backlog.

Quickstart
  backlog task create "Title" -d "Description"  Create a new task
  backlog task list --plain  List tasks (plain text)
  backlog board  Open the TUI Kanban board
  backlog browser  Start the web UI
  backlog overview  Show project statistics

Docs: https://backlog.md.
<!-- DOD:END -->
