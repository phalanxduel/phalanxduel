---
id: TASK-374
title: 'Alpha distribution: duel-cli go-installable + tagged GitHub release'
status: Done
assignee: []
created_date: '2026-07-26 19:55'
updated_date: '2026-07-26 22:36'
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
- [x] #1 sdk/go/v0.1.0 and clients/go/duel-cli/v0.1.0 tags exist on origin
- [x] #2 duel-cli/go.mod has no relative replace directive
- [x] #3 go install github.com/phalanxduel/phalanxduel/clients/go/duel-cli@v0.1.0 succeeds from a clean GOBIN outside this checkout and the binary runs
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

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-07-26 22:36
---
AC #4 (go.work) is obsolete given the actual fix: duel-cli no longer depends on sdk/go as a separate module at all (it's embedded as internal/phalanxapi), so there's no cross-module replace directive left to reconcile for local dev. Leaving unchecked/N/A rather than adding an unused go.work file.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
duel-cli is now genuinely go-installable and tagged.

**Bug found and fixed mid-flight**: an earlier attempt to fix external installability via `go mod vendor` did not actually work. `go install pkg@version` builds the target as a *dependency* module in a synthetic build, not the main module — and Go rejects any dependency module whose `go.mod` carries a `replace` directive, regardless of vendoring. Verified this by attempting `go install .../duel-cli@v0.1.0` from a clean external `GOBIN` and getting the exact "must not contain directives that would cause it to be interpreted differently than if it were the main module" error. On top of that, the vendored `sdk/go` copy had been silently excluded from every commit by the repo's unanchored `sdk/` gitignore pattern (matches any path segment named `sdk`, not just the top-level dir), so it was never even present on GitHub despite the earlier commit claiming otherwise.

**Real fix**: `sdk/go`'s generated REST client is now embedded directly as `clients/go/duel-cli/internal/phalanxapi` (root-level `.go` files copied in, package name `phalanx` unchanged), eliminating the `require`+`replace` cross-module dependency entirely. Removed the now-unnecessary `vendor/` directory. Wired the copy step into `scripts/gen-sdk.ts` (`syncDuelCliSdk`) so `pnpm sdk:gen` keeps it current automatically, including a `go mod tidy` for `duel-cli` itself.

Deleted the broken `v0.1.0` tag/release and cut `v0.1.1` with the fix.

**Verified for real**, not assumed: ran `GOBIN=<clean external dir> go install github.com/phalanxduel/phalanxduel/clients/go/duel-cli@v0.1.1` from outside this checkout — succeeded, produced a genuine Mach-O arm64 binary, and running it (`duel-cli -h`) printed real usage output. `bash scripts/ci/check-go-clients.sh` (gofmt, test, build) passes locally.

Release: https://github.com/phalanxduel/phalanxduel/releases/tag/clients%2Fgo%2Fduel-cli%2Fv0.1.1
<!-- SECTION:FINAL_SUMMARY:END -->
