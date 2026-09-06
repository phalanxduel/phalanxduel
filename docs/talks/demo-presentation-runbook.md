---
title: "Demo & Presentation Runbook"
description: "Operational presenter guide, live talk track, and launch procedures for Phalanx Duel demonstrations."
status: active
updated: "2026-09-06"
audience: presenters, operators, contributors
---

# Demo & Presentation Runbook

This runbook provides the presenter with a complete, zero-anxiety guide for delivering a live demonstration of Phalanx Duel. It covers pre-flight verification, dual access topologies (workstation and multi-device LAN), the live demonstration flow, PVL longitudinal analysis context, and emergency recovery options.

---

## 1. System Narrative & Core Purpose

Phalanx Duel is an authoritative, deterministic tactical card game built on standard 52-card poker decks:

- **Mathematical Determinism**: Every turn, collision, and suit boundary effect is evaluated by a pure, deterministic engine. The same shuffled seed produces identical outcomes across all reference clients and headless test runners.
- **Cryptographic Replay Integrity**: Every match computes a canonical per-turn state hash. Match history is immutable and verifiable, enabling instant deterministic re-simulation.
- **Longitudinal System Cartography (PVL)**: Beyond verifying a single match, Phalanx Duel serves as the reference laboratory for **Panoramic View Labs (PVL)** — employing the Panoramic View technique as a **longitudinal analysis tool** to map system behavior, invariants, telemetry waterfalls, and player journeys across time, versions, and deployment environments.

---

## 2. Access Topologies: Localhost vs. LAN

The local stack is wired through Nginx (`nginx/phalanxduel.localhost.conf` $\rightarrow$ `/opt/homebrew/etc/nginx/servers/phalanxduel.conf`) to provide two clean HTTPS access paths:

| Surface | Workstation Localhost | Multi-Device LAN / Wi-Fi | Target Local Service |
|---|---|---|---|
| **Game Client** | `https://play.phalanxduel.localhost/` | `https://play.lan.phalanxduel.com/` | Port 5173 (Vite dev server + `/ws` proxy) |
| **Admin Console** | `https://admin.phalanxduel.localhost/` | `https://admin.lan.phalanxduel.com/` | Port 3103 (Admin UI) $\rightarrow$ 3102 (API) |
| **Demo Cockpit** | `https://phalanxduel.localhost/demo/` | `https://lan.phalanxduel.com/demo/` | Port 3333 (Cockpit Bridge) |
| **Documentation & Site** | `https://phalanxduel.localhost/` | `https://lan.phalanxduel.com/` | `/opt/homebrew/var/www/phalanxduel` |
| **OpenAPI Docs** | `http://127.0.0.1:3001/docs` | App API route | Port 3001 (Fastify Server) |

### Demonstrating on Mobile or Audience Devices (LAN)
- Public DNS and local AdGuard resolve `*.lan.phalanxduel.com` to your host LAN IP (`10.36.1.149`).
- Connect any phone, tablet, or secondary laptop on your Wi-Fi directly to `https://play.lan.phalanxduel.com`.
- WebSockets (`wss://play.lan.phalanxduel.com/ws`) tunnel seamlessly through Nginx to the Fastify backend with real-time state synchronization.

---

## 3. Pre-Flight Launch Checklist (Zero-Anxiety Setup)

Before presenting, launch the services cleanly:

```bash
# 1. Start the stack and launch the live cockpit:
bin/phx-demo-ctl up

# 2. Verify all services are reporting READY:
bin/phx-demo-ctl status

# 3. View the generated cockpit quicklinks deck:
bin/phx-demo-ctl links
```

### Readiness Verification
- [ ] `bin/phx-demo-ctl status` returns `overallStatus: HEALTHY`.
- [ ] `https://play.phalanxduel.localhost/` (or `https://play.lan.phalanxduel.com/`) loads without console errors.
- [ ] The Cockpit at `/demo/` displays live latency metrics and green status indicators.
- [ ] *(Optional)* If you need a clean slate before taking the stage, run `bin/phx-demo-ctl reset` to reseed the development database in seconds.

---

## 4. Live Demonstration Run of Show (3–5 Minutes)

### Step 1: Tactical Setup (0:00 – 0:45)
- **Action**: Open the game client, enter a player handle, and start a Quick Match against an Easy Bot (or join on a mobile device).
- **Narrative**: *"Phalanx Duel translates a standard 52-card deck into a spatial tactical duel. Each player receives 12 cards to deploy a 4-column battle line. Each column has a front-rank defender and a back-rank reserve."*

