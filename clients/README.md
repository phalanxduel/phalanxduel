# External Clients

This directory is the canonical home for non-TypeScript client applications,
reference clients, and platform-specific prototypes that consume the Phalanx
Duel API or generated SDKs.

Agent-specific generation and contract guidance for this subtree lives in
[`clients/AGENTS.md`](./AGENTS.md).

## Layout Rule

- `sdk/` contains generated client libraries and machine-derived API artifacts.
- `clients/` contains runnable applications, examples, or platform-specific
  implementations built on top of those SDKs or the public API contract.

## Intended Structure

Examples of the shape this directory should support over time:

- `clients/go/...`
- `clients/swiftui/...`
- `clients/kotlin/...`
- `clients/tui/...`

Do not create empty placeholder app directories just for symmetry. Add a
language or platform subtree only when real code exists.

## Current Contents

- `clients/go/reference-cli/` — Go reference client built against the generated
  Go SDK in `sdk/go`.
