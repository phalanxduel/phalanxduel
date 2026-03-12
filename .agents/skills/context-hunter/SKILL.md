---
name: context-hunter
description: Focused discovery workflow for non-trivial code changes in this repo. Use before implementing or refactoring code to classify complexity, inspect local analogs, surface hidden conventions, and choose repo-native patterns. Skip only for trivial typos, renames, or copy-only edits.
---

# Context Hunter

Read the repo instructions first. If the change is tied to a Backlog task, also read [`backlog/docs/ai-agent-workflow.md`](../../../backlog/docs/ai-agent-workflow.md).

Before writing code, run a focused discovery loop. Do not load everything. Find the right files.

## Complexity Gate

Classify the task first:

- `L0`: trivial typos, renames, copy-only edits, obvious single-line fixes with no behavior change
- `L1`: behavior changes in one bounded package or feature area
- `L2`: cross-package changes, rules or data semantics, refactors, architecture-impacting work

Output by level:

- `L0`: no context brief, proceed directly
- `L1`: write a micro-brief
- `L2`: write a full context brief

Re-evaluate during discovery. If the blast radius grows, upgrade the level.

## Discovery Workflow

1. Assess completeness.
Ask what is likely missing from the request based on nearby code and tests.

2. Find local analogs.
Search the touched package first (`client`, `server`, `shared`, `engine`, `scripts`, or `docs`) and copy the nearest existing pattern.

3. Trace the real flow.
Follow the path from entry point to validation, state update, serialization, telemetry, and tests when those concerns exist in the area.

4. Reuse before inventing.
Look for existing helpers, schemas, fixtures, and generated-artifact workflows before adding new abstractions.

5. Check recent direction.
Inspect nearby tests, config, and recent commits in the same area so the change matches current practice instead of stale patterns.

## Probe For Silent Knowledge

Look for repo-specific rules that are easy to miss:

- determinism and replay integrity in `engine` and `shared`
- schema or artifact generation paths
- feature flag and env validation checks
- docs consistency checks for rules and state-machine changes
- telemetry, audit, or event-envelope conventions

Stop discovery when you can predict likely review feedback.

## Discovery Output

For `L1`, write a micro-brief:

- closest analog
- chosen pattern
- main risk or ambiguity

For `L2`, write a full brief:

- files reviewed
- patterns to follow
- reusable utilities or fixtures
- risks and unknowns

## Implementation Guardrails

- Match existing module boundaries and naming.
- Derive new names from local analogs instead of inventing them from general priors.
- Prefer consistency over novelty.
- If the request conflicts with local conventions, flag the conflict and offer a small number of alternatives.

## Verification

Run targeted validation first, then broaden based on risk. Use the commands in [`backlog/docs/ai-agent-workflow.md`](../../../backlog/docs/ai-agent-workflow.md) when the task is Backlog-tracked.
