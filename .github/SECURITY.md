# Security Policy

## Supported Versions

Phalanx Duel is currently in pre-alpha and is developed primarily on `main`.
Security fixes are applied to `main` first. We do not currently maintain
long-lived patch branches for older releases.

| Version | Supported |
| ------- | --------- |
| `main` (latest) | :white_check_mark: |
| pre-release tags (latest only) | :white_check_mark: |
| older pre-release tags | :x: |
| unmaintained forks | :x: |

## Reporting a Vulnerability

### Preferred Reporting Channel

Please report vulnerabilities privately through GitHub Security Advisories:

- https://github.com/phalanxduel/phalanxduel/security/advisories/new

If you cannot use GitHub Security Advisories, open a private contact request via:

- https://www.just3ws.com/contact/

Do **not** open public GitHub issues for suspected vulnerabilities.

### What to Include

Provide as much detail as possible:

- Affected component(s) (`client`, `server`, `engine`, `shared`)
- Reproduction steps or proof of concept
- Impact assessment (confidentiality/integrity/availability)
- Version/commit tested
- Any suggested mitigations

### Response Targets

- Acknowledgement: within 3 business days
- Initial triage: within 7 business days
- Status updates: at least every 14 days until resolution

Complex issues may take longer to fully resolve; we will communicate progress
and mitigations as we go.

### Disclosure Process

- We follow coordinated disclosure.
- Please allow time for patch development and validation before public release.
- Once fixed, we may publish a security advisory with affected scope,
  remediation steps, and credit (if desired).

### Scope Notes

In-scope reports generally include:

- Remote code execution
- Authentication/authorization bypass
- Sensitive data exposure
- Injection vulnerabilities
- Denial-of-service vectors with realistic impact

Out-of-scope reports generally include:

- Issues requiring unrealistic local-only assumptions
- Social engineering or phishing campaigns
- Non-security best-practice suggestions without exploit path

### Safe Harbor

We support good-faith security research. Please avoid privacy violations,
service disruption, destructive testing, or access beyond what is necessary to
prove the issue.

### Bug Bounty

There is currently no paid bug bounty program.

## Security Best Practices

### GitHub Actions Pinning

To ensure the integrity of our CI/CD pipelines and prevent supply chain attacks:

- **All GitHub Actions MUST be pinned to a full-length (40-character) commit SHA.**
- **A human-readable tag or version SHOULD be included as a comment on the same line.**

Example:
```yaml
- uses: actions/checkout@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v4
```

### What Runs in Protected CI (pipeline.yml)

Every push to `main` and every pull request runs:

| Check | Command | Gate level |
| --- | --- | --- |
| Dependency audit | `pnpm audit --audit-level=high` | Fails on high/critical |
| Lint (code + tools) | `pnpm verify:ci` → `pnpm lint` | Fails |
| Type checking | `pnpm verify:ci` → `pnpm typecheck` | Fails |
| Unit + integration tests with coverage | `pnpm verify:ci` → `pnpm test:coverage:run` | Fails |
| Replay verification | `pnpm verify:ci` → `pnpm qa:replay:verify` | Fails |
| Playthrough anomaly verification | `pnpm verify:ci` → `pnpm qa:playthrough:verify` | Fails |
| Adversarial server authority tests | separate `adversarial` job | Fails |
| Markdown lint | `pnpm verify:ci` → `pnpm lint:md` | Fails |
| Formatting | `pnpm verify:ci` → `prettier --check` | Fails |
| Documentation drift | `pnpm verify:ci` → `pnpm docs:check` | Fails |

### What Runs Only Locally

These checks are available but are **not enforced in protected CI**:

| Check | Command | Notes |
| --- | --- | --- |
| Schema drift check | `pnpm schema:check` | Run after editing `shared/src/schema.ts` |
| Rules consistency | `pnpm rules:check` | Run after FSM/event changes |
| Go client validation | `pnpm go:clients:check` | Run after API changes |
| Full QA simulation matrix | `pnpm verify:full` | Heavyweight; local pre-release gate |
| API integration test | `pnpm verify:integration:api` | Requires running server |
| Secret scanning | `secretlint` (via lint-staged) | Runs on staged files pre-commit |
