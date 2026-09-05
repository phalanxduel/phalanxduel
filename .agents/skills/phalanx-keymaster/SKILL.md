---
name: phalanx-keymaster
description: Safely manage Phalanx Duel secrets, tokens, keys, and passwords across local development and approved managed targets. Use when provisioning, auditing, rotating, allocating, troubleshooting, or documenting credentials and environment configuration.
---

# Phalanx Keymaster

Protect the credential boundary for Phalanx Duel. Secret values are never
loaded into agent context, printed, pasted into chat, committed, or included
in generated artifacts.

## Canonical sources and tools

- Read `docs/configuration.md` and this repository's database/environment
  isolation rules before acting.
- The managed secret DSL is `.env.secrets` plus the local override
  `.env.secrets.local`. `.env.local.secrets` is not a recognized filename for
  `scripts/maint/sync-secrets.ts`; flag it as an unprocessed file rather than
  guessing or copying its contents.
- Use `scripts/maint/sync-secrets.ts` through the `pnpm env:*` wrappers for
  remote audit, bootstrap, push, prune, remove, and rotation workflows.
- The local runtime loader is `scripts/release/load-release-env.sh`; Vite also
  loads the standard `.env.local` path. The secret DSL is not automatically a
  Vite runtime environment file.

## DSL contract

Each managed key has decorators immediately above it:

```text
# @target: ALL|RUNTIME|PIPELINE|LOCAL
# @concern: GENERAL|DATABASE|OBSERVABILITY|ADMIN|AUTH|EMAIL
# @description: purpose and owner
KEY=value
```

Allocate the narrowest target. Development-only RUM credentials such as
`VITE_PHX_RUM_TOKEN` are `LOCAL` + `OBSERVABILITY`; never push them to Fly.io
or GitHub environments.

## Operating rules

- Metadata-only inspection is the default: filenames, key names, decorators,
  target membership, and remote presence are safe; values are not.
- Never run commands that dump environments, source secret files, echo values,
  or place credentials in process arguments or logs.
- Treat tokens as credentials even when a browser SDK calls them client
  tokens. Use local-only origin and build guards for development telemetry.
- Rotation, removal, pruning, remote pushes, and credential allocation require
  explicit user authorization for the exact target and scope.
- Before rotation or removal, identify consumers and produce a rollback plan;
  never revoke the only working credential without a replacement path.
- Do not infer a secret is healthy from a present key. Verify only through a
  redacted health check or service behavior that cannot reveal the value.

## Verification and handoff

Report the key names and target scopes, never values. Record whether the
credential is local-only, which consumer receives it, and which verification
passed. Use `git diff --check` and the relevant typecheck/tests after code
changes. Never commit `.env*`, generated secret material, or handoff files.

For OpenObserve browser monitoring, also read
`docs/agents/skills/phalanx-local-rum/SKILL.md`; for O2 service and dashboard
work, read the Phalanx O2 operator skill.
