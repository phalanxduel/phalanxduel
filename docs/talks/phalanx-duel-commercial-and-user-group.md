# Phalanx Duel — Software Craftsmanship McHenry County

## A small game as a laboratory for clear boundaries, feedback, and trust

Audience: software developers interested in design, refactoring, testing,
architecture, and sustainable delivery. The talk uses Phalanx Duel as a
working case study, not as a product launch or a claim of production
perfection. Claims in this document are limited to the current repository and
are intentionally distinguished from roadmap work.

### Learning goals

By the end, attendees should be able to:

- identify a useful seam between pure rules and side effects;
- turn a game rule into an executable contract and a focused test;
- distinguish deterministic behavior from deterministic evidence;
- recognize when observability and documentation are part of the design;
- discuss where this architecture creates tradeoffs instead of pretending it
  eliminates them.

## Project history: from game idea to evidence system

Use this as a 3–4 minute context-setting story near the start of the talk. The
dates below come from the repository changelog and commit history. They are
milestones in this checkout, not a claim that every older experiment remains
part of the supported product.

### 1. The rules became the center

The project began by making a small tactical game concrete: a 52-card
vocabulary, a two-row/four-column formation, suit-dependent combat, and a
server-authoritative match. The important architectural decision was to make
the rules engine independently testable instead of burying combat semantics in
the browser or persistence layer.

### 2. The site became the reference client

The public site evolved into the playable browser client at
`play.phalanxduel.com`: lobby, authenticated and guest flows, WebSocket-first
matches, recovery paths, spectator views, and player-facing help. The repo’s
`client/` package is the current reference UI. It is Preact/TypeScript, not
React, and it should be described as a projection and interaction layer over
the engine/server contract.

### 3. The wiki became a documentation system

There is no separate checked-in wiki application. `docs/README.md` is labeled
“Documentation Wiki” and serves as the navigation hub for the repository’s
canonical docs: gameplay rules, development, testing, architecture, APIs,
operations, ADRs, and archive material. The useful craftsmanship lesson is
that documentation became part of the system’s change surface: generated
schemas, OpenAPI/AsyncAPI, site-flow diagrams, agent guidance, and quality
evidence all need to agree with executable behavior.

### 4. Stable release, then broader interfaces

- **April 2026 — v1.0:** stable core mechanics, WebSocket multiplayer, and a
  basic lobby.
- **Late April–May — v1.1–v1.3:** REST action submission, generated Go/TS SDKs,
  a resilient Go duel CLI, semantic event explanations, staging/CI hardening,
  and the documentation/quality baseline.
- **May–June:** MCP and agent access, autonomous bot support, MCTS experiments,
  ladder work, and stronger schema, replay, and test-isolation contracts.

This is where the project stopped being only “a game” and became a useful
study in API design: multiple callers share contracts, but each caller still
needs its own behavior and integration proof.

### 5. Presentation and assurance became first-class

In June–July, the browser client gained cinematic combat feedback, semantic
narration, visual QA baselines, and a combat-explanation surface. The assurance
work added a reference combat model, rule evidence, liveness/replay checks,
observer-safe projections, and explicit versioned rules semantics. Audio voice
narration is now opt-in/disabled by default for this presentation; visual
narration and combat explanations remain available.

### 6. Current chapter: distribution meets operational truth

The latest release line is **v1.5.0**. Current work includes cosmetic
entitlements and payment experiments, desktop/Go distribution, native-client
parity evidence, and production operations. The unresolved items are as
important to the story as the shipped features: production OTel activation,
truthful readiness signals, Fly.io billing before the next release can be
promoted, browser automation, dependency maintenance, and an MCTS
configuration race.

**The one-sentence history:** Phalanx Duel moved from “can the rules be made
playable?” to “can the same rules be exposed, explained, replayed, documented,
and operated honestly across several clients?”

**Craftsmanship prompt:** At which transition would you have stopped and
refactored—the engine boundary, the first external client, the documentation
system, or the assurance/operations layer?

## 30-second commercial

> Phalanx Duel is tactical card combat played on a compact formation grid.
> Build your line, choose which column to pressure, and let every attack
> resolve through visible card values, suits, and position. It uses a familiar
> 52-card vocabulary, but the strategy is closer to a small battlefield than
> a collectible-card arms race. The rules run in a deterministic,
> server-authoritative engine, so a match can be replayed and explained—not
> argued about. Phalanx Duel: form the line, find the breach.

