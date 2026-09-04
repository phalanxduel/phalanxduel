---
title: "System Features"
description: "A bounded summary of Phalanx Duel's tactical rules and supporting system surfaces."
status: active
updated: "2026-09-03"
audience: all
---

# Phalanx Duel System Features

Phalanx Duel is a deterministic, server-authoritative tactical card game. The
[Canonical Rules Specification](../gameplay/rules.md) defines gameplay; this
page is a concise map of the supported surfaces rather than a promise about
future scale or availability.

## Tactical play

- **Formation-first combat.** In the competitive Classic format, each player
  builds a face-up 2 by 4 battlefield. Front-rank cards attack; damage can
  cross a column from front card to back card to Life Points.
- **Boundary-based suits.** Diamonds, Hearts, Clubs, and Spades alter specific
  card-to-card or card-to-player transitions. They are not global shield,
  heal, or area-of-effect abilities.
- **Classic special cards.** Aces and face cards constrain destruction
  eligibility, while Classic damage resets surviving cards between turns.
- **Hidden zones with public formations.** Hands and draw piles remain private
  during a live match. Deployed battlefield cards are public in competitive
  v3.0.

## Trust and replay surfaces

- **One authority for rules.** A pure TypeScript engine applies validated
  actions to authoritative state. Clients receive safe projections; they do
  not decide combat outcomes.
- **Versioned, inspectable transitions.** Valid inputs and actions produce the
  same rule-versioned result. Combat records include arithmetic provenance,
  events, and state hashes for replay and diagnosis.
- **Bounded verification.** Tests, rules checks, replay checks, and browser
  playthroughs cover different claims. They provide evidence for the covered
  behavior; they do not prove balance, universal fairness, or availability.

## Delivery surfaces

- **Browser client.** The supported live client for creating, joining, and
  playing matches.
- **External-client contracts.** Generated REST and WebSocket schemas support
  compatible clients, including the Go duel CLI and explicitly scoped agent
  tools.
- **Operational diagnostics.** The project instruments local and service
  boundaries with OpenTelemetry-compatible traces, logs, and metrics. Health,
  telemetry reachability, and gameplay correctness are separate checks.

For an introduction at the table, read [How to Play](../gameplay/how-to-play.md).
