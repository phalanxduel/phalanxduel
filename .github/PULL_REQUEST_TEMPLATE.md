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
- [ ] `docs/TESTPLAN.md` mapping updated (if rule behavior changed)
- [ ] Protocol/schema changed (`shared/src/schema.ts`) and generated artifacts committed
- [ ] Backward compatibility considered for clients/replay data

## Validation

Local results (copy exact outcomes):

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm schema:check
pnpm rules:check
```

- [ ] All CI-equivalent checks pass locally

## Test Coverage Added

List new/updated tests and what they verify.

## Manual QA (Required For UI/Gameplay Changes)

- [ ] Two-player flow exercised (create/join + action flow)
- [ ] Regression checks for win/lose/forfeit/reconnect path (as applicable)
- [ ] Screenshots or short clips attached for UI changes

## Risks And Rollback

Describe the main risks and how to revert safely if needed.

## Reviewer Notes

Anything reviewers should focus on first (hot spots, tradeoffs, known limitations).