Do not claim “zero randomness,” “zero pay-to-win,” or shipped iOS parity in the
commercial until those product decisions and release surfaces are explicitly
verified. The accurate promise is deterministic replay semantics given the
same configured inputs and action sequence.

## 30-minute Software Craftsmanship presentation

### 0:00–2:00 — Hook: a card game as a small battlefield

#### Slide: Form the line, find the breach

- Tactical 1v1 card combat.
- Familiar 52-card ranks and suits.
- Two rows and four columns in the canonical Classic format.
- The interesting decision is positional pressure: which column do you build,
  attack, or leave vulnerable?

**Speaker note:** This is a game-engine talk with a playable example, not a
claim that every planned platform or monetization surface has shipped.

**Craftsmanship question:** What is the smallest model that makes the important
decision visible?

### 2:00–5:00 — Rules that fit in a diagram

#### Slide: The canonical board

```text
Opponent LP
  back:  [ ][ ][ ][ ]
 front:  [ ][ ][ ][ ]   ← attack lanes

 front:  [ ][ ][ ][ ]   ← attack lanes
  back:  [ ][ ][ ][ ]
Player LP
```

- Cards deploy into columns.
- The front card is the first defender.
- When a card is destroyed, the column collapses forward.
- Remaining damage can continue through the target chain to the opponent’s
  Life Points.
- Classic rules use a 52-card manifest and 20 starting Life Points.

**Source:** `docs/gameplay/rules.md`, especially the match-parameter,
deployment, and attack-resolution sections.

### 5:00–8:00 — Suits are boundary rules, not card keywords

#### Slide: Where the suit matters

| Suit | Boundary effect |
| --- | --- |
| ♦ Diamonds | Strengthen the card-to-card defense boundary |
| ♥ Hearts | Provide a death-shield effect at the card-to-player boundary |
| ♣ Clubs | Double the first eligible overflow after destruction |
| ♠ Spades | Double Life Point damage at the player boundary |

The exact effect depends on the resolution boundary and destruction state. Do
not simplify this into “clubs do card damage” or “hearts heal”; those slogans
are misleading for the current rules.

### 8:00–11:00 — Live demo: one attack, fully explained

**Demo goal:** Show one attack where a front card is destroyed, the column
collapses, and the remaining damage is either absorbed or reaches Life Points.

Show three views of the same transition:

1. player-visible board state;
2. transaction/event details;
3. calculation explanation and resulting state hash.

**Speaker note:** The visual client is a projection and presentation layer. The
engine’s result is authoritative; the client should not independently
recalculate combat.

### 11:00–14:00 — The engine boundary

#### Slide: One transition function, several consumers

```text
validated action + current state + configured rules
                         │
                         ▼
              TypeScript rules engine
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
      next state     events/log       replay/hash
          │
          ▼
 server-authoritative projections → browser / Go / agent clients
```

The useful claim is not “the client has zero logic.” The accurate claim is
that rules authority lives in the engine/server boundary while clients render
projected state and submit actions.

**Craftsmanship question:** Which code would you trust to run in a property
test, and which code needs a database, network, clock, or browser?

### 14:00–17:00 — Determinism and replay integrity

#### Slide: Make a turn explainable

- The engine uses explicit state and actions.
- Seeded setup and canonical card IDs support reproducible runs.
- Transitions carry before/after state hashes and transaction details.
- Replay verification checks that applying the recorded actions reproduces the
  expected state chain.
- A deterministic result is not automatically a fairness proof; the project
  keeps separate rule, replay, property, statistical, and production gates.

**Avoid:** “Every match is mathematically deterministic regardless of input.”
The qualified statement is: same valid configured inputs and action sequence
should produce the same engine result.

### 17:00–20:00 — Testing as a design constraint

#### Slide: The test ladder

1. Shared schema and contract tests.
2. Pure engine unit/property tests.
3. Server integration tests against isolated test Postgres.
4. Replay, event-log, rule-evidence, and combat-reference checks.
5. Headless and browser playthrough verification.
6. Production health and assurance checks.

Use the current commands only after checking their prerequisites:

```bash
rtk pnpm test:run:all
rtk pnpm rules:check
rtk pnpm qa:playthrough:verify
rtk pnpm --filter @phalanxduel/shared schema:gen
```

