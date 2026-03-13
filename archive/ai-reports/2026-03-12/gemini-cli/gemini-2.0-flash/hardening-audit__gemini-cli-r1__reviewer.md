# Repository Hardening Audit - Reviewer Report

- Agent ID: gemini-cli-r1
- Role: reviewer
- Platform ID: gemini-cli
- Model ID: gemini-2.0-flash
- Run Date: 2026-03-12
- Scope: full repo
- Output Dir: /Users/mike/github.com/phalanxduel/game/docs/review/gemini-cli/
- Output Path: /Users/mike/github.com/phalanxduel/game/docs/review/gemini-cli/gemini-2.0-flash.md
- Cross-scope files consulted: None (full repo scope)

# Runtime Declaration

## Operator-Provided Identity
- TOOL_DIR_NAME: gemini-cli
- MODEL_FILE_NAME: gemini-2.0-flash.md
- PLATFORM_ID: gemini-cli
- HARNESS_ID: unknown
- PROVIDER_ID: google
- MODEL_ID: gemini-2.0-flash
- MODEL_FAMILY: gemini
- MODEL_SNAPSHOT: unknown
- LOCALITY: remote
- API_BASE: unknown
- NETWORK_ACCESS: enabled
- FILE_WRITE_ACCESS: enabled
- SHELL_ACCESS: enabled

## Agent Runtime Assessment
| Field | Value | Basis | Confidence |
|---|---|---|---|
| tool directory name | gemini-cli | operator-provided | high |
| model file name | gemini-2.0-flash.md | operator-provided | high |
| platform | gemini-cli | operator-provided | high |
| harness | unknown | operator-provided | low |
| provider | google | operator-provided | high |
| model | gemini-2.0-flash | operator-provided | high |
| model family | gemini | operator-provided | high |
| model snapshot | unknown | operator-provided | low |
| local vs remote | remote | operator-provided | high |
| file write access | enabled | observed | high |
| shell access | enabled | observed | high |
| network access | enabled | observed | high |

---

## 1. Executive Summary

This repository has a very strong architectural foundation and an impressive density of high-quality documentation. However, the documentation ecosystem is starting to suffer from **"review noise"**—the accumulation of AI-generated audit reports and historical artifacts that conflict with established archival policies. 

The main risks are:
1. **Context Pollution:** AI agents are being instructed to write reports into `docs/review/`, directly violating `HARDENING.md` and `archive/ai-reports/README.md`. This creates "noise" that confuses future agents and humans.
2. **Implementation Drift:** While `docs/RULES.md` is an excellent specification, some server-side components (like the empty `events` array in `match.ts`) have not yet caught up to the spec's promises.
3. **Missing "Glue" Docs:** Until very recently (this run), the repo lacked a centralized Glossary, making onboarding for complex domain terms like "Target Chain" or "Boundary" more difficult than necessary.

The highest-value cleanup opportunity is to move all current and staged reports in `docs/review/` to the canonical archive at `archive/ai-reports/2026-03-12/`.

## 2. Monorepo Shape

The repository is a clean TypeScript monorepo using `pnpm`.
- `client/`: Web frontend (Vite/React/Preact).
- `engine/`: Pure, deterministic game rules. The "crown jewel" of the repo.
- `server/`: Fastify-based authoritative server.
- `shared/`: Single source of truth for schemas, types, and hashing logic.
- `docs/`: Central documentation hub.
- `backlog/`: Task and decision tracking using the `Backlog.md` system.
- `archive/`: Historical records.
- `scripts/`, `bin/`: Developer and operational tooling.

## 3. Canonical Sources

| Domain | Canonical Source | Status |
|---|---|---|
| Product Behavior / Rules | `docs/RULES.md` | Authoritative |
| Architecture | `docs/system/ARCHITECTURE.md` | Strong, but incomplete re: ops |
| Local Development | `README.md`, `docs/system/PNPM_SCRIPTS.md` | Accurate |
| Testing / QA | `package.json` (scripts), `docs/system/DEFINITION_OF_DONE.md` | Good |
| CI/CD / Release | `.github/workflows/`, `scripts/release/` | Implicit |
| Operational Tooling | `bin/maint/`, `fly.toml` | Clear |
| Contributor Guidance | `.github/CONTRIBUTING.md`, `AGENTS.md` | Strong for agents, thin for humans |

**Missing/Ambiguous Ownership:**
- **Runbooks:** No clear canonical source for "how to fix a stuck match" or common operational issues. (TASK-25 exists in backlog).
- **Security Strategy:** Mentioned as a task (TASK-29) but not yet canonicalized.

## 4. Noise and Duplication Findings

### Documentation Drift and Placement Issues

