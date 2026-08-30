---
title: "Card Cosmetics"
description: "Canonical identifiers, visibility rules, and visual constraints for unlockable card backs and card themes."
status: active
updated: "2026-07-30"
audience: contributor
related:
  - docs/reference/rules.md
  - docs/system/UI_COMPONENT_TAXONOMY.md
  - docs/reference/qa-runners.md
---

# Card Cosmetics

Card cosmetics are presentation-only player loadouts. They do not change card
identity, rules, legal actions, combat outcomes, replay hashes, or any other
deterministic game state.

## Registry

| ID | Player-facing name | Unlock | Card back | Card face treatment |
|---|---|---|---|---|
| `default` | Standard Issue | Available to everyone | Existing neutral treatment | Existing suit-led treatment |
| `dual-loop` | Dual Loop | Complete one authenticated match | `/images/card-backs/dual-loop.webp` | Bone, oxidized brass, cyan, and near-black loop treatment |

Unknown or missing IDs must resolve to `default`.

## Dual Loop design contract

Dual Loop is an original Phalanx Duel design built from two interlocking
systems: an angular string-like path and a concentric percussive path. Their
offset repetition evokes microtonal phrasing, loop-pedal construction,
asymmetric rhythm, handmade cardboard, and a cold industrial atmosphere.

The artwork does not reproduce artist photographs, costumes, masks, logos,
lettering, record packaging, or other recognizable protected imagery. Its
inspiration is conceptual and structural.

The canonical back is a 1000 × 1400 WebP image (5:7 portrait). It uses
top-to-bottom rotational symmetry, a double border, and a high-contrast center
so the design remains recognizable in an opponent hand at approximately
36 × 50 CSS pixels.

The face theme uses these core colors:

| Token | Value | Use |
|---|---|---|
| Near-black blue | `#07151d` | Card body and deep edge |
| Warm bone | `#dccba4` | Readable neutral ink |
| Oxidized brass | `#b8842f` | Structural accent |
| Electric cyan | `#0087ae` | Loop and interaction accent |

Suit color, face value, health, selection, legal-target, and disabled-state
signals remain authoritative over the cosmetic palette.

## Ownership and visibility

The owning player's equipped cosmetic controls:

- the back shown for every redacted card in that player's hand;
- the face treatment on that player's public battlefield cards; and
- the same public surfaces for spectators.

The server projects only a stable cosmetic ID for each player. Hidden hands
remain empty arrays in observer projections; clients construct non-interactive
back placeholders from the already-public `handCount`. Cosmetic metadata must
never include card IDs, faces, suits, ordering, or any other hidden information.

Cosmetic IDs live beside the redacted turn view model, not inside `GameState`.
This keeps deterministic replay and state hashes independent from presentation.

## Accessibility and fallback

- Text and suit marks must remain readable without relying on the theme colors.
- Opponent-hand backs are decorative and must be hidden from assistive
  technology as individual cards; the public hand count remains the spoken
  value.
- Guests, bots, unequipped users, old payloads, and unrecognized identifiers use
  `default`.
- Reduced-motion behavior must not depend on a cosmetic.
