---
id: TASK-377
title: 'Release automation: tag-to-release pipeline + changelog-from-commits'
status: Done
assignee: []
created_date: '2026-07-26 19:55'
updated_date: '2026-07-27 01:36'
labels:
  - release
  - automation
  - ci
dependencies:
  - TASK-376
priority: medium
type: chore
ordinal: 244800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Deferred from the alpha-packaging session (TASK-374/375/376) to keep those scoped. Today's flow is manual: hand-run gh release create, hand-pin sha256 into the tap formulas. Automate:
- A GitHub Action per component (main app, duel-cli, game-swiftui) that on tag push builds, generates release notes from conventional-commit messages since the previous tag, creates the GitHub release, and bumps the corresponding homebrew-tap formula/cask sha256 automatically.
- CHANGELOG.md is currently hand-maintained; investigate generating it (or a per-release notes artifact) from the same commit-delta source so there's one source of truth instead of two.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Automated the tag-to-release pipeline for the two components where all of today's manual pain actually was — `clients/go/duel-cli` and `game-swiftui` — and scoped the main app down to changelog-drafting only, per the plan's discussion of why the main app's version bump (which sets `SCHEMA_VERSION`) needs to stay a deliberate human decision.

Built:
- `scripts/release/generate-notes.sh` — conventional-commit → grouped (Added/Fixed/Changed) release-notes generator, optionally scoped to a path prefix. Verified against real history: `v0.1.1..v0.1.2` for duel-cli, and against `game-swiftui`'s only tag. Caught and fixed a real bash bug during testing (`while read` silently dropping the final line of `git log`'s no-trailing-newline output — fixed with the standard `|| [ -n "$subject" ]` guard).
- `.github/workflows/release-duel-cli.yml` (this repo) and `.github/workflows/release.yml` (game-swiftui, copied `bin/generate-notes.sh` since that repo shares no script layer with this one) — both trigger on their respective tag patterns, build/test/sign as appropriate, generate notes, `gh release create`, then bump the corresponding `homebrew-tap` formula/cask `url`/`sha256`/`version` via a cross-repo PAT and push directly. Both pass `actionlint` clean (fixed two real shellcheck findings along the way, not just silenced them).
- `pnpm release:notes` (`scripts/release/generate-changelog-entry.ts`) — drafts a `CHANGELOG.md`-ready entry from commits since the last plain `vX.Y.Z` tag, for human review. Does not touch `SCHEMA_VERSION`, tagging, or the existing `release:prepare`/`release:tag` scripts.
- READMEs (`clients/go/duel-cli/README.md`, `game-swiftui/README.md`) updated with a "Cutting a Release" section replacing the manual steps.

**Outstanding manual step (yours, not automatable by me):** the `HOMEBREW_TAP_PAT` secret doesn't exist yet in either `phalanxduel/phalanxduel` or `phalanxduel/game-swiftui` (confirmed via `gh secret list` — empty). Create a fine-grained PAT scoped to `Contents: write` on `phalanxduel/homebrew-tap` only (GitHub Settings → Developer settings → Fine-grained tokens), then either set it yourself or hand me the value and I'll `gh secret set` it into both repos. Until then, the workflows will fail cleanly at the tap-bump step with a clear credentials error on the next real tag push — not silently — so this is safe to leave for now. First real end-to-end validation will happen naturally on the next real `duel-cli` or `game-swiftui` release.
<!-- SECTION:FINAL_SUMMARY:END -->
