---
id: doc-3
title: Canonical Documentation Map
type: other
created_date: '2026-03-31 18:05'
updated_date: '2026-03-31 23:45'
---

# Canonical Documentation Map

This document translates the documentation-consolidation audit into a concrete
topic-to-home map for active repo use. It is the execution target for later
move, merge, archive, and deletion tasks.

## Placement Rules

- Root artifacts stay at root or under `.github/` when that is the normal
  contributor or platform expectation.
- `docs/adr/` holds active architecture and policy decisions.
- `docs/archive/` holds active workflow/process docs, active plans, active
  audits, and migration maps.
- `docs/` holds canonical reference documentation for product, system,
  operations, legal, contributor, and public API surfaces.
- `backlog/archive/`, `backlog/completed/docs/`, and `docs/history/` hold
  historical or completed context that should not compete with active sources.

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
| Decision records | `docs/adr/` | Canonical policy/architecture decisions |
| Active workflow docs | `docs/archive/` | Includes AI workflow, active plans, audits |
| Active audit/review prompts | `docs/archive/` | Canonical home for reusable process prompts |
| Execution history | `backlog/tasks/`, `backlog/completed/` | Tasks are execution records, not summary docs |
| Milestones | `backlog/milestones/` | High-level roadmap structure |
| Gameplay rules | `docs/gameplay/rules.md` | Normative gameplay authority |
| Rules errata / amendments | `docs/gameplay/rule-amendments.md` | Companion to RULES, not a replacement |
| System architecture | `docs/architecture/principles.md` | Descriptive system authority |
| Completion standards | `docs/reference/dod.md` and `docs/system/dod/*` | Canonical completion bar |
| AI collaboration reference | `docs/system/AI_COLLABORATION.md` | Supporting policy, not root instructions |
| Archival policy | `docs/ops/archival-policy.md` | Canonical historical-retention policy |
| Operations runbook | `docs/ops/runbook.md` | Canonical operator surface |
| Deployment automation and CI detail | `docs/ops/ci-cd.md` | Canonical automation flow |
| Deployment checklist / operator release steps | `docs/ops/deployment-checklist.md` | Canonical operator deployment surface |
| Environment and secrets | `docs/reference/environment-variables.md`, `docs/tutorials/secrets-and-env.md` | Canonical env references |
| Security strategy | `docs/architecture/security-strategy.md` | Canonical security/threat model |
| Schema evolution | `docs/architecture/schema-evolution.md` | Canonical migration/contract policy |
| Versioning semantics | `docs/architecture/versioning.md` | Canonical version policy |
| Type ownership | `docs/architecture/type-ownership.md` | Canonical ownership guidance |
| Glossary | `docs/reference/glossary.md` | Canonical terminology source |
| Legal and governance | `docs/legal/` | Canonical legal docs |
| SEO policy | `docs/seo/` | Canonical indexing policy |
| Explicit history | `docs/history/` | Historical narrative only |
| Public API artifacts | `docs/api/` | Generated/public docs, not policy authority |
| Historical execution summaries | git history or `backlog/completed/` when a stable path is justified | Historical only |
| Historical AI reports | git history or task notes | Historical only |

## Known Secondary or Non-Canonical Surfaces

| Surface | Canonical replacement or owner | Disposition target |
|---|---|---|
| `docs/operations/INCIDENT_RUNBOOKS.md` | `docs/ops/runbook.md` | merge or archive |
| `docs/deployment/STAGING_SETUP_GUIDE.md`, `docs/deployment/STAGING_DEPLOYMENT.md`, `docs/deployment/FLYIO_PRODUCTION_GUIDE.md`, `docs/deployment/FLYIO_CONFIG_FIX.md`, `docs/operations/STABILITY_DEPLOYMENT_GUIDE.md` | `docs/ops/deployment-checklist.md`, `docs/ops/ci-cd.md`, `docs/ops/runbook.md` | pointer, then archive |
| deleted `docs/plans/*.md` planning canopies | task history, decisions, and git history | deleted |
| deleted `docs/superpowers/plans/*.md` implementation plans | task history and git history | deleted |
| deleted `docs/superpowers/specs/*.md` design specs | task history and git history | deleted |
| retired hardening/prod-review shims | `docs/archive/doc-4 - Repository Hardening Audit Prompt.md`, `docs/archive/doc-5 - Production Path Review Guideline.md` | deleted; recover via git history if needed |
| `docs/api/media/RULES.md` | `docs/gameplay/rules.md` | generated mirror only |

## Verification Questions for Later Cleanup Tasks

- If a human or agent lands on this file first, can they find the canonical doc
  for a topic in one hop?
- Does the target path match normal repo expectations for that topic?
- Is the non-canonical source historical, generated, or simply duplicated?
- If the non-canonical source is retained, is it clearly marked as secondary?
