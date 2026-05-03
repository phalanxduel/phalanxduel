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

## tsc is authoritative over ESLint

When tsc and ESLint disagree, **tsc wins**. ESLint is advisory; tsc is the build gate.

**Do not remove type assertions based on ESLint autofix if doing so breaks tsc.**
The `@typescript-eslint/no-unnecessary-type-assertion` rule only checks local type compatibility
and does not model downstream effects (e.g., type predicate constraints on `.filter()`).

The correct response when ESLint flags an assertion that tsc requires:
1. **Fix the types properly** — use explicit return type annotations, typed variables, or
   `satisfies` to express intent without assertions. This is almost always the right answer.
2. If a cast is genuinely unavoidable (e.g., narrowing through an opaque third-party API),
   add `// eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion` on the
   same line as the expression being cast (not `disable-next-line` — Prettier can move it).

The lint-on-save hook runs `eslint --fix`. ESLint 10 reports unused disable directives as
warnings and fixes them. A `disable-next-line` comment placed before a multiline expression
gets moved inside by Prettier, making the directive target the wrong line and appear unused.
Inline `disable-line` on the expression's opening token survives reformatting.

## Security

- Never introduce command injection, XSS, SQL injection, or other OWASP top 10 vectors
- Server is always authoritative — no gameplay logic in client code
- No secrets, tokens, or credentials in source files
