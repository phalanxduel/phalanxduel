# Definition of Done

This document defines the project-specific completion bar for Phalanx Duel.

A change is not done because code exists, Husky passed on staged files, or a
single happy-path test succeeded. A change is done only when the behavior,
verification, documentation, and operational story all line up with the
project's trust model.

Use this document with:

- [`docs/RULES.md`](../RULES.md) for canonical gameplay rules
- [`docs/system/AI_COLLABORATION.md`](./AI_COLLABORATION.md) for human/AI collaboration expectations
- [`docs/system/EXTERNAL_REFERENCES.md`](./EXTERNAL_REFERENCES.md) for the external standards and guidance this policy draws from
- [`docs/system/ARCHITECTURE.md`](./ARCHITECTURE.md) for system boundaries
- [`docs/system/TYPE_OWNERSHIP.md`](./TYPE_OWNERSHIP.md) for cross-package type ownership
- [`.github/CONTRIBUTING.md`](../../.github/CONTRIBUTING.md) for local workflow and validation commands
- [`backlog/docs/ai-agent-workflow.md`](../../backlog/docs/ai-agent-workflow.md) for task verification expectations

## Canonical Sources

| Concern | Canonical source |
| --- | --- |
| Gameplay rules and invariants | [`docs/RULES.md`](../RULES.md) |
| Cross-package contracts and generated schemas | [`shared/src/schema.ts`](../../shared/src/schema.ts) |
| Runtime/package boundaries | [`docs/system/ARCHITECTURE.md`](./ARCHITECTURE.md) |
| Type ownership and package-local modeling | [`docs/system/TYPE_OWNERSHIP.md`](./TYPE_OWNERSHIP.md) |
| Flags, rollout controls, and admin behavior | [`docs/system/FEATURE_FLAGS.md`](./FEATURE_FLAGS.md), [`docs/system/ADMIN.md`](./ADMIN.md) |
| Contributor workflow and verification commands | [`.github/CONTRIBUTING.md`](../../.github/CONTRIBUTING.md) |
| Security disclosure and vulnerability handling | [`.github/SECURITY.md`](../../.github/SECURITY.md) |

If a change introduces behavior that is not covered by a canonical source, the
work is not done until the missing source is created or extended.

## Core Criteria

Every change must satisfy all of the following.

### 1. Spec and Model Alignment

- Behavior changes are traced to the relevant rule IDs, rule sections, schema
  definitions, or architectural constraints.
- Gameplay changes update [`docs/RULES.md`](../RULES.md) when the canonical
  rules changed, or explicitly note why the implementation still matches the
  existing rules.
- Cross-package or wire-contract changes update
  [`shared/src/schema.ts`](../../shared/src/schema.ts) and commit the generated
  artifacts that the repo treats as canonical outputs.
- Runtime boundary changes update the relevant system docs instead of leaving
  the real behavior buried in code review notes.
- Rules, schemas, docs, and implementation do not knowingly drift at merge time.

### 2. Verification Matches Risk

- Baseline verification is
  `pnpm check:quick`.
- `pnpm check:ci` is required when the change crosses packages, depends on
  build output, modifies generated artifacts, changes runtime behavior across
  client/server boundaries, or would be exercised by Husky pre-push/CI anyway.
- Gameplay, rules, or replay-sensitive changes also run targeted engine/server
  tests and `pnpm qa:playthrough:verify` when the changed path affects real
  match flow.
- UI and gameplay changes include manual two-player flow verification for the
  relevant create/join/watch/action path.
- Verification evidence is recorded in the task, PR, or final summary with the
  actual commands run and the meaningful result.
- Verification steps are easy to find and rerun. A future reviewer or operator
  should not have to reverse-engineer private tribal knowledge to confirm the
  change is actually done.

### 3. Fair Play, Trust, Safety, and Security

- The server remains authoritative for player identity and game outcome.
- No change leaks hidden information across player, spectator, admin, or public
  boundaries.
- Replay, hash-chain, transaction-log, and audit implications are reviewed for
  any change touching authoritative state, rules, persistence, or validation.
- Production-like auth, secrets, and failure modes fail closed rather than
  relying on permissive defaults.
- Errors exposed to users do not reveal secrets or misleading internal state.

### 4. Code Quality, Modularity, and Change Safety

- Code follows the existing package boundaries and naming conventions.
- Cross-package shapes live in `shared`; local-only shapes stay local.
- Runtime packages do not pull in tooling-only or test-only modules.
- New abstractions are introduced only when they reduce duplication or make a
  trust-critical boundary clearer.
