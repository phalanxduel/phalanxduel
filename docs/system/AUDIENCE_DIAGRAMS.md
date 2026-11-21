---
title: "Audience Architecture & Pitch Diagrams"
description: "Visual diagrams for visitors, players, tournament partners, and investors covering gameplay, platform moat, fair play, growth flywheel, and engineering assurance."
status: active
updated: "2026-11-21"
audience: all
---

# Phalanx Duel — Player, Partner & Investor Diagrams

Eight high-signal visual maps complementing the engineering ERD, module DAG, and infrastructure topology in `docs/library/index.html`.

---

## Part 1 — For Visitors & Players

### 1. Column Cascade & Suit Boundary Map

```mermaid
flowchart LR
    ATK["Front-Rank Attacker<br/>(Clubs / Spades Amplify)"]
    FRN["Opposing Front Card"]
    DIA{"♦ Diamond Boundary<br/>(Absorbs Card-to-Card)"}
    BCK["Opposing Back Card"]
    HRT{"♥ Heart Boundary<br/>(Cushions LP Impact)"}
    LP["Opponent Life Points<br/>(0 LP = Victory)"]

    ATK -->|"Base Attack"| FRN
    FRN -->|"Overkill Spillover"| DIA
    DIA -->|"Remaining Damage"| BCK
    BCK -->|"Overkill Spillover"| HRT
    HRT -->|"Final Lethal Damage"| LP
```

### 2. Player Skill Ladder & Mode Journey

```mermaid
flowchart LR
    Guest["Guest Quick Start<br/>(Zero Friction)"]
    Scout["Scout Bot<br/>(Random)"]
    Grunt["Grunt Bot<br/>(Heuristic)"]
    Soldier["Soldier Bot<br/>(MCTS 100)"]
    Spec["5 Specialist Bots<br/>(Veteran · Destroyer · Sentinel · Blitz)"]
    Champ["Champion Bot<br/>(MCTS 1000)"]
    PvP["Ranked 1v1 PvP<br/>(4 Seasonal Elo Ladders)"]
    Tourney["LAN Tournaments &<br/>Spectator Casting"]

    Guest --> Scout --> Grunt --> Soldier --> Spec --> Champ --> PvP --> Tourney
```

### 3. Player-Friendly 5-Step Turn Loop

```mermaid
flowchart LR
    Deploy["1. Deploy<br/>(Place Hand → 2x4 Grid)"]
    Act["2. Attack or Pass<br/>(Front Rank Strikes)"]
    Cascade["3. Cascade<br/>(Front → Back → LP)"]
    Reinforce["4. Reinforce & Draw<br/>(Back Advances / Refill)"]
    Win["5. Victory Check<br/>(0 LP / Pass Limit / Forfeit)"]

    Deploy --> Act --> Cascade --> Reinforce --> Win
    Win -->|"Match Continues"| Act
```

---

## Part 2 — For Investors, Sponsors & Venue Partners

### 4. "One Deterministic Engine → Many Surfaces" Platform Moat

```mermaid
flowchart TD
    Engine["@phalanxduel/engine<br/>Pure Deterministic TS · 0.225ms p99 · 6,259 actions/s<br/>2,355,388 Verified Combat Transitions"]
    Contract["Shared OpenAPI + AsyncAPI + JSON Schema Contracts"]
    Web["Browser Client<br/>(React / Vite · Desktop & Mobile)"]
    CLI["Terminal Client<br/>(Go duel-cli · WS ACK Replay)"]
    MCP["AI & Agentic Surface<br/>(MCP Server · Autonomous Bots)"]
    LAN["Offline-Capable LAN Host<br/>(Zero Cloud Bill at Live Events)"]

    Engine --> Contract
    Contract --> Web
    Contract --> CLI
    Contract --> MCP
    Contract --> LAN
```

### 5. Provable Fair-Play & Esports Integrity Chain

```mermaid
flowchart LR
    Action["Player Action<br/>(Authenticated REST / WS)"]
    Server["Authoritative MatchActor<br/>(Server-Side Rules Only)"]
    Redact["Observer Projection<br/>(Hidden Hands Redacted)"]
    Delay["Spectator Delay<br/>(Anti-Stream-Snipe)"]
    Hash["Canonical SHA-256<br/>Per-Turn Hash Chain"]
    Verify["Public /api/matches/:id/verify<br/>(Cryptographic Replay Proof)"]

    Action --> Server --> Redact --> Delay
    Server --> Hash --> Verify
```

### 6. Acquisition, Retention & Monetization Flywheel

```mermaid
flowchart LR
    Acquire["Acquisition<br/>22 YouTube Shorts/Tutorials · phalanxduel.com Calculator · LAN QR Events"]
    Activate["Frictionless Activation<br/>Instant Guest Quick Start → 1-Click Account Signup"]
    Retain["Competitive Retention<br/>4 Elo Ladders · 19 Rarity Achievements · Unlockable Dual Loop · Replays"]
    Monetize["Non-Pay-to-Win Revenue<br/>Cosmetic Cardbacks · Supporter Pass (Stripe) · Venue Tournament Kits"]

    Acquire --> Activate --> Retain --> Monetize --> Acquire
```

### 7. Engineering Assurance Pyramid (Technical Due Diligence)

```mermaid
flowchart TB
    L1["Exhaustive Combat Oracle: 2,355,388 Verified Transitions + 71 Rule Proofs"]
    L2["Fuzzing & Mutation: fast-check Property Tests + Stryker Mutation Testing"]
    L3["Architecture & Security: 0 Boundary Violations · 0 HIGH/CRIT CVEs · DB Isolation Guards"]
    L4["Performance & Observability: 0.225ms p99 Gate · OTel → Jaeger + OpenObserve · Groma C4 + Graphify"]

    L1 --> L2 --> L3 --> L4
```

### 8. Automated Content & Marketing Engine

```mermaid
flowchart LR
    Specs["22 Episode Specs<br/>(10 Shorts 9:16 + 12 Long-Form 16:9)"]
    Record["Playwright Recorder<br/>(Live UI + Keyframes + footage.json)"]
    Render["FFmpeg + Zoe Neural TTS<br/>(EBU R128 Loudness + WebVTT Captions)"]
    Stage["media-pipeline Staged Drop<br/>(SHA-256 Verified 6-File Bundles)"]
    Dist["Distribution<br/>(YouTube Playlist + phalanxduel.com/learn/ + Wiki)"]

    Specs --> Record --> Render --> Stage --> Dist
```
