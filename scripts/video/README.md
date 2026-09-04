# Narrated demo video pipeline

Builds `output/video/phalanx-duel-demo.{mp4,webm,vtt}` — a ~2 to 3 minute
shareable walkthrough of Phalanx Duel with a "Zoe (Premium)" voiceover.

Two stages:

| Stage | Script | Input | Output |
| --- | --- | --- | --- |
| Record footage | `record-demo.mjs` | live client, or a playthrough screenshot dir | `build/demo-raw.webm` + `build/footage.json` |
| Assemble | `build-demo.mjs` | `demo-narration.md` + `build/footage.json` | `output/video/phalanx-duel-demo.*` |

The voiceover script and the title-card text live in **`demo-narration.md`**.
That is the only file to edit for wording changes. It is authored to the
just3ws voice guide and the read-aloud rules (short sentences, one idea each,
everything spelled out, no symbols, no tables), and carries a `pronunciation`
map applied to the speech track before synthesis.

## Requirements

- `ffmpeg`, `ffprobe`, `gs` (Ghostscript) on `PATH`
- `@playwright/test` with Chromium (already a dev dependency) — renders title cards
- macOS `say` with the **Zoe (Premium)** voice installed:
  System Settings → Accessibility → Spoken Content → System Voice → Manage
  Voices → English (US) → Zoe (Premium)

## Run it

### Offline (no dev stack) — footage from an existing playthrough

```bash
node scripts/video/record-demo.mjs --from-screenshots \
  artifacts/playthrough-scmc-rehearsal/2026-09-03T22-24-33-561Z_20260909_classic_lp3
node scripts/video/build-demo.mjs
```

`record-demo.mjs` turns the phase-labelled PNGs (`t<turn>_<phase>_<seq>_...png`,
the layout `bin/qa/api-playthrough.ts` writes) into a slideshow with phase spans.

### Live — record the client actually playing

Bring the dev stack up first (`pnpm dev:server` + `pnpm dev:client`, or point
`--base-url` at a running client), then:

```bash
node scripts/video/record-demo.mjs --starting-lp 8
node scripts/video/build-demo.mjs
```

`build-demo.mjs` does not care which mode produced `build/footage.json`.

## How assembly works

For each cue in `demo-narration.md`:

1. `say -v "Zoe (Premium)"` synthesizes the narration; `ffprobe` measures it.
2. A title card is rendered from the cue's `kicker` / `title` fields (headless
   Chromium, brand palette).
3. The cue's `scene` selects a slice of the footage (`deployment`, `turn`,
   `attack`, `reinforce`, `winning`), a still (`suits` uses the quickstart's
   combat page), or nothing (`title` / `outro` hold the card).
4. Segment = card for 1.9 s, then footage held long enough for the narration.
   Footage shorter than the narration freezes its last frame.

Segments are concatenated, then transcoded to MP4 (H.264/AAC, `+faststart`)
and WebM (VP9/Opus). Captions come straight from the cue text.
