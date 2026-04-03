---
title: "Definition of Done — Core Criteria"
description: "The 7 criteria every change must satisfy: spec alignment, verification, trust/safety, code quality, observability, accessibility, and AI-assisted work."
status: active
updated: "2026-03-14"
audience: agent
related:
  - docs/system/DEFINITION_OF_DONE.md
  - docs/system/dod/change-surfaces.md
  - docs/system/dod/completion-rules.md
---

# Core Criteria

Every change must satisfy all of the following.

## 1. Spec and Model Alignment

- Behavior changes are traced to the relevant rule IDs, rule sections, schema definitions, or architectural constraints.
- Gameplay changes update [`docs/RULES.md`](../../RULES.md) when the canonical rules changed, or explicitly note why the implementation still matches the existing rules.
- Cross-package or wire-contract changes update [`shared/src/schema.ts`](../../../shared/src/schema.ts) and commit the generated artifacts that the repo treats as canonical outputs.
- Runtime boundary changes update the relevant system docs instead of leaving the real behavior buried in code review notes.
- Rules, schemas, docs, and implementation do not knowingly drift at merge time.

## 2. Verification Matches Risk

- Baseline verification is `pnpm verify:quick`.
- `pnpm verify:all` is required when the change crosses packages, depends on build output, modifies generated artifacts, changes runtime behavior across client/server boundaries, or would be exercised by Husky pre-push/CI anyway.
- Gameplay, rules, or replay-sensitive changes also run targeted engine/server tests and `pnpm qa:playthrough:verify` when the changed path affects real match flow.
- UI and gameplay changes include manual two-player flow verification for the relevant create/join/watch/action path.
- Verification evidence is recorded in the task, PR, or final summary with the actual commands run and the meaningful result.
- Verification steps are easy to find and rerun. A future reviewer or operator should not have to reverse-engineer private tribal knowledge to confirm the change is actually done.

## 3. Fair Play, Trust, Safety, and Security

- The server remains authoritative for player identity and game outcome.
- No change leaks hidden information across player, spectator, admin, or public boundaries.
- Replay, hash-chain, transaction-log, and audit implications are reviewed for any change touching authoritative state, rules, persistence, or validation.
- Production-like auth, secrets, and failure modes fail closed rather than relying on permissive defaults.
- Errors exposed to users do not reveal secrets or misleading internal state.

## 4. Code Quality, Modularity, and Change Safety

- Code follows the existing package boundaries and naming conventions.
- Cross-package shapes live in `shared`; local-only shapes stay local.
- Runtime packages do not pull in tooling-only or test-only modules.
- New abstractions are introduced only when they reduce duplication or make a trust-critical boundary clearer.
- Complex immutable inputs use explicit objects or interfaces instead of long positional parameter chains.
- No orphan `TODO`, `FIXME`, or deferred edge case remains without a linked backlog task or issue.

## 5. Observability and Operations

- New critical paths emit or update the logs, traces, metrics, and tags needed to diagnose real incidents.
- Observability is accessible, not merely present. The people responsible for support, moderation, QA, or release decisions can reach the relevant evidence without code archaeology or ad hoc shell spelunking.
- Feature-flagged or staged rollouts define the operator control surface, telemetry expectation, and rollback path.
- Admin, flag, or operational workflow changes update the relevant docs and runbooks.
- A change that would be hard to verify in production adds or improves the instrumentation needed to make it supportable.

## 6. Accessibility, Understandability, and Respect

- Player-facing changes preserve or improve clarity of game flow, rules, and failure handling.
- Rules, critical system behavior, and support diagnostics are documented in a way that a new contributor, reviewer, or operator can actually access and use.
- Code is accessible to maintainers: module ownership is visible, naming is coherent, and the important invariants are easier to find after the change than before it.
- Developer-facing changes leave a comprehensible trail: the next contributor can see what changed, why it is safe, and how to verify it.
- Standard repo tooling is respected: lint, format, rules/schema/docs drift checks, Husky, and CI are part of the supported workflow, not optional suggestions.
- New dependencies, scripts, or generated artifacts are justified by clear ongoing value to the codebase and the ecosystem around it.

## 7. AI-Assisted Work

- AI-assisted changes follow [`AGENTS.md`](../../../AGENTS.md).
- The task framing is explicit enough that another human can see the intended outcome, the constraints, and the verification path.
- AI output is not considered done, correct, or safe until a human has reviewed the design, verification evidence, and trust-critical implications.
- For PR-backed work tracked in Backlog, review-ready tasks move to `Human Review` instead of `Done`, and they do not leave that state until the human review is complete.
- Instruction files stay concise, non-conflicting, and scoped to the surface they actually govern.
- AI assistance must improve clarity and throughput without weakening review quality, code accessibility, or the repo's trust model.
