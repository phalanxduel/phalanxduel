---
id: TASK-374
title: 'Alpha distribution: duel-cli go-installable + tagged GitHub release'
status: To Do
assignee: []
created_date: '2026-07-26 19:55'
labels:
  - release
  - duel-cli
  - go
dependencies: []
references:
  - clients/go/duel-cli/go.mod
  - sdk/go/go.mod
  - docs/architecture/versioning.md
priority: high
type: chore
ordinal: 241800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make clients/go/duel-cli installable two ways: `go install github.com/phalanxduel/phalanxduel/clients/go/duel-cli@latest` and a Homebrew formula that builds from source.

Blocker found this session: duel-cli/go.mod has a relative `replace github.com/phalanxduel/phalanxduel/sdk/go => ../../../sdk/go`. This works locally but breaks `go install` for anyone outside this exact checkout, since replace directives in a dependency's own go.mod are ignored by module-proxy resolution.

Fix sequence:
1. Tag sdk/go independently (`sdk/go/v0.1.0`), push.
2. Remove the replace in duel-cli/go.mod, pin `require github.com/phalanxduel/phalanxduel/sdk/go v0.1.0` (real, now-resolvable via proxy.golang.org).
3. `go mod tidy` in clients/go/duel-cli to regenerate go.sum against the real module.
4. Add a go.work at repo root (`use ./sdk/go ./clients/go/duel-cli`) for local dev ergonomics — go.work is ignored by `go install` from outside the repo, so it doesn't undo the fix.
5. Tag `clients/go/duel-cli/v0.1.0`, push.
6. Verify externally: `GOBIN=<clean temp dir> go install github.com/phalanxduel/phalanxduel/clients/go/duel-cli@v0.1.0` from outside this checkout, run the resulting binary.

Version-compatibility gate (clientVersion/compatibleSchemaMajor const + startup check against /api/defaults' schemaVersion) is already implemented and pushed (commit 1d6e5604) — this task is the remaining install-path plumbing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 sdk/go/v0.1.0 and clients/go/duel-cli/v0.1.0 tags exist on origin
- [ ] #2 duel-cli/go.mod has no relative replace directive
- [ ] #3 go install github.com/phalanxduel/phalanxduel/clients/go/duel-cli@v0.1.0 succeeds from a clean GOBIN outside this checkout and the binary runs
- [ ] #4 go.work exists at repo root for local dev convenience
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
