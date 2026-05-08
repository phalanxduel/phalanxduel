# Completion Rules

The final checklist before a task is closed.

## Git & CI/CD
- [ ] Branch is synchronized with `main`.
- [ ] Commit messages follow the project convention.
- [ ] CI pipeline is green (no skips or bypasses).

## Documentation
- [ ] `CHANGELOG.md` is updated with user-facing changes.
- [ ] Internal documentation (ADRs, READMEs) is current.
- [ ] Stale files or directories have been pruned.

## "Not Done If" Checklist
- [ ] You used `--no-verify` to bypass hooks.
- [ ] The build is broken for other workspaces.
- [ ] Documentation links are broken.
- [ ] The "Truth Gate" tests are failing.
