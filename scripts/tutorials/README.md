# Record Phalanx Duel tutorials

The series uses a 1600×900 browser recording for every episode. Landscape edits keep the entire board at 1920×1080. Shorts use a 1080×1920 composition with a sharp crop of each lesson’s controls or board over a blurred copy of the desktop. The viewport stays wide during play.

## What went wrong in the first batch

The 22 original scripts contained no attack actions. Eight stayed in the lobby for the entire episode, and 13 launched a match and placed at most one card. The tournament player episode launched a bot instead of seating another player. The previous Combat Cascade video shows deployment rather than a resolved attack. The previous Go client video shows the browser lobby throughout.

The recorder opened Shorts at 430 pixels wide and used a generic “last button” dismissal that could open a rules modal. First-visit dialogs, in-match briefings, and splash screens also covered the board. Narration could continue while a placeholder cue simply held the same screen. Timestamps described raw capture time, so long setup and waits carried into the export or shifted its chapter boundaries.

## Capture and edit

1. Run the local playability gate. Use a loopback game server with the built browser client and the project’s development database wrapper. Finish rebuilds before recording. A reload or server restart can interrupt the WebSocket session.
2. Rehearse the lesson in the browser. Write each cue around an observable action and an expected result. Matching cue IDs in the scenario JSON and narration Markdown bind the voiceover to that result.
3. Put off-camera preparation in `setup`. Use `actions` for interactions viewers should see, `expect` for evidence of the result, and `focus` for the control or board area the viewer needs. Use separate cues when the focus moves from a card to the engagement log. A visible selector must distinguish the intended result from something that was already present.
4. Record the cue, then build the episode. The recorder captures click indicators, keyframes, raw timing, and the coordinates of the focus region. It reports the failed cue and saves `failure.png` if an assertion fails. The build refuses a recorded cue without matching narration.
5. Review each exported MP4 at its intended size. Check the first frame, the key action, and the ending. Scrub around each cut, look for connection or loading messages, and confirm that the narration describes the action on screen. Verify the audio stream, caption alignment, and aspect ratio. A successful capture is only the starting point for this review.

```bash
rtk pnpm qa:playthrough:verify
rtk pnpm tutorial:validate
rtk pnpm tutorial:record ep-03-combat-cascade --base-url http://127.0.0.1:3001
rtk pnpm tutorial:build ep-03-combat-cascade
rtk pnpm tutorial:stage ep-03-combat-cascade --dry-run
```

The recorder needs Playwright Chromium and captures in dark mode (`colorScheme: 'dark'`), supporting both loopback (`127.0.0.1` / `localhost`) and local LAN tournament hosts (`*.lan.phalanxduel.com`, `*.phalanxduel.localhost`) with local TLS. External font/analytics hosts are aborted during capture so offline LAN recordings never stall on screenshot waits. The builder uses FFmpeg, FFprobe, and macOS `say`. Use `--voice` to select the macOS voice. For an isolated run, pair recorder `--output-dir` with builder `--capture-dir`. The local Admin Cockpit sign-in capture uses port 3103 on loopback or `https://admin.lan.phalanxduel.com/` on LAN hosts. The Go episode builds and drives the interactive Go CLI against the same server as the browser. Account recordings use disposable local accounts with `example.invalid` addresses.

## Outputs and Shorts review

- `artifacts/tutorials/<episode>/raw.webm` is the desktop master. `footage.json` maps cue IDs to source timings, keyframes, shot bounds, and per-cue DOM/engine telemetry (`colorScheme`, `matchId`, `phase`, `damageMode`, `actionCount`, `ruleIds`).
- `pnpm tutorial:stage --stage-all` writes all 22 episode bundles (`.mp4`, `.vtt`, `.txt` transcript, `.png` thumbnail, `.yml` YouTube sidecar, `.metadata.json`, `.manifest.json`) plus `playlist.md` and `playlist.yml` directly into `$HOME/ai/media-pipeline/just3ws-mike/phalanx-duel/staged`.

The portrait edit follows the local media-pipeline [clip montage guide](https://github.com/just3ws/media-pipeline/blob/main/docs/clip-montages.md). Keep the full sharp foreground when a comparison needs the whole board. Zoom to the smallest region containing the input and resulting state when a control, lane, or equation is the lesson. Interactions across different screens start wide and cut in once the expected result appears. The blurred background preserves context and leaves room for captions and the YouTube UI. Use the edit JSON and VTT timestamps to pick excerpts for a montage. Review start, middle, and end frames at phone size before staging.

The recorded tournament episodes are local rehearsals. They cover the host probe, the sign-in surface, and seating a second player, with venue networking and bracket administration covered in the [tournament runbook](../../docs/ops/TOURNAMENT_RUNBOOK.md).

## Distribution

Only stage a reviewed export. Staging hands the video and its sidecars to the media-pipeline intake. After publication, add the YouTube ID in the site’s `_data/tutorials.yml` so the tutorial page can embed it. Keep video binaries in the media pipeline and captions in the site repository.
