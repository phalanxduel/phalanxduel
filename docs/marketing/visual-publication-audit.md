---
title: "Phalanx Duel Visual Publication Audit"
description: "Inventory and publishing plan for screenshots, tutorial captures, demo videos, and presentation surfaces."
status: active
updated: "2026-09-05"
audience: maintainer, presenter, tutorial-author
related:
  - output/demo/README.md
  - scripts/video/README.md
  - scripts/video/demo-narration.md
  - scripts/video/architecture-narration.md
  - docs/talks/phalanx-duel-commercial-and-user-group.md
---

# Visual publication audit

This is the source-of-truth inventory for visual material that may be used in
the SCMC presentation, the local demo cockpit, `just3ws.localhost`, YouTube,
and player-facing tutorials. A capture is publishable only after it has been
checked against the current browser client, current rules, and current visual
language.

## Current inventory

| Surface | Location | Current role | Publication status |
| --- | --- | --- | --- |
| Narrated rules demo | `output/video/phalanx-duel-demo.mp4` / `.webm` / `.vtt` | Offline fallback and three-minute introduction | Keep as fallback; re-record after the current card visual pass |
| Micro tutorial: lobby | `client/public/tutorials/lobby_quickstart.webm` | First-visit orientation | Usable after a current-client visual check |
| Micro tutorial: deployment | `client/public/tutorials/deployment_basics.webm` | Formation setup | Usable after a current-client visual check |
| Micro tutorial: attack | `client/public/tutorials/attack_basics.webm` | Turn and attack basics | Usable after a current-client visual check |
| Micro tutorial: cascade | `client/public/tutorials/combat_cascade.webm` | Damage-resolution explanation | Usable; re-record for the lower-edge damage treatment |
| Tutorial leftovers | `client/public/tutorials/page@*.webm` | Browser-capture remnants | Do not publish until named, explained, and provenance-checked |
| Visual QA snapshots | `qa/visual-regression/tests/visual.spec.ts-snapshots/` | Regression evidence | Test-only; several captures predate the classical card language |
| Card back | `client/public/images/card-backs/dual-loop.webp` | Dual Loop cosmetic and presentation specimen | Strong current asset; preserve as the player-theme reference |
| System architecture | `docs/system/system-architecture.png` | Engineering reference | Update when the architecture diagram contract changes; not a marketing hero |
| SCMC deck | `output/slides/phalanx-duel-scmc-deck.html` | Live presentation | Updated with card-artifact language and tutorial links |
| Local demo cockpit | `https://phalanxduel.localhost/demo/` | Live rehearsal control surface | Use for recording setup, health, links, and observability context |
| Portfolio surface | `https://just3ws.localhost/` | Public professional context | Currently routes visitors through the Panoramic View / systems story; add a dedicated Phalanx Duel feature link in the site repo |

## What the audit says

The repository has enough material for a coherent publishing sequence, but it
does not yet have one canonical “current” recording set. The older visual QA
snapshots show the former high-contrast operational client, while the current
card direction adds classical glyphs, restrained maker marks, physical impact
damage, and cosmetic card backs. New public recordings should be made from the
current client after a clean local rehearsal.

The strongest visual assets today are:

- the Dual Loop card back, which already reads as a collectible player theme;
- the oversized Greek rank glyphs, which make card identity legible at a glance;
- the lower-edge damage treatment, which gives combat a physical direction;
- the existing short tutorial clips, which provide useful scene boundaries even
  where their styling needs a refresh.

The biggest gaps are:

- no current capture dedicated to spectator mode and deterministic rewatch;
- no current capture of the local cockpit, OpenObserve, Jaeger, or PVL report;
- no clean showcase of the card back / front-face cosmetic relationship;
- no named, indexed publication metadata for the two `page@*.webm` leftovers;
- no dedicated Phalanx Duel feature block on the `just3ws.localhost` portfolio
  surface in this repository.

## Recommended recording sequence

Record these in order, using stable seeds and a visible run identifier:

1. **Thirty-second hook** — form the line, choose a breach, show one lower-edge
   impact and the heartbeat bar.
2. **Ninety-second how-to-play** — lobby, deployment, one attack, cascade,
   reinforcement, and win condition.
3. **Three-minute rules demo** — rebuild `demo-narration.md` footage from the
   current client; keep the existing MP4 as the cold fallback until replaced.
4. **Two-minute system companion** — record the browser, server evidence,
   cockpit, PVL report, OpenObserve, and Jaeger as one identity chain.
5. **Spectator and rewatch tutorial** — show safe observer projection, replay
   step navigation, state hashes, and the distinction between reconstruction
   and screen recording.
6. **Cosmetics short** — compare the front-face glyph treatment with the Dual
   Loop back and explain that themes change presentation, not authority.

## Publication rules

- Prefer MP4/H.264 with AAC for YouTube upload and WebM for in-app tutorials.
- Keep captions generated from the narration source; do not hand-edit a video
  without updating its source script.
- Use the same scenario identifier in the recording manifest, narration notes,
  PVL report, and observability links.
- Never publish secrets, internal host paths, database identifiers, or hidden
  card state. Spectator footage must remain observer-safe.
- Re-run the playability gate before recording a new gameplay sequence:
  `rtk pnpm qa:playthrough:verify`.
- Re-record rather than crop around a stale visual regression snapshot when the
  purpose is to represent the current game.

## Script starting points

- Rules/tutorial narration: `scripts/video/demo-narration.md`
- System-purpose narration: `scripts/video/architecture-narration.md`
- Assembly workflow: `scripts/video/README.md`
- Talk framing and claims: `docs/talks/phalanx-duel-commercial-and-user-group.md`
- Rehearsal links and cockpit: `output/demo/README.md`
