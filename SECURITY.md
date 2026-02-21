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
