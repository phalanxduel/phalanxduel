# GitHub Copilot Instructions

Start with the canonical repo docs instead of guessing:

- [`.github/CONTRIBUTING.md`](./CONTRIBUTING.md)
- [`docs/system/DEFINITION_OF_DONE.md`](../docs/system/DEFINITION_OF_DONE.md)
- [`AGENTS.md`](../AGENTS.md)
- [`docs/RULES.md`](../docs/RULES.md) for gameplay behavior
- [`shared/src/schema.ts`](../shared/src/schema.ts) for shared contracts

Repository-wide expectations:

- Keep changes scoped to one concern.
- Do not treat passing staged-file hooks as sufficient proof of completion.
- Run the verification that matches the risk of the change and report the exact commands used.
- Update the canonical docs when rules, contracts, workflows, or operator behavior change.
- Prefer short, non-conflicting instructions and the nearest applicable source of truth over duplicated guidance.
- Human review, testing, and judgment are still required before merge.
