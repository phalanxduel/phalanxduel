# Ladder Simulation: Usage Guide and Interpretation

This guide explains how to run the ladder simulation, what each metric
measures, and how to turn the output into actionable insight about the
rating system.

## Quick start

```sh
# Run a simulation and open the chart
pnpm qa:ladder:simulate -- --view

# Start the web UI (form inputs + live stream + auto-refresh chart)
pnpm qa:ladder:serve

# Compare current K-factor against alternatives
pnpm qa:ladder:simulate -- --shadow-k-factors 16,32,48 --view

# Verify the baseline hasn't regressed
pnpm qa:ladder:verify
```

---

## How the simulation works

The simulation is a closed, offline model. It does not touch the product
database. The lifecycle for every run is:

### 1. Population generation

`--players` synthetic players are created. Each player is assigned a
**latent skill** — a hidden true ability number drawn from a
normally-distributed pool centred on 1000 with standard deviation ≈ 180.
The distribution is produced by summing six uniform random samples
(central limit theorem), so most players cluster near the middle and
elite or poor players are rare, mirroring a real player population.

Every player starts with an Elo rating of 1000 regardless of latent
skill. The simulation then measures how quickly and accurately the rating
system discovers the true order.

### 2. Match scheduling

`--matches` pairs are drawn uniformly at random from the population. There
is no matchmaking — any player can face any other. This is intentionally
pessimistic: a real matchmaker would pair by similar rating, which
improves convergence. Random pairing is a stress test.

### 3. Outcome determination

The winner of each match is decided by comparing the two players'
**latent skills** using the Elo win-probability formula:

```text
P(A beats B) = 1 / (1 + 10^((skillB - skillA) / 400))
```

This mirrors the rating update formula. A 400-point skill advantage
corresponds to a ~91% win rate. A small draw chance (4%) is applied
first, independent of skill. The result is noisy but skill-correlated —
a weaker player can win individual games but loses the aggregate.

### 4. Rating updates

After each match, both players' Elo ratings update using the standard
formula:

```text
newRating = oldRating + K × (score − expected)
```

`score` is 1 for a win, 0.5 for a draw, 0 for a loss. `expected` is the
win probability predicted by the current ratings. `K` is the K-factor
(default 32). The rating moves proportionally to how surprising the
result was: beating a much stronger player earns more points than beating
a weaker one.

---

## Metrics explained

### `ratingSkillSpearman` — primary quality signal

The Spearman rank correlation between final Elo ratings and latent skill,
computed over all players. Range: −1 to 1.

| Value | Meaning |
| ---: | --- |
| 1.0 | Elo rank perfectly mirrors true skill rank |
| 0.88 | Strong — top players are reliably identified |
| 0.72 | Threshold — minimum acceptable for the verify gate |
| < 0.72 | Ladder is unreliable; rating does not track skill |
| 0.0 | Random — rating is uncorrelated with skill |

Spearman is used instead of Pearson because rank order matters for a
ladder, not the exact size of rating gaps. A player ranked 3rd by rating
who is 2nd by skill is a smaller error than one ranked 3rd who is 12th by
skill.

The baseline value with seed 20260521 and default settings is 0.8783.

### `topNOverlap` — precision at the top

The fraction of the N highest-skilled players who appear in the top-N by
rating. Default N is the top decile (e.g. 3 of 24 players).

This answers a different question than Spearman: even if overall rank
correlation is high, a poor top-N overlap means elite players are being
buried — the most visible and trust-sensitive failure mode for a
competitive ladder.

| Value | Meaning |
| ---: | --- |
| 1.0 | All truly skilled players are at the top |
| 0.67 | 2 of 3 top-skilled players are in top-3 by rating |
| 0.5 | Minimum acceptable (verify gate default) |

Spearman and topNOverlap often move together but can diverge. A system
could rank the middle players well (high Spearman) while consistently
misranking the top tier (low overlap).

### `averageRecentVolatility` — convergence indicator

The average point swing across each player's last several games. High
volatility means ratings are still moving quickly — the season is too
short for ratings to settle. Low volatility means the ladder has
converged and further games produce little movement.

Use this to calibrate `--matches`. If volatility is still high at the end
of your season length, ratings have not converged and Spearman is
understating what a longer season would produce.

### `largestRatingGain` and `largestRatingLoss`

The most extreme single-season rating movements. High values indicate
either a strong upward/downward streak or that K is too large for the
number of games played. A player who went 18–3 in 21 games deserves a
large gain; a player who swung 200 points in 8 games is being
over-corrected.

### K-factor

K controls the speed and magnitude of every rating update. The default
is 32 (standard active-player chess Elo).

| K | Effect |
| ---: | --- |
| 16 | Slow convergence, resistant to streaks, suits sparse activity |
| 32 | Default — balanced for moderate game counts |
| 48 | Fast convergence, amplifies hot/cold streaks |

Lower K is not always better. With few games per player, a low K means
ratings barely move from 1000, so the ladder never separates anyone.
Shadow comparison (`--shadow-k-factors`) lets you see all three on the
same corpus.

---

## Reading the shadow comparison

`--shadow-k-factors 16,32,48` re-runs the identical season three times,
each with a different K, and appends one row per policy to the history.
The chart shows all lines together.

