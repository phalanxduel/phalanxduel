# Phalanx Duel — Rule Amendments

Amendments, clarifications, and errata to RULES.md that do not change the
wire protocol or game logic. For breaking changes, update RULES.md directly
and bump `specVersion`.

---

## RA-001: Wire-Format Terminology — Graveyard vs `discardPile`

**Date:** 2026-03-17
**Affects:** RULES.md § 2 (Canonical Vocabulary), GLOSSARY.md

RULES.md and GLOSSARY.md use the term **Graveyard** for destroyed/discarded
cards. The wire-format field in `PlayerStateSchema` is `discardPile`.

**Resolution:** Both terms refer to the same game concept. The canonical
gameplay term is **Graveyard**. The wire-format field name `discardPile`
is retained for backward compatibility. Clients SHOULD display "Graveyard"
in UI and documentation while reading the `discardPile` field from state.

A future major schema version MAY rename the field; this will be
a breaking change coordinated through `specVersion`.

---

## RA-002: `SCHEMA_VERSION` vs `specVersion` Semantics

**Date:** 2026-03-17
**Affects:** `shared/src/schema.ts`

Two version identifiers exist in the schema:

| Identifier | Current Value | Purpose |
|------------|---------------|---------|
| `SCHEMA_VERSION` | `0.4.0` | Runtime/transport schema revision. Tracks TypeScript type changes, field additions, protocol evolution. Follows semver. |
| `specVersion` | `1.0` | Game rules specification version. Tracks gameplay logic changes (attack resolution, suit effects, turn lifecycle). Matches RULES.md version. |

**Resolution:** These are intentionally separate. External clients should:

- Use `specVersion` to determine gameplay compatibility
- Use `SCHEMA_VERSION` to determine wire-format compatibility
- Display them separately if surfacing version info to users

The canonical, maintained guide for this policy now lives in
[`docs/architecture/versioning.md`](docs/architecture/versioning.md).

---

## RA-003: Match Parameter Override Contract

**Date:** 2026-03-17
**Affects:** RULES.md § 3.2

When a client sends `CreateMatchParamsPartial`:

- **Omitted fields** are filled from `DEFAULT_MATCH_PARAMS`
- **Explicitly invalid values** (violating § 3.3 Global System Constraints)
  are **rejected** with error code `INVALID_MATCH_PARAMS`

The server does NOT silently normalize explicit overrides. This was corrected
in the same commit that introduced this amendment.
