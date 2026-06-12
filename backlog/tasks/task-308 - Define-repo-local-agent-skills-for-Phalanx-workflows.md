---
id: TASK-308
title: Define repo-local agent skills for Phalanx workflows
status: Done
assignee:
  - '@codex'
created_date: '2026-06-12 20:05'
updated_date: '2026-06-12 20:21'
labels: []
dependencies: []
documentation:
  - AGENTS.md
  - docs/tutorials/ai-agent-workflow.md
  - docs/architecture/principles.md
  - docs/quality/high-signal-surfaces.md
  - docs/testing.md
  - docs/agents/agentic-gameplay.md
  - docs/agents/skills/play-a-turn.md
  - docs/agents/skills/analyze-a-match.md
  - docs/agents/skills/compare-environments.md
  - mcp/README.md
modified_files:
  - .gitignore
  - .agents/skills/phalanx-gameplay-change/SKILL.md
  - .agents/skills/phalanx-gameplay-change/agents/openai.yaml
  - .agents/skills/phalanx-playability-gate/SKILL.md
  - .agents/skills/phalanx-playability-gate/agents/openai.yaml
  - .agents/skills/zdots-local-ai/SKILL.md
  - .agents/skills/zdots-local-ai/agents/openai.yaml
priority: medium
ordinal: 149000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the first set of repo-local agent skills that make Phalanx Duel's development, playability, and local zdots AI workflows discoverable to agents. The skills should stay concise, point to canonical repository documentation, and avoid becoming duplicate sources of truth.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Repo-local skills exist for gameplay/rules changes, playability gating before UI work, and local zdots AI capability use.
- [x] #2 Each skill has valid `SKILL.md` frontmatter with clear trigger descriptions and concise body instructions.
- [x] #3 Skills reference canonical docs, commands, and MCP/zdots checks instead of copying long documentation.
- [x] #4 Skill metadata under `agents/openai.yaml` is present or intentionally omitted consistently with existing repo skill patterns.
- [x] #5 Validation confirms the new skill files are structurally sane.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect existing repo-local skills for frontmatter/body/metadata conventions.
2. Create three concise skill folders under `.agents/skills/`: `phalanx-gameplay-change`, `phalanx-playability-gate`, and `zdots-local-ai`.
3. Add `SKILL.md` files that encode trigger descriptions, required preflight checks, canonical doc links, command choices, and stop conditions without duplicating long docs.
4. Add minimal `agents/openai.yaml` metadata for each skill to match existing repo skill conventions.
5. Validate YAML/frontmatter and inspect the resulting files; record verification evidence and acceptance criteria status in TASK-308.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added `.gitignore` unignore entries for the three new repo-local skill folders because `.agents/skills/*` is ignored by default and existing tracked skills are individually allowlisted.

Created three repo-local skills: `phalanx-gameplay-change`, `phalanx-playability-gate`, and `zdots-local-ai`, each with `SKILL.md` plus `agents/openai.yaml` metadata.

Validation evidence:
- `rtk ruby -ryaml -e ... .agents/skills/phalanx-gameplay-change .agents/skills/phalanx-playability-gate .agents/skills/zdots-local-ai` passed, confirming frontmatter names/descriptions and metadata YAML parse.
- `rtk pnpm exec prettier --check ...` passed for the six new Markdown/YAML skill files.
- `quick_validate.py` was attempted but could not run because the active Python environment lacks `yaml`/PyYAML; Ruby standard YAML validation was used instead.
- Broad build/test/schema DoD gates were not run because this change only adds skill Markdown/YAML metadata and `.gitignore` allowlist entries.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added the first three repo-local lifecycle skills for Phalanx Duel agents:

- `phalanx-gameplay-change`: guides rules/engine/shared/server-authoritative gameplay changes through canonical docs, high-signal surfaces, deterministic replay, schema, event-log, and verification guardrails.
- `phalanx-playability-gate`: makes the existing playability-before-UI policy discoverable and points agents to the correct headless/headed QA commands and scenario docs.
- `zdots-local-ai`: captures how to discover and safely use the local zdots control plane, including `agent-guide`, `capabilities`, `llama-caps`, `ai-query`, `zdots-ctx`, local model constraints, and health-first fallback behavior.

Also updated `.gitignore` to allow these new `.agents/skills/*` folders to be tracked, matching the existing explicit allowlist pattern.

Verification:
- Ruby YAML/frontmatter validation passed for all three skill folders.
- Prettier check passed for all new `SKILL.md` and `agents/openai.yaml` files.
- `quick_validate.py` was attempted but blocked by missing PyYAML in the active Python environment.

Broad runtime build/test/schema gates were not run because this was a docs/skill metadata change with no application code or generated contracts.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
