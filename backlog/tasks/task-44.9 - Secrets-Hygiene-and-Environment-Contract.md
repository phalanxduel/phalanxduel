---
id: TASK-44.9
title: Secrets Hygiene and Environment Contract
status: Done
assignee:
  - '@claude'
created_date: '2026-03-14 04:00'
updated_date: '2026-03-15 19:59'
labels:
  - security
  - ci
  - repo-hygiene
dependencies: []
references:
  - .env.release.example
  - .gitignore
  - .github/SECURITY.md
parent_task_id: TASK-44
priority: high
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`.env` and `.env.local` files containing secrets (Sentry auth tokens, admin credentials, database URLs) are present in the working tree. While gitignored, they create risk surfaces: accidental commit, AI agents over-reading secrets, and leakage via logs or screenshots. No canonical document explains the environment contract — what must never be committed, what templates exist, and what pre-commit/CI guardrails prevent secret leakage.

**Concern sources:**
- **Cursor/GPT-5.2**: Identified `.env` containing `SENTRY_AUTH_TOKEN` and Sentry DSNs, and `.env.local` containing admin credentials and `DATABASE_URL`. Classified as **high-risk** for accidental commit and AI agent secret reading. Recommended templates as the only committed baseline plus CI/pre-commit scanning guardrails.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A canonical "Environment and Secrets" section exists (in `README.md`, `CONTRIBUTING.md`, or a dedicated doc) explaining: which `.env*` files exist, what they contain, why they must never be committed, and what templates (`.env.release.example`) are the only committed baseline.
- [ ] #2 `.gitignore` patterns for `.env*` files are verified comprehensive (no gaps for `.env.local`, `.env.production`, etc.).
- [ ] #3 A pre-commit or CI guardrail prevents committing files matching `.env*` patterns that contain actual secrets (not templates).
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Audit `.gitignore` for `.env*` coverage — verify `.env`, `.env.local`, `.env.production`, `.env.*.local` are all covered.
2. Review existing `.env.release.example` as the template baseline.
3. Add or verify a pre-commit hook (in `.lintstagedrc` or `.husky/pre-commit`) that rejects staged `.env*` files not matching `*.example` patterns.
4. Document the environment contract in `README.md` "Environment Files" section or `.github/CONTRIBUTING.md`.
5. Run the pre-commit hook against a test `.env` file to verify it catches the violation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Changes made
1. **.gitignore** — added `.env.production`, `.env.production.local`, `.env.*.local` patterns; added comment clarifying only `*.example` templates may be committed.
2. **.husky/pre-commit** — added shell guard before `pnpm lint-staged` that rejects any staged `.env*` file not matching `*.example`. Guard exits 1 with a clear error message.
3. **README.md** — expanded 'Environment Files' section with explicit commit safety table, copy instruction for `.env.release.example`, and 'Never commit' callout.

### Verification evidence
- Hook rejects `.env.test-secret` when staged: ✓
- Hook passes `.env.test.example` when staged: ✓
- `pnpm check:quick` (lint:md, docs): ✓ 0 errors
- `pnpm lint`: ✓
- `pnpm typecheck` (all 4 packages): ✓
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 **Trust and security (DoD §3)**: Secrets fail closed — pre-commit/CI guardrails prevent accidental commits of secret-bearing files.
- [ ] #2 **Verification (DoD §2)**: Pre-commit hook is tested and rejects `.env` files; `pnpm check:quick` passes; `.gitignore` coverage verified.
- [ ] #3 **Accessibility (DoD §6)**: Contributors know exactly which files are safe to commit and which are local-only secrets, without reading `.gitignore` directly.
<!-- DOD:END -->
