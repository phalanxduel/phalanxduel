# Browser Playthrough Stabilization Workflow

Use this sequence when the browser head-to-head runner progresses through
deployment or combat but does not reach game over.

1. **Baseline** — run a bounded PVP match with `--max-runtime-ms` and retain
   its `manifest.json`, `events.ndjson`, and `console-errors.log`.
2. **Instrument** — record phase, turn, active player, valid-action count, and
   selected control before each browser action.
3. **Classify** — distinguish transport/reconnect failures from an action that
   was accepted without a visible state transition.
4. **Fix forward** — repair the narrow client or runner transition contract;
   preserve server-authoritative state and spectator behavior.
5. **Prove completion** — require a successful low-LP browser manifest with a
   winner, game-over screenshot, and no unexpected console errors.
6. **Panoramic evidence** — render `qa:panoramic` from that fresh manifest.
7. **Regression gates** — run client tests, `qa:playthrough:verify`, visual
   regression, and finally `env -u DATABASE_URL pnpm verify:full`.

Expected guest `401 /api/auth/me` responses are informational and excluded
from the browser runner's error aggregate. Any other console error requires a
new diagnosis before the workflow can be marked complete.
