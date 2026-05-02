---
description: TypeScript and project coding conventions for this monorepo
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

## Code style

- No comments unless the WHY is non-obvious (hidden constraint, subtle invariant, workaround)
- No trailing summaries or docstrings explaining what the code does — names do that
- No half-finished implementations or TODO stubs
- No error handling for scenarios that cannot happen; trust internal guarantees
- Prefer editing existing files over creating new ones

## Async and event handlers

- Async functions passed to `onClick` must be wrapped: `onClick={() => { void fn(); }}`
- Floating promises must be voided: `void promise.then(...)`

## Testing

- Test triggers and observable behavior, not implementation details
- `recordTrigger()` calls must happen unconditionally before any DOM null-guard early returns
  (automation relies on triggers firing even when DOM elements are absent in jsdom)

## Imports

- Use `import type` for type-only imports
- Shared types come from `@phalanxduel/shared`

## Security

- Never introduce command injection, XSS, SQL injection, or other OWASP top 10 vectors
- Server is always authoritative — no gameplay logic in client code
- No secrets, tokens, or credentials in source files
