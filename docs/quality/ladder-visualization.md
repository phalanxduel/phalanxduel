# Ladder Simulation Visualization

This document tracks the current visualization capability, flags, and the
requirements for the richer local-web-UI end-state.

## Current state

Each `pnpm qa:ladder:simulate` run appends flat rows to
`docs/quality/ladder-history.jsonl` and regenerates:

- `docs/quality/ladder-history.json` — JSON array for Vega-Lite
- `docs/quality/ladder-history.md` — Markdown table (newest-first)
- `docs/quality/ladder-vega-spec.json` — static starter spec

### Viewing results

```sh
# Generate a fresh chart and open it in the default browser
pnpm qa:ladder:view

# Simulate, append to history, then open the chart in one step
pnpm qa:ladder:simulate -- --view

# Shadow K-factor comparison, then view
pnpm qa:ladder:simulate -- --shadow-k-factors 16,32,48 --view
```

The generated HTML (`artifacts/ladder/history-view.html`) is self-contained
with inline data and a Vega-Lite CDN. The "Edit in Vega Editor" action in the
chart toolbar opens the current spec + data in the online editor for further
exploration.

### All current flags (ladder-season.ts)

| Flag | Default | Effect |
| --- | --- | --- |
| `--seed NUMBER` | `20260521` | Deterministic RNG seed |
| `--players NUMBER` | `24` | Synthetic player count (min 4) |
| `--matches NUMBER` | `240` | Season match count |
| `--top-n NUMBER` | top decile | Top-N overlap window (min 3) |
| `--shadow-k-factors LIST` | none | Comma-separated K-factors for policy comparison |
| `--out-dir PATH` | `artifacts/ladder` | Artifact directory for JSON/MD report |
| `--report-name NAME` | `ladder-season` | Report file basename |
| `--history-dir PATH` | `docs/quality` | Directory for JSONL/MD/JSON history |
| `--history-name NAME` | `ladder-history` | History file basename |
| `--no-history` | false | Skip appending to history log |
| `--view` | false | Open chart in browser after writing history |
| `--verify` | false | Fail if metrics are below thresholds (no history write) |
| `--min-correlation NUMBER` | `0.72` | Spearman threshold for `--verify` |
| `--min-top-n-overlap NUMBER` | `0.5` | Top-N overlap threshold for `--verify` |

### All current flags (ladder-view.ts)

| Flag | Default | Effect |
| --- | --- | --- |
| `--history-json PATH` | `docs/quality/ladder-history.json` | Source JSON array |
| `--out-dir PATH` | `artifacts/ladder` | Output directory for HTML |
| `--view-file NAME` | `history-view.html` | HTML filename |

---

## Richer end-state: local web UI

The goal is a local web UI where you can set parameters via form inputs,
watch simulation output stream in real time, and see the chart update
automatically on completion — without switching to the terminal.

### User flow

1. Open `http://localhost:<port>` in a browser
2. Adjust parameters (seed, players, matches, shadow K-factors, etc.)
3. Click **Run simulation**
4. Watch stdout stream into a log panel as the simulation runs
5. Chart refreshes automatically when the run completes
6. History panel shows all past runs; click any row to highlight it on the chart

### Form inputs (maps to current CLI flags)

| Form field | CLI flag | Input type |
| --- | --- | --- |
| Seed | `--seed` | number |
| Players | `--players` | number (min 4) |
| Matches | `--matches` | number (min 1) |
| Top-N window | `--top-n` | number (min 3) |
| Shadow K-factors | `--shadow-k-factors` | text (comma-separated) |

Flags that are configuration rather than parameters (`--history-dir`,
`--history-name`, `--out-dir`, `--report-name`) stay as server config, not
form fields.

### Implementation path

A small Express server plus a single-page frontend (vanilla JS or minimal
React):

- `GET /` — serves the UI HTML
- `POST /api/simulate` — accepts form params as JSON, spawns
  `tsx bin/qa/ladder-season.ts` with derived CLI flags, streams stdout via
  Server-Sent Events (SSE), closes the stream on process exit
- `GET /api/history` — reads `ladder-history.json` and returns the JSON array
- Frontend subscribes to the SSE stream, appends lines to a log panel, then
  calls `/api/history` and re-renders the Vega-Lite chart on the `[done]`
  event

New script: `qa:ladder:serve` — starts the dev server and opens the browser.

### What does not change

All CLI flags and the JSONL/JSON/MD history format are preserved. The server is
a thin shell around the existing CLI. Simulations triggered from the UI write to
the same `ladder-history.jsonl` as CLI runs.
