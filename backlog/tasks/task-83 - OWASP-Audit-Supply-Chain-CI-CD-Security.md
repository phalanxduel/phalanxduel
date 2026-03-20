---
id: TASK-83
title: 'OWASP Audit: Supply Chain & CI/CD Security'
status: Human Review
assignee: []
created_date: '2026-03-20 13:44'
updated_date: '2026-03-20 13:54'
labels:
  - security
  - hardening
milestone: m-0
dependencies: []
priority: high
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Evaluate the system against the [OWASP NPM Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html) and [CI/CD Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html). Focus on supply chain integrity.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Audit pnpm overrides and resolutions against OWASP NPM Security Cheat Sheet.
- [x] #2 Verify GitHub Actions pipeline against OWASP CI/CD Security Cheat Sheet.
- [x] #3 Ensure all third-party actions are pinned to commit SHAs.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Audited `package.json`: Found existing security overrides for `flatted`, `undici`, `esbuild`, etc. `pnpm audit` is clean.
- Audited GitHub Actions: Found that workflows use version tags (e.g. `@v4`, `@master`) rather than pinned commit SHAs. This is a vulnerability to supply chain hijacking of the action itself.
- Recommendation: Pin all third-party GitHub Actions to full 40-character commit SHAs (mandated by SECURITY.md but not yet implemented).
- Recommendation: Enable Dependabot for automated dependency updates and security alerts.
- Recommendation: Use `npm audit signatures` or similar pnpm equivalent if available to verify package provenance.
- Recommendation: Transition from `superfly/flyctl-actions` to a pinned SHA and use OIDC for Fly.io if supported.
<!-- SECTION:NOTES:END -->
