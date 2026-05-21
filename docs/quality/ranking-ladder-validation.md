# Ranking and Ladder Validation

Ranked play is a trust surface, not just a score display. A ladder is acceptable
only when it can show repeatable evidence that it ranks skill, remains stable
under noise, handles season and placement boundaries, and resists obvious
manipulation.

Use this document when changing:

- `server/src/ratings.ts`
- `server/src/ladder.ts`
- `server/src/routes/ladder.ts`
- matchmaking/rating eligibility logic
- ranked match result persistence
- leaderboard filtering, rank visibility, placement, decay, or season rules

## Validation Contract

Before changing formulas or thresholds, define the ranking intent in the task or
design note. The implementation must state what the ladder rewards and what it
deliberately does not reward.

Required decisions:

- whether rating movement rewards win rate only or strength-adjusted wins
- how activity, inactivity, recency, streaks, and consistency affect standing
- how quickly new players should converge from provisional placement
- whether excitement or exploit resistance wins when those goals conflict
- which match classes affect official standing: ranked PvP, casual, bot,
  tournament, QA, automated, forfeits, abandoned games, or disputed games
- how season resets, carryover, decay, and archival records work

Do not tune the ladder by subjective inspection alone. If the intended behavior
is not written down, every formula can look plausible while optimizing the wrong
thing.

## Evidence Layers

### Rating Math

The rating core needs deterministic unit and property coverage. At minimum,
tests should prove:

- expected rating deltas for representative equal, favored, and underdog wins
- bounded movement for extreme rating gaps
- idempotent match-result application
- deterministic ordering for equal ratings and equal tie-breakers
- non-ranked, bot, QA, and automated matches are excluded unless explicitly
  included by the ranked policy
- forfeits, abandons, draws, and cancellations map to the documented result
  semantics
- season boundaries preserve only the documented carryover state

Property tests should cover invariants such as:

- the winner does not lose official rating in a normal ranked match
- the loser does not gain official rating in a normal ranked match
- stronger opponents produce larger rewards than weaker opponents
- rating deltas stay within configured bounds
- replaying the same completed match does not double-apply rating changes
- excluded matches do not affect rating, rank, placement, or leaderboard order

### Synthetic Ladder Simulation

Run seeded offline simulations before trusting a ladder formula. The simulator
should generate populations with known latent skill and noisy match outcomes.

The simulation set should include:

- new players with provisional ratings
- established players across skill tiers
- inactive players
- high-variance players
- smurfs and rapidly improving players
- repeated rematches
- sparse matchmaking pools
- lopsided matchups
- upset-heavy seasons
- bots with known strength
- colluding accounts and farm accounts

Measure:

- rank-to-skill correlation
- games required to reach placement confidence
- rating deviation or confidence convergence
- rank volatility after N matches
- promotion and demotion churn
- top-N stability
- impact of upsets and streaks
- recovery time after lucky or unlucky runs
- match quality by rating gap
- exploit gain from farming weak, new, inactive, or colluding accounts

The output should be a report, not just a pass/fail. A useful result says, for
example, how many games it takes a true top-decile player to reach top-decile
rank and how much standing an exploit scenario can extract.

The first reproducible exercise is:

```bash
rtk pnpm qa:ladder:simulate
```

This runs `bin/qa/ladder-season.ts`, an offline deterministic season that
generates synthetic players, plays fixed-seed matches, applies the same Elo
constants as the server rating code, and writes JSON plus Markdown reports under
`artifacts/ladder/`. Use it to inspect baseline ranking depth before changing
rating policy.

For a lightweight pass/fail check, run:

```bash
rtk pnpm qa:ladder:verify
```

The verification mode currently gates only broad sanity metrics such as
rating-to-skill rank correlation and top-N overlap. Keep this out of quick CI
until the runtime, stability profile, and thresholds have been reviewed across
several seeds.

To compare candidate rating policy parameters against the same synthetic season,
use shadow K-factor replay:

```bash
rtk pnpm qa:ladder:simulate -- --shadow-k-factors 16,32,48
```

The report adds a shadow comparison table with each policy's metrics and top-N
membership. Treat this as tuning evidence only; it does not change production
rating behavior.

### Shadow Replay

Before replacing or retuning live ladder behavior, replay historical or
QA-generated match histories through the candidate ranking engine without
changing user-visible state.

Compare at least:

- current production rules
- proposed rules
- conservative and aggressive tuning variants

Review:

- rank deltas for known players
- changes in top-N membership
- effect on provisional players
- effect on inactive players
- effect on high-volume players
- excluded match handling
- outliers where candidate rank differs sharply from the current ladder

Shadow results should include enough input detail to explain why a player moved.

### End-to-End Product Behavior

Route, API, and UI tests should cover the visible ladder contract:

- first ranked match creates rating or placement state
- player becomes visible only after the required eligibility threshold
- leaderboard ordering is deterministic
- player profile and leaderboard agree on rank/rating state
- ties resolve consistently
- banned, deleted, test, automated, or ineligible users are excluded
- season rollover updates current and historical views correctly
- stale snapshots refresh according to documented rules
- API responses do not leak private audit fields

## Abuse Cases

Every official ladder change needs an abuse review. Simulate or reason through:

- win trading
- farming new accounts
- farming bot or automated matches
- disconnect and inactivity abuse
- queue dodging
- intentional deranking
- repeated rematch loops
- multi-account feeding
- collusion inside small matchmaking pools
- exploiting provisional placement
- manipulating season rollover timing

For each case, define the expected behavior: prevention, dampening, detection,
operator review, or explicit acceptance of residual risk.

## Operator Auditability

Operators need to explain ranking movement. A ladder implementation should expose
or be able to reconstruct:

- match id and completion time
- ranked eligibility decision
- result and result source
- player rating before and after
- opponent rating before and after
- placement or confidence state before and after
- applied modifiers, caps, decay, or season carryover
- exclusion reason for matches that did not count
- version of the ranking policy used

If a rank change cannot be explained from persisted evidence, the ladder is not
ready for official status.

## Verification Gate

Use the lowest gate that covers the change during development, then run the full
gate before declaring ranking work complete.

Recommended checks:

- rating math unit tests
- rating property tests
- server route tests for ladder and profile surfaces
- DB tests for match-result idempotency and eligibility persistence
- synthetic ladder simulation report
- shadow replay report for formula or policy changes
- `rtk pnpm verify:quick`
- `rtk pnpm check` or `rtk bin/dock pnpm verify:full` before merging or
  handing off official-ranked changes

Do not ship a ladder formula change with only route/UI coverage. Ranking depth is
validated by model behavior over many matches, not by whether the leaderboard
renders.