**Craftsmanship question:** Which test gives the fastest feedback for a broken
rule, and which test proves the deployed system can still be used?

### 20:00–22:30 — Multi-client and agent access

#### Slide: Shared contracts, different callers

- Browser client: current reference UI, built with Preact/TypeScript.
- Go duel CLI: external client using generated/synchronized API models.
- MCP: engine tools, data tools, analysis, and profile-gated gameplay tools.
- Gameplay agents use `match_create` or `match_join`, then
  `match_get_state`/`action_submit`.
- `quickDeploy` is a current player action and must appear in schemas and
  client adapters.

MCP safety is structural: public profiles do not register admin gameplay or
mutation tools. The static capability script inventories source registrations;
it is not a live health check of every profile.

**Craftsmanship question:** What does a new client get for free from the shared
contract, and what behavior must it still prove for itself?

### 22:30–25:00 — Observability without overclaiming

#### Slide: Instrumentation is not availability

- The project uses OpenTelemetry instrumentation and collector-first routing.
- Local telemetry is useful for correlating match, session, reconnect, and QA
  activity.
- Production `/health` currently reports the process as healthy but
  `otel_active: false`; this is a real operational gap, not a success story.
- Liveness, readiness, database health, and telemetry reachability should be
  reported separately.

Do not present KIND, Redis mesh, global co-located sidecars, or “every turn is
traced in production” as current facts without a fresh deployment audit.

**Craftsmanship question:** How does the system tell us that a feature is
working, degraded, or merely configured?

### 25:00–27:30 — What is deliberately not finished

#### Slide: Honest roadmap

- Production assurance and truthful readiness signals.
- Production OTel restoration and truthful readiness signals.
- Fly.io billing/account remediation so tested images can be promoted.
- MCTS bot-configuration race.
- Shared browser gameplay adapter and canonical evidence format.
- Dependency/security audit after registry connectivity is available.
- Native SwiftUI parity and commercial monetization remain separate roadmap
  work, not assumptions for this talk.

This is a strength in the engineering story: the project distinguishes a green
unit suite from a certified deployed system.

Invite the room to choose one next investigation: repair the local database
ownership issue, make production readiness truthful, stabilize browser
automation, or fix the MCTS race. This turns the final section into a
craftsmanship discussion rather than a roadmap monologue.

### 27:30–30:00 — Close: the engineering lesson

#### Slide: Make the rules legible

1. Put game authority in one deterministic engine.
2. Treat projections and clients as replaceable consumers.
3. Record enough evidence to explain a result.
4. Make verification claims narrower than the evidence supports.

**Closing line:** Phalanx Duel is a small game with a large systems lesson:
when rules, state transitions, clients, and evidence share one contract, a move
can be played, replayed, inspected, and challenged with the same vocabulary.

## Demo runbook

Before presenting:

```bash
rtk pnpm test:run:all
rtk pnpm rules:check
rtk pnpm qa:playthrough:verify
```

Then run one short, deterministic engine demonstration and one browser
demonstration. Keep a recorded fallback because production promotion is
currently blocked by Fly.io billing, while the existing production release
remains healthy.

To capture a complete local PvB game and retain both a full recording and a
short highlight:

```bash
rtk pnpm exec tsx bin/qa/capture-gameplay-gif.ts \
  --base-url http://127.0.0.1:5173 \
  --out-dir artifacts/presentation-local \
  --max-turns 120
```

The recorder requires the match to reach the authoritative `TERMINATED` or
game-over state. It writes `gameplay-full.mp4` and `gameplay.webm` for the
complete match, plus `gameplay.gif` as a 28-second highlight.

### Suggested audience interaction

Pause after the combat-resolution diagram and ask: “Where would you put the
first test?” Collect answers before showing the existing engine, schema, and
replay tests. After the live transition, ask: “What evidence would convince you
this result was not a client-side illusion?”

## Source checklist

- Rules: `docs/gameplay/rules.md`
- Architecture: `docs/architecture/principles.md`
- Version/replay policy: `docs/architecture/versioning.md`
- Agent gameplay: `docs/agents/agentic-gameplay.md`
- MCP surface: `mcp/README.md`, `mcp/src/tools/`
- Verification guidance: `docs/reference/pnpm-scripts.md`, `docs/testing.md`
- Current work and release risks: Backlog tasks, especially `TASK-343`,
  `TASK-345`, `TASK-360`, and `TASK-361`
