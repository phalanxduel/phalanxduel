---
marp: true
theme: default
paginate: true
title: Phalanx Duel — Make the Rules Legible
description: A 30-minute Software Craftsmanship talk about a deterministic tactical game as a systems laboratory.
---

<!-- Editable PowerPoint export: phalanx-duel-30-minute-slides.pptx -->

# Phalanx Duel

## Make the rules legible

### A small game as a laboratory for boundaries, feedback, and trust

Software Craftsmanship McHenry County · 30 minutes

<!--
Speaker notes: Open with the question: what would it take for a move to be
played, replayed, explained, and challenged using the same vocabulary?
[Sources] docs/talks/phalanx-duel-commercial-and-user-group.md
-->

---

# The question behind the game

Can a tactical card game make its rules:

- playable;
- deterministic;
- explainable;
- replayable; and
- honest about what it has not proved?

<!--
Speaker notes (0:00–2:00): This is an engineering case study using the game,
not a claim that every planned platform surface is complete.
[Sources] docs/talks/phalanx-duel-commercial-and-user-group.md
-->

---

# The project started at a table

July 2022 · Camp Tesomas

![bg right:42%](../site/assets/history/primary/notebook/page_01.png)

- A standard 52-card deck
- A notebook of formation and damage sketches
- Friendly tabletop matches
- A design goal: tactical pressure without collectible-card complexity

<!--
Speaker notes (2:00–4:00): Tell the human story first. The site preserves the
notebook and tabletop origin; the wiki preserves the dated artifact trail.
Do not embellish the origin beyond the maintained history page.
[Sources] site/history/notebook.md; wiki/Project-Timeline-and-Continuity.md
-->

---

# The medium changed; the core question did not

```text
notebook → tabletop play → Ruby model → TypeScript engine
                                      ↓
                  web · Go CLI · bots · agents · replay · telemetry
```

The digital system is the latest testable expression of the formation-first
design—not a separate game with unrelated rules.

<!--
Speaker notes (4:00–5:00): The Ruby line is historical lineage. The supported
active client is the browser client; SwiftUI/mobile parity is not presented as
shipped. The system timeline is cross-repository evidence, not a claim that all
archived code remains supported.
[Sources] wiki/Project-Timeline-and-Continuity.md; CHANGELOG.md
-->

---

# The battlefield fits on a small grid

```text
Opponent LP
 back:   [ ][ ][ ][ ]
 front:  [ ][ ][ ][ ]  ← attack lanes

 front:  [ ][ ][ ][ ]  ← attack lanes
 back:   [ ][ ][ ][ ]
Player LP
```

- Cards occupy columns and ranks.
- The front card meets the attack first.
- A destroyed card exposes the next card in the column.
- Remaining damage can reach Life Points.

<!--
Speaker notes (5:00–7:00): Describe the canonical Classic format: four
columns, two ranks, a 52-card manifest, and 20 starting Life Points. Keep the
diagram simple; the rules document is the authority.
[Sources] docs/gameplay/rules.md
-->

---

# Suits change the boundary being crossed

| Suit | Tactical role in the current rules |
|---|---|
| ♦ Diamonds | Card-to-card defense boundary |
| ♥ Hearts | Card-to-player death-shield boundary |
| ♣ Clubs | First eligible overflow after destruction |
| ♠ Spades | Life Point damage at the player boundary |

The effect depends on resolution state. Slogans like “hearts heal” are wrong.

<!--
Speaker notes (7:00–9:00): Emphasize that the interesting design is in the
boundaries and destruction state, not in four isolated keywords. Ask where the
first test belongs: suit parsing, boundary selection, or the full transition?
[Sources] docs/gameplay/rules.md; docs/gameplay/rule-evidence.json
-->

---

# One attack is a causal story

```text
validated action
      ↓
combat calculation
      ↓
shield / destruction / collapse
      ↓
overflow / Life Point damage
      ↓
post-state + events + arithmetic witness
```

The player sees one result. The system retains the chain that produced it.

<!--
Speaker notes (9:00–11:00): Live demo one attack. Show the board, then the
transaction details, then the calculation explanation. The client presents;
the engine/server owns the rule result.
[Sources] docs/architecture/principles.md; docs/architecture/audit-trail.md
-->

---

# Put authority in one transition boundary

```text
state + valid action + configured rules
                  │
                  ▼
         TypeScript rules engine
          ┌───────┼────────┐
          ▼       ▼        ▼
       state    events    hashes
          └───────┼────────┘
                  ▼
     server projections → web / Go / agent clients
```

