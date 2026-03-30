# Rule Change Governance Process

This document defines how rule changes to the Phalanx game system are proposed, reviewed, tested, and deployed. Rule changes are trust-critical — they affect gameplay fairness, replay integrity, and player expectations.

> **Canonical rules source:** [docs/RULES.md](../RULES.md) (v1.0 Final)
>
> **Glossary:** [docs/system/GLOSSARY.md](GLOSSARY.md)

---

## 1. When This Process Applies

This process applies to any change that:

- Modifies game logic in `engine/src/` (state machine, attack resolution, suit effects, deployment, cleanup, reinforcement, pass rules)
- Alters the turn lifecycle phases or their ordering
- Changes destruction eligibility rules (Classic Aces, Classic Face Cards)
- Adds, removes, or modifies match configuration parameters
- Introduces new game modes or victory conditions
- Modifies the deterministic replay guarantee (§18 of RULES.md)

This process does **not** apply to:

- Bug fixes that bring the implementation into alignment with RULES.md (those are implementation corrections, not rule changes)
- UI-only changes (animations, layout, styling)
- Server infrastructure changes that don't affect game logic

---

## 2. Proposal

### 2.1 Required Information

Every rule change proposal must include:

1. **Rule section(s) affected** — Cite the specific RULES.md section numbers (e.g., §9.2, §10)
2. **Motivation** — Why the rule change is needed (gameplay balance, clarity, new format support)
3. **Specification** — Exact wording of the proposed rule change, written in the same deterministic style as RULES.md
4. **Backward compatibility impact** — How this affects:
   - Existing match replays (can old replays still be verified?)
   - Active matches in progress
   - Client implementations consuming the API
5. **Fairness assessment** — Does this change advantage or disadvantage specific strategies?

### 2.2 How to Propose

- **Backlog task:** Create a task in `backlog/tasks/` with the label `rules-change`
- **Architecture Decision Record (ADR):** For significant changes, create an ADR in `backlog/decisions/`

---

## 3. Review Checklist

Before a rule change can be merged, the following must be verified:

### 3.1 Correctness

- [ ] The change is consistent with the deterministic guarantee (§18): identical inputs produce identical outputs
- [ ] Hard invariants (§19) are preserved
- [ ] The change does not introduce randomness into resolution

### 3.2 Fairness

- [ ] Neither player gains a systematic advantage from the change
- [ ] Suit effects remain balanced relative to each other
- [ ] The change does not create degenerate strategies (infinite loops, guaranteed wins)

### 3.3 Backward Compatibility

- [ ] **Replay impact assessed:** Can matches played under the old rules still be replayed and verified?
- [ ] If replay-breaking: a `specVersion` bump is included (e.g., `1.0` → `1.1`)
- [ ] If replay-breaking: existing `transactionLog` entries remain valid for their original `specVersion`

### 3.4 Documentation

- [ ] `docs/RULES.md` updated with the new rule text
- [ ] `docs/system/GLOSSARY.md` updated if new terms are introduced
- [ ] `docs/RULE_AMENDMENTS.md` updated with an amendment record (if applicable)
- [ ] Schema descriptions in `shared/src/schema.ts` updated to reflect the change

### 3.5 Testing

- [ ] Engine unit tests added or updated in `engine/tests/`
- [ ] Server integration tests verified in `server/tests/`
- [ ] `pnpm rules:check` passes (FSM consistency between RULES.md and code)
- [ ] Schema regeneration: `pnpm --filter @phalanxduel/shared schema:gen` produces no diff (or expected changes are committed)

---

## 4. Automated Verification

The repository has CI tooling that enforces rule consistency:

| Tool | Command | What It Checks |
|------|---------|----------------|
| FSM Consistency | `tsx scripts/ci/verify-doc-fsm-consistency.ts` | Verifies that phases listed in RULES.md match the state machine in `engine/src/state-machine.ts` |
| Event Log Verification | `tsx scripts/ci/verify-event-log.ts` | Validates event schema consistency |
| Schema Verification | `bash scripts/ci/verify-schema.sh` | Ensures generated JSON schemas are up-to-date |
| Full Check | `bin/check` | Runs build → lint → typecheck → test → all verification scripts |

These checks run in the pre-commit hook and in CI. A rule change that breaks any of these checks cannot be merged.

---

## 5. Rollout Strategy

### 5.1 Feature Flags

For rule changes that need gradual rollout or A/B testing:

1. Gate the change behind a feature flag (see `docs/system/FEATURE_FLAGS.md`)
2. Default the flag to the existing behavior
3. Enable in a controlled environment (staging, internal playtesting) before production

### 5.2 Version Bumps

- **Non-breaking changes** (new optional modes, additional metadata): keep `specVersion: "1.0"`
- **Breaking changes** (altered resolution logic, modified phase order): bump `specVersion` to `"1.1"` or higher
- **Match parameters** that change defaults must be reflected in `DEFAULT_MATCH_PARAMS` in `shared/src/schema.ts`

### 5.3 Rollback

If a rule change causes issues in production:

1. Revert the commit on `main`
2. If the change was feature-flagged, disable the flag
3. Active matches may need to be invalidated if the rule change was applied mid-match

---

## 6. Player Communication

Rule changes that affect gameplay should be communicated:

- **Changelog entry** in release notes
- **In-game notification** for significant balance changes (future capability)
- **Discord/community announcement** for major rule overhauls

---

## Cross-References

- [RULES.md](../RULES.md) — Canonical rules specification
- [DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md) — Core done criteria; see [Change Surfaces](dod/change-surfaces.md) for rules engine specifics
- [FEATURE_FLAGS.md](FEATURE_FLAGS.md) — Feature flag system for gradual rollout
- [GLOSSARY.md](GLOSSARY.md) — Canonical term definitions
- [SCHEMA_EVOLUTION_STRATEGY.md](SCHEMA_EVOLUTION_STRATEGY.md) — Schema versioning and migration
