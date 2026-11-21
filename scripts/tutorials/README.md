# Phalanx Duel — Tutorial Series Production Harness

Deterministic Playwright recording + `media-pipeline` cue-bundle staging for the 6-season / 22-episode YouTube tutorial playlist (mixed **9:16 Shorts** and **16:9 Long-Form**).

## Commands

```bash
# List all 22 planned/scripted episodes and their 9:16 vs 16:9 formats
pnpm tutorial:list

# Validate manifest.json and all authored scenario/narration pairs
pnpm tutorial:validate

# Record an episode against the local dev stack (outputs raw.webm + footage.json + keyframes)
pnpm tutorial:record ep-01-welcome-and-objective

# Preview the media-pipeline cue bundle (dry-run)
pnpm tutorial:stage ep-01-welcome-and-objective --dry-run

# Stage rendered .mp4 + .vtt + thumbnail + YAML/JSON sidecars into Google Drive phalanx-duel/staged/
pnpm tutorial:stage ep-01-welcome-and-objective --stage
```

## Layout

- `manifest.json` — Master 22-episode catalog with aspect-ratio assignments (`9:16` Shorts vs `16:9` Long-Form) and default `media-pipeline` staged target.
- `schema.ts` — Shared Zod schemas for episode specs, cue steps, and format profiles.
- `scenarios/<ep-id>.json` — Deterministic seed, bot tier, cosmetics, and ordered Playwright cues.
- `narrations/<ep-id>.md` — Cue-tagged voiceover script compatible with `scripts/video/build-demo.mjs` and `media-pipeline`.
- `record-episode.ts` — Drives Playwright at the episode's target viewport and writes `artifacts/tutorials/<ep-id>/`.
- `stage-episode.ts` — Validates and atomically copies the 6-file `media-pipeline` bundle (`mp4`, `vtt`, thumbnail, `metadata.json`, `yml`, `manifest.json`) to `PHALANX_MEDIA_PIPELINE_STAGED_DIR` (defaults to `.../whoistechcmty/phalanx-duel/staged`).
