# Local Reference Playthrough Runbook

Use this runbook when a user wants a complete local game played through with
winner, score, and screenshots. This is the v1/reference browser lane.

## Preflight

1. Confirm the worktree state:

   ```bash
   rtk git status --short
   ```

2. Confirm local services are listening:

   ```bash
   rtk lsof -iTCP:5173 -sTCP:LISTEN -n -P
   rtk lsof -iTCP:3001 -sTCP:LISTEN -n -P
   ```

3. If either service is missing, start the host-native dev loop:

   ```bash
   rtk pnpm dev:server
   rtk pnpm dev:client
   ```

## Fast Complete Head-To-Head Run

Run a deterministic browser/reference PvP match:

```bash
rtk pnpm qa:playthrough -- --p1 human --p2 human --starting-lp 3 --screenshot-mode action --max-turns 120 --seed 20260615 --out-dir artifacts/playthrough-head2head
```

Expected behavior:

- player A creates a private match
- player B joins the match
- spectator page watches the match
- deployment and combat actions are issued automatically
- `manifest.json`, `events.ndjson`, and screenshots are written under the run
  directory

## Artifact Extraction

Find the newest manifest:

```bash
rtk find artifacts/playthrough-head2head -maxdepth 2 -name manifest.json | sort | tail -1
```

Read it and report these fields:

- `status`
- `winnerName`
- `lifepointsText`
- `victorySummaryText`
- `seed`
- `turnCount`
- `actionCount`
- `screenshots`

Use the manifest's `screenshots` array to identify key local file paths. Prefer:

- the first `start` screenshot
- the first `combat` screenshot
- the `game-over` screenshot

## Known Failure Modes

- A 401 for `/api/auth/me` is normal for guest playthroughs.
- Browser `navigator.vibrate` warnings are not gameplay failures.
- `TERMINAL_READY` is stale UI text. The runner should wait for current lobby
  readiness, such as `.lobby-status-card--ready`.
- LP 20 can automate for many actions and still hit a turn cap. Use LP 3 for
  fast proof, then investigate full-length pacing separately.
- Blank screenshots usually mean the app did not mount; inspect
  `console-errors.log`, `events.ndjson`, and `manifest.json` before rerunning.

## Browser Reference Notes

Use this artifact as evidence that the v1/reference browser lane can be driven
from lobby to game-over and produce winner, score, event, and screenshot
evidence. It does not validate alternate clients or inactive migration work.