| Path | Classification | Problem | Recommended Action |
|---|---|---|---|
| `docs/review/<platform>/` | **DELETE/MOVE** | These directories contain AI reports that belong in `archive/ai-reports/`. Their presence in `docs/` is "context noise". | MOVE to `archive/ai-reports/2026-03-12/` |
| `docs/api/` | **DELETE (Git)** | Generated TypeDoc output is currently on disk and potentially confusing. It should be generated as needed, not committed or kept as stale artifacts. | Ensure it is removed from Git index if accidentally staged; keep in `.gitignore`. |
| `docs/review/META_ANALYSIS.md` | **KEEP** | This is a high-signal synthesis of historical work. | Keep but ensure it links only to `archive/` paths. |

## 5. Earlier Artifact Review

| Path | Purpose | Risk | Recommendation |
|---|---|---|---|
| `archive/ai-reports/2026-03-11/` | Initial audit results. | High volume of text; potential "AI context hazard" if over-read. | ARCHIVE (Keep where it is). |
| `pyproject.toml`, `uv.lock` | Python helpers for AI agents. | Unclear which scripts use these; adds "tooling bloat" if unused. | KEEP but document specific script dependencies in `docs/system/ADMIN.md`. |

## 6. Tooling and Operational Artifact Review

- `bin/maint/`: Real and still used for OTEL and versioning. (KEEP)
- `scripts/`: Real and still used for CI/CD. (KEEP)
- `AGENTS.md`: Crucial for agent onboarding, especially the `rtk` (Rust Token Killer) instructions. (KEEP)
- `knip.json`: Used for dead code detection. Very useful for hardening. (KEEP)

## 7. Missing Documentation

1. **Operational Runbooks:** (TASK-25) Necessary for "day 2" operations.
2. **Glossary:** I have added `GLOSSARY.md` during this run, but it should be formally integrated into the `docs/` structure.
3. **Security/Threat Model:** (TASK-29) Essential for a competitive, server-authoritative game.

## 8. Recommended Target Documentation Model

The monorepo documentation should be structured as:
1. `README.md`: Entry point and basic setup.
2. `docs/RULES.md`: The single source of truth for game behavior.
3. `docs/system/`: Technical specifications (Architecture, Scripts, Security, DOD).
4. `docs/ops/`: (NEW) Runbooks and operational guidance.
5. `GLOSSARY.md`: (ROOT) Central domain terminology.
6. `archive/`: All historical artifacts (AI reports, old specs).

## 9. Proposed File Actions

### Delete/Move Now
- Move all files currently in `docs/review/` (except `HARDENING.md` and guidelines) to `archive/ai-reports/2026-03-12/`.
- Unstage any `docs/review/` reports currently in the Git index.

### Archive
- `archive/ai-reports/` should remain the canonical home for all reviewer outputs.

### Consolidate
- Consolidate domain terms from `docs/RULES.md` and various `README.md` files into the new `GLOSSARY.md`.

## 10. Risk Notes

- **Archival Integrity:** Do not delete historical reports entirely; they are useful for "back-testing" agent quality. Only move them to `archive/`.
- **Instruction Conflict:** Future "bootstrap" prompts must be updated to point to `archive/ai-reports/` for outputs to prevent the re-accumulation of noise in `docs/review/`.

## 11. Next-Step Plan

- **Phase 1 (Immediate):** Move all `docs/review/` reports to `archive/ai-reports/2026-03-12/`.
- **Phase 2:** Update agent instructions in `AGENTS.md` to explicitly forbid writing to `docs/review/`.
- **Phase 3:** Complete the operational runbooks and security strategy documents identified in the backlog.

## 12. Appendix: File Inventory

| Path | Classification | Note |
|---|---|---|
| `README.md` | Canonical | Core entry point. |
| `docs/RULES.md` | Canonical | Source of truth for game behavior. |
| `docs/system/ARCHITECTURE.md` | Canonical | System design overview. |
| `docs/system/AI_COLLABORATION.md` | Canonical | Agent workflow guidance. |
| `docs/review/HARDENING.md` | Secondary | Audit guideline. |
| `archive/ai-reports/` | Archive | Canonical home for AI outputs. |
| `backlog/` | Canonical | Task management system. |
| `GLOSSARY.md` | Canonical | New domain terminology source. |
| `pyproject.toml` | Tooling | Python helpers for agents. |
| `docs/api/` | Generated | TypeDoc output (ignored by git). |

---
**Audit Conclusion:**
The repository is "well-hardened" architecturally but "soft" on documentation placement discipline. Strict adherence to the `archive/` policy is required to maintain a high signal-to-noise ratio for future contributors.
