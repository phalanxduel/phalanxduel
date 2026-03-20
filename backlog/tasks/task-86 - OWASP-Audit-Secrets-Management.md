---
id: TASK-86
title: 'OWASP Audit: Secrets Management'
status: Human Review
assignee: []
created_date: '2026-03-20 13:45'
updated_date: '2026-03-20 13:54'
labels:
  - security
  - hardening
milestone: m-0
dependencies: []
priority: high
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Evaluate the system against the [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html). Focus on secret isolation and accidental exposure prevention.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Audit environment variable loading and GHA secret usage against OWASP Secrets Management Cheat Sheet.
- [x] #2 Verify that no secrets are committed to the repository (check .env.example compliance).
- [x] #3 Ensure JWT_SECRET and FLY_API_TOKEN are handled with maximum isolation.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Audited secret exclusion: `.gitignore` and `.dockerignore` both correctly exclude `.env*` files (except examples).
- Audited `sync-secrets.ts`: Found a robust local override pattern. It uses `# @target: ...` comments to control where secrets are pushed (GitHub Environments vs Fly.io).
- Verified production safety: `server/src/app.ts` now throws if `JWT_SECRET` is missing in production.
- Found no secrets committed to the repository after a recursive search for common patterns.
- Recommendation: Integrate `gitleaks` or `trufflehog` as a pre-commit hook to catch accidental secret additions before they are staged.
- Recommendation: Switch from `FLY_API_TOKEN` environment variables in GitHub Actions to OIDC-based authentication if possible (limits long-lived bootstrap tokens).
- Recommendation: For higher scale, move from environment variables to a dedicated secret manager (e.g. HashiCorp Vault or Fly.io secrets managed via their CLI/API).
- Recommendation: Ensure `FLY_API_TOKEN` is rotated every 90 days.
<!-- SECTION:NOTES:END -->
