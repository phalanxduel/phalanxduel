# V3 Game Flow Diagrams

> Iceboxed context: Godot/V3 migration is not active. This document is retained
> only as historical planning material and must not be used as current project
> direction unless Backlog explicitly reactivates Godot/V2/V3 work.

## 1. Game Statechart (Phase Transitions)

```mermaid
stateDiagram-v2
    [*] --> StartTurn

    StartTurn --> DeploymentPhase: system:init
    StartTurn --> AttackPhase: system:init (no deployment)
    StartTurn --> gameOver: system:victory, forfeit

    DeploymentPhase --> DeploymentPhase: deploy (alternate players)
    DeploymentPhase --> AttackPhase: deploy:complete (all slots filled)
    DeploymentPhase --> gameOver: forfeit

    AttackPhase --> AttackResolution: attack
    AttackPhase --> AttackResolution: pass (no damage)
    AttackPhase --> gameOver: forfeit

    AttackResolution --> CleanupPhase: system:advance
    AttackResolution --> gameOver: attack:victory
    AttackResolution --> gameOver: forfeit

    CleanupPhase --> ReinforcementPhase: system:advance (cards collapse)
    CleanupPhase --> gameOver: forfeit

    ReinforcementPhase --> ReinforcementPhase: reinforce (defender places cards)
    ReinforcementPhase --> DrawPhase: system:advance (no reinforcement possible)
    ReinforcementPhase --> DrawPhase: reinforce:complete
    ReinforcementPhase --> DrawPhase: pass (skip reinforcement)
    ReinforcementPhase --> gameOver: forfeit

    DrawPhase --> EndTurn: system:advance (cards drawn to maxHandSize)
    DrawPhase --> gameOver: forfeit

    EndTurn --> StartTurn: system:advance (turn context cleared, activePlayer updated)
    EndTurn --> gameOver: forfeit

    gameOver --> [*]
```

## 2. Turn Sequence (Automated Bot Match)

```mermaid
sequenceDiagram
    participant UI as V3 UI<br/>(Godot)
    participant FSM as GameStateMachine
    participant Engine as Engine<br/>(TypeScript)
    participant Bot as Bot<br/>(Heuristic)

    Note over UI,Bot: Turn N starts
    UI->>FSM: transition_to(StartTurn)
    FSM->>Engine: POST /game/turn-start
    Engine->>Bot: get valid actions for AttackPhase
    Bot->>Engine: return [attack(col=1), attack(col=2), pass()]

    UI->>FSM: transition_to(AttackPhase)
    UI->>UI: show combat scene with action panel

    Note over UI,Bot: P1 attacks
    Bot->>Engine: POST /game/action {attack, col=1}
    Engine->>Engine: resolve attack, update state
    FSM->>UI: phase_changed(AttackResolution)
    UI->>UI: update battlefield (damage visualization)

    FSM->>UI: phase_changed(CleanupPhase)
    UI->>UI: animate card collapsing

    FSM->>UI: phase_changed(ReinforcementPhase)
    Engine->>Bot: get valid reinforcements for P2
    Bot->>Engine: POST /game/action {reinforce, card=X}
    Engine->>Engine: place card, update state

    FSM->>UI: phase_changed(DrawPhase)
    UI->>UI: animate card draw

    FSM->>UI: phase_changed(EndTurn)
    FSM->>UI: phase_changed(StartTurn)

    Note over UI,Bot: Turn N+1 starts (P2 now active)
    UI->>UI: update turn indicator

    Note over UI,Bot: Loop continues until gameOver
```

## 3. V3 Scene Lifecycle

```mermaid
graph TB
    Start([App Start]) --> MR[MatchRoot]
    MR --> SM["GameStateMachine<br/>current_phase: StartTurn"]
    
    MR --> Lobby["🎮 LobbyScene<br/>(name input)"]
    Lobby --> Deploy["⚔️ DeploymentScene<br/>(4×2 grid)"]
    Deploy --> Combat["🎯 CombatScene<br/>(actions)"]
    Combat --> Combat_loop["AttackPhase → AttackResolution<br/>→ Cleanup → Reinforce<br/>→ Draw → EndTurn<br/>(automated phase transitions)"]
    Combat_loop --> Combat
    Combat_loop --> GameOver["🏁 GameOverScene<br/>(winner)"]
    GameOver --> Restart["Restart"]
    Restart --> Lobby
    GameOver --> Exit([Exit])

    SM -.->|phase_changed signal| Lobby
    SM -.->|phase_changed signal| Deploy
    SM -.->|phase_changed signal| Combat
    SM -.->|phase_changed signal| GameOver

    style Lobby fill:#e1f5ff
    style Deploy fill:#f3e5f5
    style Combat fill:#fff3e0
    style GameOver fill:#f1f8e9
```

## 4. Action Flow (Player Input → State Change)

```mermaid
graph LR
    Player["👤 Player<br/>(human)"] -->|click button| UI["🎮 V3 UI<br/>(Godot scene)"]
    UI -->|emit action| FSM["📊 GameStateMachine<br/>(phase transition)"]
    FSM -->|send action| Engine["⚙️ Engine<br/>(authoritative)"]
    Engine -->|validate & apply| State["🔄 Game State<br/>(new turn)"]
    State -->|broadcast new state| UI
    UI -->|render| Display["🖼️ Screen<br/>(updated board)"]
    Display --> Player

    Bot["🤖 Bot<br/>(heuristic)"] -->|choose action| Engine

    style Player fill:#e3f2fd
    style UI fill:#f3e5f5
    style FSM fill:#fff3e0
    style Engine fill:#ede7f6
    style State fill:#f1f8e9
    style Display fill:#e8f5e9
    style Bot fill:#ffebee
```

## Key Invariants

1. **Engine is authoritative** — V3 UI sends actions, engine validates and applies
2. **Phases are sequential** — no parallel phases or out-of-order transitions
3. **Deterministic with seeded scenario** — same seed=12345 produces identical game flow
4. **Player alternation** — active player switches after each turn (EndTurn → StartTurn)
5. **Auto-advance phases** — AttackResolution, Cleanup, Draw are automatic; only AttackPhase and ReinforcementPhase await player/bot action

## Testing Against Reference

- Play seed=12345 in V3
- Compare phase transitions with `artifacts/seeded-baseline/scenario.json`
- Verify each screenshot matches V1 baseline
- Iterate until pixel-perfect parity
