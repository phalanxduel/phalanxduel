---
id: TASK-309
title: Add repo-local operations and agentic gameplay skills
status: Done
assignee:
  - '@codex'
created_date: '2026-06-12 20:31'
updated_date: '2026-06-12 20:33'
labels: []
dependencies: []
documentation:
  - docs/agents/agentic-gameplay.md
  - docs/agents/skills/play-a-turn.md
  - docs/agents/skills/analyze-a-match.md
  - docs/agents/skills/compare-environments.md
  - mcp/README.md
  - docs/agents/skills/database-environment-isolation.md
  - docs/ops/runbook.md
  - docs/ops/deployment-checklist.md
  - docs/reference/environment-variables.md
modified_files:
  - .gitignore
  - .agents/skills/phalanx-agentic-gameplay/SKILL.md
  - .agents/skills/phalanx-agentic-gameplay/agents/openai.yaml
  - .agents/skills/phalanx-db-safe-ops/SKILL.md
  - .agents/skills/phalanx-db-safe-ops/agents/openai.yaml
  - .agents/skills/phalanx-production-ops/SKILL.md
  - .agents/skills/phalanx-production-ops/agents/openai.yaml
  - .agents/skills/phalanx-observability-triage/SKILL.md
  - .agents/skills/phalanx-observability-triage/agents/openai.yaml
priority: medium
ordinal: 150000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend the repo-local agent skill set with concise skills for Phalanx MCP agentic gameplay, database-safe operations, production operations, and observability triage. These should promote existing docs/playbooks into discoverable skills without duplicating the canonical runbooks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Repo-local skills exist for agentic gameplay, database-safe operations, production operations, and observability triage.
- [x] #2 Each new skill has valid `SKILL.md` frontmatter with specific trigger descriptions and concise body instructions.
- [x] #3 Each skill points to canonical docs, commands, MCP tools, and stop conditions instead of copying long runbook content.
- [x] #4 Each skill has `agents/openai.yaml` metadata consistent with existing repo-local skills.
- [x] #5 Validation confirms the new skill files are structurally sane and formatted.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add four concise repo-local skill folders: `phalanx-agentic-gameplay`, `phalanx-db-safe-ops`, `phalanx-production-ops`, and `phalanx-observability-triage`.
2. Write each `SKILL.md` with strong trigger descriptions, short procedural bodies, canonical doc links, key commands/tools, and clear stop/safety conditions.
3. Add `agents/openai.yaml` metadata for each skill using the existing repo style.
4. Update `.gitignore` allowlist entries so the new skill folders are trackable.
5. Validate frontmatter/metadata with Ruby YAML parsing and run Prettier on the new Markdown/YAML files; record evidence in TASK-309.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Created four repo-local skills: `phalanx-agentic-gameplay`, `phalanx-db-safe-ops`, `phalanx-production-ops`, and `phalanx-observability-triage`, each with `SKILL.md` plus `agents/openai.yaml` metadata.

Validation evidence:
- `rtk ruby -ryaml -e ... .agents/skills/phalanx-agentic-gameplay .agents/skills/phalanx-db-safe-ops .agents/skills/phalanx-production-ops .agents/skills/phalanx-observability-triage` passed, confirming frontmatter names/descriptions and metadata YAML parse.
- `rtk pnpm exec prettier --check ...` passed for the eight new Markdown/YAML skill files.
- Updated `.gitignore` allowlist entries so the new skill folders are trackable.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added the second batch of repo-local lifecycle skills:

- `phalanx-agentic-gameplay`: promotes MCP match play, analysis, and cross-environment comparison workflows into a discoverable skill.
- `phalanx-db-safe-ops`: makes database environment isolation triggerable before migrations, tests, psql, DB-backed MCP tools, or data operations.
- `phalanx-production-ops`: guides staging/production health, deployment, rollback, stuck-match, and active-match restart workflows through canonical runbooks.
- `phalanx-observability-triage`: captures match-level telemetry triage through OTel/LGTM/Tempo/Loki identifiers and local collector health checks.

Also updated `.gitignore` to allow these new `.agents/skills/*` folders to be tracked.

Verification:
- Ruby YAML/frontmatter validation passed for all four new skill folders.
- Prettier check passed for all new `SKILL.md` and `agents/openai.yaml` files.

Broad runtime build/test/schema gates are not separately claimed in this task because the change is repo-local skill Markdown/YAML plus ignore allowlist entries.
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