### Step 2: Intent, Attack, and Breakthrough (0:45 – 1:30)
- **Action**: Select a front-rank attacker, target an enemy column, and launch the attack.
- **Narrative**: *"Turns are simple: attack or pass. An attack targets an entire enemy column. Damage flows in strict sequence: front rank $\rightarrow$ back rank $\rightarrow$ opponent's lifepoints. If your attack value meets or exceeds the front card, it is destroyed and excess damage penetrates forward."*

### Step 3: Suit Boundary Rules (1:30 – 2:15)
- **Action**: Highlight the card borders, suit tags, and the transaction log explanation banner.
- **Narrative**: *"Suits are mathematical timing rules, not arbitrary spells:
  - **Diamonds** absorb damage when moving card-to-card.
  - **Hearts** absorb damage before reaching the player's lifepoints.
  - **Clubs** double carryover damage after clearing the first card.
  - **Spades** double breakthrough damage directly into the enemy player."*

### Step 4: Defense Reinforcement & Initiative (2:15 – 2:45)
- **Action**: Watch the opponent reinforce the breached column from hand, draw back to 4 cards, and see initiative shift.
- **Narrative**: *"Defense is reactive: after an attack resolves, only the damaged column can be reinforced from hand. Surviving cards reset to full strength. Then the defender draws to 4 and takes initiative."*

### Step 5: Verification & Replay Integrity (2:45 – 3:30)
- **Action**: Open the match details dialog, showing the state hash and transaction audit trail.
- **Narrative**: *"Because the engine is deterministic and server-authoritative, every match produces a cryptographic state hash. The same duel can be replayed bit-for-bit in browser, terminal CLI, or headless test."*

---

## 5. PVL: Longitudinal System Cartography

When explaining the system engineering and software craftsmanship behind the game:

- **Longitudinal Perspective**: Contrast point-in-time unit testing with PVL's longitudinal system cartography. PVL monitors invariant proofs, state transitions, and bot heuristics across hundreds of turns and releases.
- **Telemetry Invariants**: OpenTelemetry trace context correlates browser client spans, WebSocket messages, server handlers, and database ledger writes.
- **Observability in Action**: Use the demo cockpit links to open Jaeger or OpenObserve (O2) and demonstrate real-time span waterfall traces captured during the live duel.

---

## 6. Curated Visual & Presentation Assets

Reference and showcase these freshly generated assets:

- **Narrated Video Reel**:
  - MP4: [`output/video/phalanx-duel-demo.mp4`](../../output/video/phalanx-duel-demo.mp4) (18.8 MB, 2.8 min narrated demo)
  - WebM: [`output/video/phalanx-duel-demo.webm`](../../output/video/phalanx-duel-demo.webm) (14.1 MB)
  - Captions: [`output/video/phalanx-duel-demo.vtt`](../../output/video/phalanx-duel-demo.vtt)
- **Visual Design Flow Catalog**:
  - Interactive HTML Gallery: [`artifacts/design-baseline/latest/catalog.html`](../../artifacts/design-baseline/latest/catalog.html) (28 desktop and mobile captures across all states)
- **Action Gameplay Gallery**:
  - High-res stills: [`artifacts/gallery/`](../../artifacts/gallery/) (`lobby.png`, `deployment-with-hand.png`, `attack-with-hand.png`, `reinforce-phase.png`)
- **Physical Cards Quickstart**:
  - PDF: [`output/pdf/phalanx-duel-face-to-face-quickstart.pdf`](../../output/pdf/phalanx-duel-face-to-face-quickstart.pdf)
  - Markdown: [`docs/gameplay/face-to-face-quickstart.md`](../gameplay/face-to-face-quickstart.md)

---

## 7. Emergency Live Recovery Cheatsheet

| Incident | Immediate Action |
|---|---|
| Dirty or corrupted match state | `bin/phx-demo-ctl reset` (Reseeds development database in < 2 seconds) |
| Cockpit bridge unresponsive | `bin/phx-demo-ctl restart-cockpit` (Restarts port 3333 bridge; live matches remain up) |
| Service or port stuck | `bin/phx-demo-ctl restart` (Clean teardown and restart of daemonized services) |
| Host Nginx stopped | `sudo launchctl kickstart -k system/homebrew.mxcl.nginx` |
| Emergency direct port bypass | Client: `http://127.0.0.1:5173` · Server: `http://127.0.0.1:3001` |
