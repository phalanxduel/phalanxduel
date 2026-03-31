---
id: TASK-151
title: Multi-client Repository Layout
status: Human Review
assignee:
  - '@codex'
created_date: '2026-04-01 14:48'
updated_date: '2026-04-01 15:00'
labels:
  - sdk
  - repo-hygiene
  - architecture
dependencies:
  - TASK-120
references:
  - scripts/gen-sdk.ts
  - sdk/go
  - clients/go/reference-cli/main.go
priority: high
---

## Description

Move the repo toward a durable multi-client layout where generated SDKs live in
`sdk/` and external client implementations live in a dedicated `clients/`
surface instead of accumulating one-off examples under root-level directories.

## Rationale

The Go example proves the API can be consumed outside the TypeScript app, but
its current placement under `examples/` does not scale well to future SwiftUI,
Kotlin/Android, TUI, or other platform clients. The repo should establish the
structure now without implementing those clients yet.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The Go client/example is moved into a dedicated `clients/` tree that can scale to multiple languages and platforms.
- [x] #2 Repo guidance clearly distinguishes generated SDK artifacts in `sdk/` from implementation apps/examples in `clients/`.
- [x] #3 Existing references to the old `examples/go-client` path are updated so the repo tells one coherent story.
<!-- AC:END -->

## Implementation Plan

1. Create a top-level `clients/` directory with a short canonical README that
   explains the distinction between `sdk/` and `clients/`.
2. Move the current Go example into the new `clients/go/` subtree using a name
   that leaves room for future Go apps or reference clients.
3. Update repo docs and backlog references that still point at
   `examples/go-client`.
4. Verify the moved Go module still builds and the markdown/docs surfaces are
   consistent.

## Implementation Notes

- Added `clients/README.md` as the canonical rule for external-client layout:
  generated libraries stay in `sdk/`, while runnable platform clients live
  under `clients/<language-or-platform>/...`.
- Moved the existing Go reference client from `examples/go-client/` to
  `clients/go/reference-cli/`.
- Kept the generated Go SDK import path untouched (`github.com/phalanxduel/game/sdk/go`)
  so the move is about repo layout only, not SDK packaging.
- Updated `README.md`, `docs/system/DEVELOPER_GUIDE.md`, and `TASK-120` so the
  repo now points at `clients/go/reference-cli/` instead of the retired
  `examples/go-client/` path.

## Verification

- `cd clients/go/reference-cli && go build .`
- `pnpm exec markdownlint-cli2 README.md docs/system/DEVELOPER_GUIDE.md clients/README.md "backlog/tasks/task-120 - Automate-SDK-Client-Stub-Generation-from-Specs.md" "backlog/tasks/task-151 - Multi-client-Repository-Layout.md" --config .markdownlint-cli2.jsonc`
- `rg -n "examples/go-client|clients/go/reference-cli" README.md docs backlog clients`

## Do Not Break

- Do not change the generated SDK location or import path in `sdk/go`.
- Do not imply that SwiftUI, Kotlin, or TUI clients already exist.
- Do not turn the root into a grab-bag of language-specific client folders.
