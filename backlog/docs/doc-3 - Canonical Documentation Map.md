---
id: doc-3
title: Canonical Documentation Map
type: other
created_date: '2026-03-31 18:05'
updated_date: '2026-03-31 20:35'
---

# Canonical Documentation Map

This document translates the documentation-consolidation audit into a concrete
topic-to-home map for active repo use. It is the execution target for later
move, merge, archive, and deletion tasks.

## Placement Rules

- Root artifacts stay at root or under `.github/` when that is the normal
  contributor or platform expectation.
- `backlog/decisions/` holds active architecture and policy decisions.
- `backlog/docs/` holds active workflow/process docs, active plans, active
  audits, and migration maps.
- `docs/` holds canonical reference documentation for product, system,
  operations, legal, contributor, and public API surfaces.
- `archive/`, `backlog/archive/`, and `backlog/completed/docs/` hold historical
  or completed context that should not compete with active sources.

## Canonical Topic Homes

| Topic | Canonical home | Notes |
|---|---|---|
| Repo entry point and local setup | `README.md` | Root-facing, release-critical |
| Release history | `CHANGELOG.md` | Root-facing, release-critical |
| AI-agent root instructions | `AGENTS.md` | Canonical agent instruction surface |
| Thin Claude shim | `CLAUDE.md` | Pointer only; must not duplicate AGENTS |
| Contributor workflow | `.github/CONTRIBUTING.md` | Standard repo artifact |
| Security reporting | `.github/SECURITY.md` | Standard repo artifact |
| Community conduct | `.github/CODE_OF_CONDUCT.md` | Standard repo artifact |
| PR author workflow | `.github/PULL_REQUEST_TEMPLATE.md` | Standard repo artifact |
| Decision records | `backlog/decisions/` | Canonical policy/architecture decisions |
| Active workflow docs | `backlog/docs/` | Includes AI workflow, active plans, audits |
| Active audit/review prompts | `backlog/docs/` | Canonical home for reusable process prompts |
| Execution history | `backlog/tasks/`, `backlog/completed/` | Tasks are execution records, not summary docs |
| Milestones | `backlog/milestones/` | High-level roadmap structure |
| Gameplay rules | `docs/RULES.md` | Normative gameplay authority |
| Rules errata / amendments | `docs/RULE_AMENDMENTS.md` | Companion to RULES, not a replacement |
| System architecture | `docs/system/ARCHITECTURE.md` | Descriptive system authority |
| Completion standards | `docs/system/DEFINITION_OF_DONE.md` and `docs/system/dod/*` | Canonical completion bar |
| AI collaboration reference | `docs/system/AI_COLLABORATION.md` | Supporting policy, not root instructions |
| Archival policy | `docs/system/ARCHIVAL_POLICY.md` | Canonical historical-retention policy |
| Operations runbook | `docs/system/OPERATIONS_RUNBOOK.md` | Canonical operator surface |
| Deployment automation and CI detail | `docs/operations/CI_CD_PIPELINE.md` | Canonical automation flow |
| Deployment checklist / operator release steps | `docs/deployment/DEPLOYMENT_CHECKLIST.md` | Canonical operator deployment surface |
| Environment and secrets | `docs/system/ENVIRONMENT_VARIABLES.md`, `docs/system/SECRETS_AND_ENV.md` | Canonical env references |
| Security strategy | `docs/system/SECURITY_STRATEGY.md` | Canonical security/threat model |
| Schema evolution | `docs/system/SCHEMA_EVOLUTION_STRATEGY.md` | Canonical migration/contract policy |
| Versioning semantics | `docs/system/VERSIONING.md` | Canonical version policy |
| Type ownership | `docs/system/TYPE_OWNERSHIP.md` | Canonical ownership guidance |
| Glossary | `docs/system/GLOSSARY.md` | Canonical terminology source |
| Legal and governance | `docs/legal/` | Canonical legal docs |
| SEO policy | `docs/seo/` | Canonical indexing policy |
| Explicit history | `docs/history/` | Historical narrative only |
| Public API artifacts | `docs/api/` | Generated/public docs, not policy authority |
| Historical execution summaries | `archive/` | Historical only |
| Historical AI reports | `archive/ai-reports/` | Historical only |

## Known Secondary or Non-Canonical Surfaces

| Surface | Canonical replacement or owner | Disposition target |
|---|---|---|
| `backlog/docs/doc-1 - Phalanx Duel Glossary.md` | `docs/system/GLOSSARY.md` | temporary pointer, then retire |
| `docs/operations/INCIDENT_RUNBOOKS.md` | `docs/system/OPERATIONS_RUNBOOK.md` | merge or archive |
| `docs/deployment/STAGING_SETUP_GUIDE.md`, `docs/deployment/STAGING_DEPLOYMENT.md`, `docs/deployment/FLYIO_PRODUCTION_GUIDE.md`, `docs/deployment/FLYIO_CONFIG_FIX.md`, `docs/operations/STABILITY_DEPLOYMENT_GUIDE.md` | `docs/deployment/DEPLOYMENT_CHECKLIST.md`, `docs/operations/CI_CD_PIPELINE.md`, `docs/system/OPERATIONS_RUNBOOK.md` | pointer, then archive |
| `docs/plans/*.md` | `backlog/docs/` if active, otherwise completed/archive | move or archive |
| `docs/superpowers/plans/*.md` | completed/archive surfaces | archive |
| `docs/superpowers/specs/*.md` | completed/archive unless still active | stale-review |
| `docs/review/HARDENING.md` | `backlog/docs/doc-4 - Repository Hardening Audit Prompt.md` | pointer, then archive |
| `docs/review/PRODUCTION_PATH_REVIEW_GUIDELINE.md` | `backlog/docs/doc-5 - Production Path Review Guideline.md` | pointer, then archive |
| `docs/review/META_ANALYSIS.md` | `archive/` | archive |
| `docs/research/DHI_*` | `archive/` | archive |
| `docs/api/media/RULES.md` | `docs/RULES.md` | generated mirror only |

## Verification Questions for Later Cleanup Tasks

- If a human or agent lands on this file first, can they find the canonical doc
  for a topic in one hop?
- Does the target path match normal repo expectations for that topic?
- Is the non-canonical source historical, generated, or simply duplicated?
- If the non-canonical source is retained, is it clearly marked as secondary?