Typical pattern:

```text
k=16  spearman: 0.8435   ← slower to converge; weaker signal
k=32  spearman: 0.8783   ← production (default)
k=48  spearman: 0.8800   ← slightly better here, but check volatility
```

When k=48 edges out k=32 on Spearman, also check `largestRatingGain`
and `averageRecentVolatility` in the JSON report. A marginally better
Spearman with much higher volatility is usually not worth the choppier
player experience.

---

## Deriving insights

### Is the K-factor calibrated correctly?

Run shadow comparison over a range. If k=16 is within noise of k=32, the
default is probably fine for the current game count. If k=48 consistently
outperforms k=32 by more than 0.02 Spearman, the default K may be too
conservative for the season length in use.

### How many matches does the season need?

Fix seed and players, vary `--matches` across a range (60, 120, 240,
480), and plot Spearman against match count. The inflection point where
Spearman stops meaningfully improving is the minimum viable season
length. Below that point, ratings have not had enough information to
converge.

```sh
for m in 60 120 240 480; do
  pnpm qa:ladder:simulate -- --matches $m --seed 20260521 --no-history
done
```

### Is a rating-system change an improvement?

Run the simulation before and after the change with the same seed. The
seed fixes the population and match schedule, so any Spearman difference
is caused by the rating logic change, not random variation. Shadow
comparison does this automatically for K-factor changes; for deeper
changes (formula, decay, placement) run separate baseline/candidate runs.

### Why did the verify gate just fail?

The gate runs with `seed=20260521` (the baseline seed). A failure means
the default season exercise now produces a Spearman below 0.72. Causes:

- A change to `elo.ts` altered rating math
- A change to `ladder-simulation.ts` altered outcome generation or
  reporting
- A change to `ELO_CONSTANTS` (K or baseline) in `elo.ts`

Run `pnpm qa:ladder:simulate` with no flags to reproduce the failing
metrics, then inspect the JSON artifact and match log.

---

## History and the chart

Every `pnpm qa:ladder:simulate` run appends one row per policy to
`docs/quality/ladder-history.jsonl`. The chart at
`artifacts/ladder/history-view.html` (opened by `--view`) plots Spearman
over time, coloured by policy label.

**What to look for in the chart:**

- A flat `production` line across commits is healthy — the rating system
  is stable.
- A sudden drop in `production` Spearman after a commit identifies the
  breaking change.
- Shadow lines converging toward the production line over time means the
  rating system is becoming robust across K-factors.
- Shadow lines diverging means different K-factors are producing
  meaningfully different outcomes — worth investigating.

---

## Limitations

The simulation is a model, not the product. Key differences:

- **No matchmaking** — real players pair by similar rating; random pairing
  is harder on convergence.
- **No activity variance** — every player plays approximately the same
  number of games; real ladders have very active and very inactive players.
- **Fixed skill** — latent skill is constant; real players improve or
  decline over time.
- **No placement logic** — provisional rating windows, placement matches,
  and placement bonuses are not modelled.
- **No manipulation** — sandbagging, boosting, and forfeit farming are not
  simulated.

These limitations make the simulation a lower-bound signal: if Spearman
is weak here, it will be weak in production too. But a strong Spearman
here does not guarantee the same in production under adversarial
conditions.

---

## Reading the web UI (`pnpm qa:ladder:serve`)

The server at `http://localhost:4321` has four panels that update
automatically after each run.

### Last run metrics (cards)

Four stat cards appear above the history chart as soon as results are
available — on page load if an artifact already exists, or immediately
after a run completes.

| Card | What it shows | Color coding |
| --- | --- | --- |
| Spearman | Rating-to-skill rank correlation | Green ≥ 0.85, amber 0.72–0.85, red &lt; 0.72 |
| Top-N overlap | Fraction of top-N skilled players in top-N by rating | Green ≥ 0.8, amber 0.5–0.8, red &lt; 0.5 |
| Avg volatility | Mean recent rating swing — convergence indicator | No color (contextual) |
| Largest swing | Peak gain and peak loss this season | No color (contextual) |

### History chart

Spearman over time, one point per run, coloured by policy label.
Hover a point for commit SHA, seed, K-factor, and exact metrics.
The `···` menu opens "Edit in Vega Editor" for spec exploration.

### Standings table

Top 12 players from the last artifact, ordered by rating. Columns:

| Column | Meaning |
| --- | --- |
| Rank | Position by Elo rating |
| Skill rank | True position by latent skill |
| Δ | Rank minus skill rank. ▼ = overranked, ▲ = underranked |
| Rating | Final Elo |
| Latent skill | Hidden true ability (not visible in production) |
| W-L-D | Wins, losses, draws this season |

Rows where \|Δ\| ≥ 3 are highlighted in amber — these are the ladder's
visible errors.

### Shadow policy comparison

Only appears when `--shadow-k-factors` was used. Compares each K-factor
on the same corpus. The row with the highest Spearman is bolded in
green. Check `Avg volatility` alongside Spearman: a marginally better
Spearman with significantly higher volatility usually is not worth the
choppier player experience.

### Metric reference (sidebar)

The collapsible **Metric reference** panel in the left sidebar contains
threshold tables and explanations for every metric. Expand it before
interpreting an unfamiliar result.
