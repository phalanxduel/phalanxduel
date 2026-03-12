## Summary

Describe exactly what changed.

## Why

Describe the user-facing or developer-facing problem this PR solves.

## Scope

- [ ] Engine logic
- [ ] Server API / match lifecycle / WebSocket behavior
- [ ] Shared schema / protocol contracts
- [ ] Client UI/UX
- [ ] Docs only
- [ ] Build/deploy/ops

## Rule And Contract Impact

- Rule IDs affected (from `docs/RULES.md`): `PHX-...`
- [ ] Rule-to-test, fixture, or QA traceability updated in this PR (if rule behavior changed)
- [ ] Protocol/schema changed (`shared/src/schema.ts`) and generated artifacts committed
- [ ] Replay / hidden-state / actor-authority impact reviewed (if gameplay or server behavior changed)
- [ ] Backward compatibility considered for clients/replay data

## Validation

Local results (copy exact outcomes):

```bash
pnpm check:quick
pnpm check:ci # if cross-package, generated-artifact, or runtime-behavior change
pnpm qa:playthrough:verify # if gameplay or rules change
```

- [ ] Verification depth matched the risk of the change
- [ ] All required CI-equivalent checks pass locally
- [ ] Verification steps and evidence are easy for another reviewer to rerun

## Test Coverage Added

List new/updated tests and what they verify.

## Manual QA (Required For UI/Gameplay Changes)

- [ ] Two-player flow exercised (create/join + action flow)
- [ ] Regression checks for win/lose/forfeit/reconnect path (as applicable)
- [ ] Screenshots or short clips attached for UI changes

## Risks And Rollback

Describe the main risks and how to revert safely if needed.

- [ ] Observability / feature flag / rollback impact reviewed (if runtime behavior changed)

## Reviewer Notes

Anything reviewers should focus on first (hot spots, tradeoffs, known limitations).
If AI materially assisted, call out assumptions, generated hot spots, or areas
that deserve extra human review.
