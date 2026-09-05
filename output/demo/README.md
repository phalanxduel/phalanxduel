# SCMC Talk — Demo Directory & Rehearsal Script

**Phalanx Duel: An Analog Game, Ported to Digital with AI-Assisted Development**
Software Craftsmanship McHenry County · September 9, 2026

This is the one file to read top to bottom before a rehearsal or the real
thing. Everything it points to already exists in this repo — nothing here
needs to be built the day of.

## What you're bringing

| # | Item | Path | Notes |
| - | ---- | ---- | ----- |
| 1 | Slide deck | `output/slides/phalanx-duel-scmc-deck.html` | Open in a browser. Scroll, or the ↑↓ buttons bottom-right. Print-to-PDF for a backup export (one slide per page). |
| 2 | Printed quickstart | `output/pdf/phalanx-duel-face-to-face-quickstart.pdf` | Two-sided handout. Print one per pair, plus spares. |
| 3 | Standard decks of cards | *(physical, not in repo)* | One per pair, plus extras — you already told the organizers you'd bring spares. |
| 4 | Live software demo | `https://play.phalanxduel.localhost` | Requires `bin/demo up` running (see Pre-flight). |
| 5 | Fallback demo video | `output/video/phalanx-duel-demo.mp4` | Narrated, ~3 min. Play this if the live demo breaks. |
| 6 | Source references (for the room to see, not memorize) | `docs/gameplay/rules.md`, `shared/src/schema.ts`, `engine/src/combat.ts` | Already cited on-slide (Code · 04). Have the repo open in an editor tab if you want to actually scroll to them live. |

## Pre-flight (do this before people arrive)

Run in order, from the repo root:

```bash
bin/demo up                    # starts server + client + admin, opens quicklinks
```

Wait for the green "READY" line. The command prints and opens a local
quicklinks page with the play URL, admin console, health and API links, process
IDs, logs, source paths, and rehearsal tips. If it
times out, run `bin/demo status` to see which of app/client isn't up, then
`bin/demo logs`.

The admin UI is at `https://admin.phalanxduel.localhost/` when the local nginx
vhost is installed. Its local API is on port `3102` and its Vite UI is on port
`3103`. The game server remains on port `3001`, and the client remains on
Vite's port `5173`.

Then, in your browser, open **two tabs** ahead of time and leave them ready:

1. `output/slides/phalanx-duel-scmc-deck.html` (double-click the file, or drag
   it into a tab) — this is the deck.
2. `https://play.phalanxduel.localhost` — this is the live game. Load it once
   now so fonts/assets are warm; don't start a match yet.

Checklist:

- [ ] `bin/demo up` printed READY for app, client, and admin
- [ ] `https://play.phalanxduel.localhost` loads and shows the Welcome dialog
- [ ] Deck tab open, scrolled to slide 1
- [ ] Printed quickstarts counted out (one per pair + spares)
- [ ] Standard decks counted out (one per pair + spares)
- [ ] `output/video/phalanx-duel-demo.mp4` opens and plays, as a cold backup
- [ ] Phone/watch or a visible clock for pacing

If anything in that list fails, fix it now — not mid-talk. `bin/demo down`
then `bin/demo up` again is the reset if the stack gets into a weird state.

## Run of show

A ~30 minute pacing grid (matches the repo's own "30-minute craftsmanship
deck" framing). Rescale proportionally if your actual slot is longer or
shorter — the beats and their order don't change, only the minutes per beat.

| Time | Slide | Beat | What happens |
| ---- | ----- | ---- | ------------ |
| 0:00 | 1 — Cover | Welcome | Introduce yourself. State the promise: learn it, play it, then see it run as code. |
| 0:30 | 2 — Origin | Learn 01 | Tell the Camp Tesomas story. This is the hook — take your time here, it's the one slide that's pure narrative. |
| 3:30 | 3 — Setup | Learn 02 | Two decks, four columns, 20 LP. Point at the mirrored-column diagram; it's the one rule people get backwards. |
| 4:30 | 4 — A turn | Learn 03 | Choose → Resolve → Rebuild → Switch. |
| 5:30 | 5 — Resolve an attack | Learn 04 | Walk the worked example beat by beat — it's the same math the engine runs, say so. |
| 7:00 | 6 — The four suits | Learn 05 | Shields (red) vs. weapons (blue). Don't over-explain; this is reference material, not a quiz. |
| 8:30 | 7 — Reinforce & win | Learn 06 | Close the rules teach with the win condition. |
| 9:30 | 8 — Now play a hand | **Play** | Hand out decks and quickstarts. Set a visible timer for ~10 minutes. Circulate; the printed quickstart is the source of truth if a rule is disputed, not your memory. |
| 19:30 | 9 — The port | Code 01 | Palette flips here on purpose — say so, it's the same beat the deck itself performs. Walk the notebook → Ruby → TypeScript → now timeline. |
| 21:30 | 10 — Architecture | Code 02 | "The client proposes, the server decides." One sentence on why: no gameplay logic ships in client code. |
| 23:30 | 11 — Turn lifecycle | Code 03 | The 8 phases, straight from `shared/src/schema.ts`. This is the bridge into the live demo. |
| 25:00 | *(switch tabs)* | **Live demo** | Alt-tab to `play.phalanxduel.localhost`. Play one attack. Narrate it against the phase names and the worked example from slide 5 — same math, same order. Budget ~3 min. **If it breaks:** stop, say so plainly, play `output/video/phalanx-duel-demo.mp4` instead, keep talking over it. |
| 28:00 | 12 — Try it yourself | Code 04 | The real commands and file paths. This is the slide this audience came for — slow down here. |
| 29:00 | 13 — Why determinism | Code 05 | The thesis line: what you verified by hand is what the server verifies every turn. |
| 29:30 | 14 — Links & bio | Close | Play URL, canonical rules, source, this talk's page. Thanks, open for questions. |

## If something breaks

- **Live demo won't load / server died:** `bin/demo status`, then `bin/demo
  logs` in a spare terminal if you have one; otherwise skip straight to the
  fallback video (item 5 above) and keep narrating over it. Don't debug live.
- **A rule gets disputed during Play:** the printed quickstart
  (`output/pdf/phalanx-duel-face-to-face-quickstart.pdf`) is the source of
  truth at the table, not memory. Say so, hand them a copy, keep circulating.
- **Deck won't open:** it's a single static HTML file with no build step —
  any browser opens it directly from disk. If the primary machine is
  unavailable, email/AirDrop `output/slides/phalanx-duel-scmc-deck.html` to
  any laptop.
- **Running behind:** cut from the Live Demo beat first (it's the most
  replaceable — the worked example on slide 5 already proves the math by
  hand), not from Play. Play is the promise you made in the abstract.

## After

```bash
bin/demo down
```

Share the deck's own closing links: `phalanxduel.com`,
`phalanxduel.com/learn/rules`, `github.com/phalanxduel/phalanxduel`,
`just3ws.com/phalanx-duel`.
