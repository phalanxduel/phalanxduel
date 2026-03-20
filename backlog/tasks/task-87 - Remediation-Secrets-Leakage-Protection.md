---
id: TASK-87
title: 'Remediation: Secrets & Leakage Protection'
status: Done
assignee: []
created_date: '2026-03-20 15:25'
updated_date: '2026-03-20 18:31'
labels:
  - security
  - hardening
milestone: m-0
dependencies: []
priority: high
ordinal: 71000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement automated secret scanning and harden the deployment pipeline to prevent sensitive token exposure.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Gitleaks (or equivalent) integrated into Husky pre-commit hook.
- [x] #2 Deployment script (deploy-fly.sh) refactored to use 'fly secrets' instead of --env flags.
- [x] #3 Verified that no secrets are visible in GHA logs after a test run.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Integrated `secretlint` with `@secretlint/secretlint-rule-preset-canary` for robust secret detection.
- Updated `.lintstagedrc` to run `secretlint` on all staged files during pre-commit.
- Refactored `scripts/release/deploy-fly.sh` to remove insecure `--env` flags.
- Updated `.github/workflows/pipeline.yml` to remove sensitive environment variables from `flyctl deploy` commands.
- Verified that all CI checks and local builds still pass.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 **Spec Alignment (DoD §1)**: Implementation matches canonical rules and architectural constraints.
- [x] #2 **Verification (DoD §2)**: All changes are covered by automated tests and manual verification evidence is recorded.
- [x] #3 **Trust and Safety (DoD §3)**: The server remains authoritative; no secrets or hidden info leaked.
- [x] #4 **Code Quality (DoD §4)**: Code follows project conventions, modularity, and naming standards.
- [x] #5 **Observability (DoD §5)**: Critical paths emit necessary logs and telemetry for operations.
- [x] #6 **Accessibility (DoD §6)**: Changes are documented and understandable for contributors and users.
- [x] #7 **AI-Assisted Work (DoD §7)**: AI changes are reviewed by a human and follow AGENTS.md.
<!-- DOD:END -->