Clients still have behavior. They do not become competing rule engines.

<!--
Speaker notes (11:00–13:00): Distinguish authority from presentation. This is
the seam that makes pure tests valuable and clients replaceable.
[Sources] docs/architecture/principles.md; docs/adr/ADR-001-authority-model-is-explicit.md
-->

---

# Determinism is a contract, not a slogan

Given the same configured inputs and valid action sequence, the engine should
produce the same result.

- Explicit state and actions
- Canonical card identity
- State and action evidence for replay
- Versioned rules semantics

Determinism does not, by itself, prove fairness or production availability.

<!--
Speaker notes (13:00–15:00): Make the qualified claim. The distinction between
deterministic behavior and deterministic evidence is one of the talk’s main
lessons.
[Sources] docs/architecture/versioning.md; docs/quality/gameplay-rule-evidence.md
-->

---

# The same match can explain itself

The current system carries engine-authored evidence into:

- previews;
- narration and combat effects;
- semantic events;
- replay checks; and
- the terminal match report.

[Play the verified full-game capture](../../artifacts/presentation-local/gameplay-full.mp4)

<!--
Speaker notes (15:00–17:00): Play the local full-game recording if available.
The verified capture is 76.24 seconds and ends on the visible game-over report.
If the Markdown renderer cannot play MP4, use the file as a presenter cue and
open it separately. Do not claim the asset is committed; artifacts are local.
[Sources] docs/talks/phalanx-duel-commercial-and-user-group.md; local capture artifact
-->

---

# Testing is a ladder of confidence

1. Shared schemas and contract tests
2. Pure engine and property checks
3. Isolated server/Postgres integration tests
4. Replay, event-log, rules, and combat-reference checks
5. Headless and browser playthroughs
6. Production health and assurance checks

Each rung answers a different question.

<!--
Speaker notes (17:00–19:00): Show the fastest useful test for a changed rule,
then show the slower test that proves the running system can still be used.
The current playability gate passed 12/12 in the capture session.
[Sources] docs/testing.md; docs/reference/qa-runners.md; docs/reference/dod.md
-->

---

# Shared contracts do not erase integration work

| Caller | What it shares | What it must still prove |
|---|---|---|
| Browser | projected state and actions | interaction and visual behavior |
| Go CLI | generated/synchronized models | reconnect and terminal behavior |
| MCP agents | gameplay tool contracts | profile safety and action flow |
| Replay tools | state/action evidence | equivalence and visibility rules |

<!--
Speaker notes (19:00–21:00): Ask: what does a new client get for free, and what
must it prove? A shared schema is leverage, not a substitute for integration
tests.
[Sources] mcp/README.md; clients/go/duel-cli/README.md; docs/api/openapi.json
-->

---

# Observability is not availability

- OpenTelemetry is the collector-first instrumentation path.
- Local telemetry can correlate match, session, reconnect, and QA activity.
- Production health and telemetry reachability are separate signals.
- The current production audit reported `otel_active: false`.

That gap belongs in the talk because trustworthy systems report degradation.

<!--
Speaker notes (21:00–23:00): Do not say every production turn is traced. Show
how a system can be healthy enough to serve traffic while an observability
capability is inactive.
[Sources] docs/observability/gameplay-panoramic-view.md; docs/ops/runbook.md;
production health audit recorded in the session handoff
-->

---

# What is deliberately unfinished

- Production OTel restoration and truthful readiness signals
- Fly.io billing remediation before the next promotion
- Browser automation edge cases
- MCTS configuration race
- Dependency/security maintenance
- Native-client parity and monetization experiments

An honest roadmap is part of the engineering artifact.

<!--
Speaker notes (23:00–26:00): Invite the room to choose one investigation. The
point is not that the project is finished; it is that shipped behavior,
evidence, and roadmap work are clearly separated.
[Sources] docs/talks/phalanx-duel-commercial-and-user-group.md; CHANGELOG.md
-->

---

# The lesson is bigger than the game

1. Put authority in one deterministic engine.
2. Treat clients as replaceable projections.
3. Record enough evidence to explain a result.
4. Make verification claims narrower than the evidence.

## Form the line. Find the breach. Explain the result.

<!--
Speaker notes (26:00–30:00): Close by returning to the opening question. A move
is trustworthy when the system can play it, replay it, inspect it, and explain
its boundaries with one shared contract. Leave the audience with a discussion
prompt: where would you put the next seam or test?
[Sources] docs/talks/phalanx-duel-commercial-and-user-group.md
-->