- Complex immutable inputs use explicit objects or interfaces instead of long
  positional parameter chains.
- No orphan `TODO`, `FIXME`, or deferred edge case remains without a linked
  backlog task or issue.

### 5. Observability and Operations

- New critical paths emit or update the logs, traces, metrics, and tags needed
  to diagnose real incidents.
- Observability is accessible, not merely present. The people responsible for
  support, moderation, QA, or release decisions can reach the relevant evidence
  without code archaeology or ad hoc shell spelunking.
- Feature-flagged or staged rollouts define the operator control surface,
  telemetry expectation, and rollback path.
- Admin, flag, or operational workflow changes update the relevant docs and
  runbooks.
- A change that would be hard to verify in production adds or improves the
  instrumentation needed to make it supportable.

### 6. Accessibility, Understandability, and Respect

- Player-facing changes preserve or improve clarity of game flow, rules, and
  failure handling.
- Rules, critical system behavior, and support diagnostics are documented in a
  way that a new contributor, reviewer, or operator can actually access and use.
- Code is accessible to maintainers: module ownership is visible, naming is
  coherent, and the important invariants are easier to find after the change
  than before it.
- Developer-facing changes leave a comprehensible trail: the next contributor
  can see what changed, why it is safe, and how to verify it.
- Standard repo tooling is respected: lint, format, rules/schema/docs drift
  checks, Husky, and CI are part of the supported workflow, not optional
  suggestions.
- New dependencies, scripts, or generated artifacts are justified by clear
  ongoing value to the codebase and the ecosystem around it.

### 7. AI-Assisted Work

- AI-assisted changes follow
  [`docs/system/AI_COLLABORATION.md`](./AI_COLLABORATION.md).
- The task framing is explicit enough that another human can see the intended
  outcome, the constraints, and the verification path.
- AI output is not considered done, correct, or safe until a human has reviewed
  the design, verification evidence, and trust-critical implications.
- Instruction files stay concise, non-conflicting, and scoped to the surface
  they actually govern.
- AI assistance must improve clarity and throughput without weakening review
  quality, code accessibility, or the repo's trust model.

## Change-Specific Additions

Apply these extra expectations when the change touches the listed surface.

| Change surface | Additional done criteria |
| --- | --- |
| Rules engine, turn flow, replay, state machine | Cite affected rule IDs or rule sections, run `pnpm rules:check`, prove replay/hash impact was considered, and add or update regression coverage for the changed rule path. Make the verification path easy for a reviewer to follow from rule to code to test. |
| Shared schema, API, WebSocket payloads, stored match shape | Run `pnpm schema:check`, commit generated artifacts, explain backward-compatibility impact, and verify clients/replay data still interpret the contract correctly. Keep contract ownership and version expectations discoverable. |
| Server authority, auth, persistence, admin, feature flags, observability | Review hidden-state, actor-authority, privacy, secret-handling, and fail-closed behavior; update telemetry/admin/runbook docs when the operator surface changes. Ensure the support path to the critical evidence is documented, not implicit. |
| Client UX, onboarding, or gameplay presentation | Verify the changed flow manually, cover the error/reconnect/empty/loading states that matter, and ensure the UI does not imply rules or trust guarantees the backend does not actually provide. Rules and important player guidance should stay easy to find. |
| Docs, scripts, or workflow tooling | Verify the documented commands and paths against the current repo, keep canonical ownership explicit, and update hooks/CI expectations when the supported workflow changes. Verification instructions must remain runnable by someone who did not author the change. |

## Husky and Task-Completion Rules

- Passing pre-commit on staged files is necessary but not sufficient.
- Do not treat a change as done if it only passed `lint-staged` but not the
  repo-level checks required by its risk.
- Do not bypass Husky, markdown drift checks, schema drift checks, or replay and
  authority checks without documenting the reason and running equivalent manual
  verification.
- A backlog task is not done until the acceptance criteria are satisfied and the
  verification evidence is written down.

## Not Done If

The work is not done if any of the following are true:

- docs and runtime knowingly disagree on rules, contracts, or operational behavior
- a trust-boundary question is deferred without an explicit tracked follow-up
- a risky runtime path shipped without enough telemetry or rollback control to support it
- the only evidence is "it seems to work" rather than reproducible commands, tests, or QA
- the verification trail exists only in the author's head and is not accessible
  to reviewers, operators, or future maintainers
- the code is harder to reason about because ownership, naming, or module boundaries became less clear

When in doubt, choose the narrower claim, document the gap, and track the next
step explicitly.
