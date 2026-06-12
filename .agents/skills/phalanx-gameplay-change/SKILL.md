---
name: phalanx-gameplay-change
description: Repo-specific workflow for Phalanx Duel gameplay, rules, engine, shared schema, replay integrity, visibility, MatchActor, event-log, or server-authoritative behavior changes. Use before modifying engine/shared/server gameplay semantics, rule docs, generated contracts, deterministic replay surfaces, or any code path that can change legal actions, state transitions, redaction, match recovery, telemetry events, or player-visible game outcomes.
---

# Phalanx Gameplay Change

Use this skill before changing gameplay semantics. Treat the game as
server-authoritative and replay-verifiable unless the task explicitly changes
that architecture.

## Start Here

1. Read `AGENTS.md`.
2. If the work is Backlog-tracked, read `docs/tutorials/ai-agent-workflow.md`
   and the task record before editing.
3. Read `docs/architecture/principles.md` for package boundaries and the
   current MatchActor/ledger model.
4. Read `docs/quality/high-signal-surfaces.md` if the change touches any listed
   surface.
5. Read the relevant rule or ADR before changing behavior:
   - `docs/gameplay/rules.md`
   - `docs/gameplay/rule-amendments.md`
   - `docs/adr/`

## Discovery

Classify the change:

- `L1`: one bounded package or narrow gameplay behavior.
- `L2`: cross-package behavior, schemas, event logs, replay, visibility,
  MatchActor, persistence, or transport semantics.

For `L2`, trace the full path from intent to outcome:

```text
client/server input -> shared schema -> server validation -> engine apply
-> event derivation -> hash/replay -> projection/redaction -> broadcast/tests
```

Search for local analogs before adding new concepts. Prefer existing helpers,
fixtures, generated-artifact flows, and domain names.

## Guardrails

- Keep engine logic pure and deterministic.
- Preserve the dependency direction: `shared <- engine <- server`, and
  `shared <- client`.
- Do not move transport validation into engine legality checks.
- Do not redefine shared contract shapes locally.
- Treat visibility/redaction, replay hashes, event envelopes, and audit logs as
  high-risk even when the code change looks small.
- Update docs, schemas, generated artifacts, or tests when behavior changes.

Stop and ask for direction if the task requires an architecture rewrite,
destructive migration semantics, or a gameplay rule change that is not reflected
in the canonical rules or an ADR.

## Verification

Choose checks from the touched surface:

```bash
rtk pnpm --filter @phalanxduel/engine test
rtk pnpm --filter @phalanxduel/shared test
rtk pnpm --filter @phalanxduel/server test
rtk pnpm rules:check
rtk pnpm schema:check
rtk pnpm qa:playthrough:verify
rtk pnpm verify:quick
```

For UI follow-up work, the playability gate must pass before touching UI code.
