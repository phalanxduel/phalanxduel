# Swarm Testing Strategies

This document outlines the tactical automation and concurrency strategies used to verify Phalanx Duel's system stability, ladder analytics, and deployment readiness.

## 1. Headless Engine Swarm (`simulate-headless.ts`)

The headless swarm is the fastest way to simulate thousands of games. It bypasses the browser entirely when both players are bots, running the game engine directly against the server's state machine.

### Key Use Cases
- **Balance Analysis**: Running 10,000+ games to verify win/loss ratios across different bot personas.
- **Ladder Seeding**: Quickly generating thousands of match results to test Glicko-2 convergence.
- **Regression Testing**: Verifying that engine-side changes don't break deterministic state transitions.

### Common Commands
```bash
# Run a batch of 10 bot-vs-bot games in staging
rtk pnpm qa:swarm:staging

# Custom headless swarm with heuristic bots and high turn limit
rtk tsx bin/qa/simulate-headless.ts --base-url https://phalanxduel-staging.fly.dev --p1 bot-heuristic --p2 bot-heuristic --batch 50 --max-turns 200
```

---

## 2. Authenticated UI Swarm (`simulate-ui.ts`)

The UI swarm uses Playwright to drive real browser instances. This is the "gold standard" for verification because it tests the full vertical stack: UI -> WebSocket -> Server -> Database.

### Key Use Cases
- **Auth Flow Verification**: Ensuring that bot accounts can register, login, and persist sessions.
- **Ranked Analytics**: Generating ladder stats for *authenticated* users (required for the official ladder).
- **Concurrency Stress**: Testing how the server handles multiple simultaneous WebSocket connections and database transactions.

### Scenarios
- `guest-pvp`: Two unauthenticated humans (guest mode).
- `auth-pvp`: Two authenticated users.
- `guest-pvb`: Unauthenticated human vs. server-side bot.
- `auth-pvb`: **Recommended for Ladder Stats**. Authenticated user vs. server-side bot.

### Common Commands
```bash
# Run an authenticated Player-vs-Bot swarm in staging
# This will register/login bots and play against the heuristic engine
rtk tsx bin/qa/simulate-ui.ts \
  --base-url https://phalanxduel-staging.fly.dev \
  --scenario auth-pvb \
  --swarm \
  --wave-count 3 \
  --cohort-size 5 \
  --cohort-growth fixed
```

---

## 3. Wave & Cohort Management

The swarm tools support sophisticated population management to simulate organic growth or burst traffic.

- **Waves**: Sequential rounds of games.
- **Cohorts**: The number of concurrent games in a single wave.
- **Growth Patterns**:
  - `fixed`: Every wave has the same number of bots.
  - `fibonacci`: Each wave grows in size (1, 1, 2, 3, 5...), ideal for testing server-scaling limits.

---

## 4. Telemetry & Observability

All swarm runs are instrumented with OpenTelemetry.

- **Local Tracing**: Runs report to the local collector at `http://127.0.0.1:4318`.
- **Staging Tracing**: Telemetry is correlated between the CLI runner and the staging server spans using the `x-qa-run-id` header.
- **Metrics**: Look for `actions_total` and `matches_active` in Grafana to see the swarm's impact in real-time.

---

## 5. Glicko-2 & Ladder Seeding

The Phalanx Duel ladder uses the Glicko-2 rating system. To ensure meaningful rankings, the system requires a "burn-in" period of matches to establish rating confidence (volatility/deviation).

### Seeding Strategy
1.  **Phase 1: Headless Saturation**: Run 1,000+ bot-vs-bot games using `simulate-headless.ts` to populate the ledger.
2.  **Phase 2: Identity Correlation**: Run `simulate-ui.ts` with `--scenario auth-pvb` to correlate match history with authenticated bot operatives.
3.  **Phase 3: Human Baseline**: Open the staging environment to trusted human testers to establish the top-tier rating ceiling.

### Verification
Use the `rtk pnpm qa:swarm:stats` command to check Glicko convergence metrics in the staging logs. Look for `rating_deviation < 50` as a signal of an established rating.

---

## 6. Troubleshooting & Common Pitfalls

### Cumulative Mode Turn Limits
Cumulative damage mode leads to longer, more strategic games. The default turn limit in headless mode may be too low.
**Pitfall**: Games failing with `max turns exceeded (140)`.
**Solution**: Increase the turn limit to at least 200:
```bash
rtk tsx bin/qa/simulate-headless.ts --max-turns 200
```

### Auth Mode Mismatch
If bots are failing to authenticate with 401 errors, it's likely they were previously marked as `registered: true` in your local `bot-identities.json` but do not exist in the target environment (e.g., after a database wipe in Staging).
**Solution**: Change the `--bot-email-prefix` to a new value to force a fresh registration wave.

### Deployment Phase Stalls
Phalanx Duel requires both players to fill their front row (and often back row depending on rules) before transitioning to the `AttackPhase`.
**Pitfall**: If an automation script only deploys one card and waits for a "PASS" button, it will hang.
**Solution**: Ensure the script fills all 8 battlefield slots (2 rows x 4 columns) to successfully trigger the phase transition.

### Dialog Blocking
Certain actions (like `PASS` or `FORFEIT`) trigger browser-native confirmation dialogs.
**Solution**: Ensure your Playwright script has a `page.on('dialog', ...)` handler to auto-accept these, or the browser will hang indefinitely.

---

## 7. Media & Gallery Automation

For consistent documentation and marketing, use the gallery capture tool.

```bash
# Capture key game states (Lobby, Deployment, Attack)
rtk pnpm qa:gallery
```

This script:
1. Launches a headless browser.
2. Walks through a full game against a bot.
3. Captures high-resolution screenshots at each phase transition.
4. Saves artifacts to `artifacts/gallery/`.

**Updating Site Assets**:
Once verified, copy the new screenshots to the public site:
```bash
cp artifacts/gallery/*.png ../site/assets/images/tutorial/
```
