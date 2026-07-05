<!-- markdownlint-disable MD005 MD007 MD009 -->
# Phalanx Duel: UI/UX Component Taxonomy & State Contracts (v1.0)

This document establishes the canonical **Presentation Layer Contract** for Phalanx Duel. It abstracts the visual interface away from specific web technologies (HTML/React), defining a universal language of UI objects, state mappings, and interaction rules.

By conforming to this taxonomy, the active browser client can maintain a complete, authentic, and server-compliant gameplay experience. Historical Godot/V2 parity work is archived under `archive/godot-v2-v3/` and is not an active QA target.

---

## 1. Architectural Philosophy

1. **State-Driven Rendering:** The UI is a pure projection of the engine's `GameViewState` and the current `LegalAction[]`.
2. **Perspective Isolation:** The UI must strictly adhere to the `Perspective` context:
   - **Player Perspective:** Can view private hand data; can execute valid actions.
   - **Spectator Perspective:** Cannot view hidden data (facedown cards); cannot emit actions.
3. **Platform Agnosticism:** Components are defined by their *purpose* and *state*, not their implementation. (e.g., A "Card" might be a `div` on web, or a native view in another client).
4. **Form-Factor Responsiveness:** Contracts must account for both Desktop (hover, drag, precise clicks) and Mobile (tap-to-select, touch targets).

---

## 2. Universal UI Object Definitions

### 2.1 The Card Object (`CardView`)
*   **Purpose:** The fundamental atomic unit representing a unit, spell, or item.
*   **Engine Mapping:** `GameViewState.deployedCards`, `GameViewState.hands`
*   **Perspective Rules:**
  *   *Player:* Hand cards are rendered face-up.
  *   *Spectator / Opponent:* Hand cards are rendered face-down (or as simple count indicators).
*   **Form Factor Rules:**
  *   *Desktop:* Hover states reveal detailed metadata (tooltips).
  *   *Mobile:* Tap-and-hold (long press) reveals metadata; tap selects.
*   **Interactive Contract:**
  *   `Idle`: Static rendering.
  *   `Selectable`: Emits a visual pulse or glow indicating it can be chosen for an action.
  *   `Selected`: Visually elevated or bordered. Emits selection event to the intent state machine.
  *   `Targetable`: Distinct highlight (e.g., red reticle) indicating it is a valid target for the active card.

### 2.2 The Player Status Board (`StatusView`)
*   **Purpose:** Displays the immutable identity and health of a combatant.
*   **Engine Mapping:** `GameViewState.players[id].lp`, `GameViewState.players[id].name`
*   **Perspective Rules:** Identical rendering for all perspectives.
*   **Form Factor Rules:** Must remain permanently visible and pinned to the top/bottom (mobile) or corners (desktop).
*   **Visual Contract:**
  *   **Health:** Integer value [0, 500]. Must flash/pulse on damage calculation to draw the eye.
  *   **Identity:** Renders player avatar and connection status.

### 2.3 The Phase & Intent Control (`ActionPromptView`)
*   **Purpose:** The central control mechanism for phase progression and action submission.
*   **Engine Mapping:** `GameViewState.currentPhase`, `LegalAction[]`
*   **Perspective Rules:**
  *   *Player:* Renders the primary action button (e.g., "End Deployment", "Skip Action").
  *   *Spectator:* Renders a passive phase indicator (e.g., "Player 1 is Deploying").
*   **Interactive Contract:**
  *   `Disabled`: Renders as gray/inactive when the active intent does not fulfill a `LegalAction`.
  *   `Enabled`: Highly visible (primary brand color) when the intent matches a `LegalAction`. Click/tap submits to the server.

### 2.4 The Grid / Battlefield (`ArenaView`)
*   **Purpose:** The spatial container mapping deployed cards to their tactical positions.
*   **Engine Mapping:** `GameViewState.deployedCards`
*   **Perspective Rules:** The local player's perspective is always mapped to the "bottom" half of the screen. For spectators, Player 1 is arbitrarily bottom.
*   **Interactive Contract:** Provides positional anchors for drag-and-drop (desktop) or tap-to-move (mobile) mechanics, resolving intent based on valid slots.

### 2.5 The Event Ticker (`NarrationView`)
*   **Purpose:** Translates machine-state transitions (damage taken, phases ended) into human-readable lore and feedback.
*   **Engine Mapping:** `transactionLog` (Enriched `PhalanxEvent[]`)
*   **Perspective Rules:** Identical for all perspectives. Crucial for spectators to follow the match.
*   **Visual Contract:** Unobtrusive scrolling log. High-severity events (e.g., "HEART SHIELD ACTIVATED") emit a temporary, large-scale cinematic overlay.

---

## 3. Automation and Validation (The Certification)

To certify a client implementation, the client must expose its UI objects to the automation harness using standardized locators mapped directly to the component taxonomy.

### The Client Contract
Every client must fulfill a locator interface mapping back to the objects above. For example:
- **Card Selection:** `locator('CardView[owner="P1"][id="uuid"]')`
- **Action Submission:** `locator('ActionPromptView').click()`
- **Health Assertion:** `assert(locator('StatusView[owner="P2"]').lp === 40)`

By standardizing these UI objects as abstract definitions, we decouple the *look and feel* from the *mechanical assertions*. Different clients can look different while sharing the same mechanical validation suite and certified behavior.

### 2.6 The Lobby (`LobbyView`)
*   **Purpose:** The central hub for match creation, discovery, and player readiness.
*   **Engine Mapping:** `MatchmakerState`, `LobbyState`
*   **Interactive Contract:**
  *   `data-component="LobbyView"`: The top-level container.
  *   `data-action="create-match"`: Button to host a match.
  *   `data-action="join-match"`: Button to join a match.
  *   `data-input="starting-lp"`: Configuration for match length.

### 2.7 The Authentication Panel (`AuthView`)
*   **Purpose:** The gatekeeper for player identity and profile management.
*   **Interactive Contract:**
  *   `data-component="AuthView"`: The top-level container.
  *   `data-action="login"`: Authentication submission.
  *   `data-action="logout"`: Session termination.
  *   `data-input="email"`, `data-input="password"`, `data-input="gamertag"`: Credentials.

### 2.8 The Leaderboard (`LeaderboardView`)
*   **Purpose:** Displays ranked ladder standings, Elo scores, and active seasonal data.
*   **Engine Mapping:** Server `PlayerRepository` / Ranking state
*   **Interactive Contract:**
  *   `data-component="LeaderboardView"`: The top-level container for the ladder.
  *   `data-component="LeaderboardRow"`: Individual player entry.
  *   `data-action="view-profile"`: Click/tap to inspect a specific player's public profile.
  *   `data-state="active-user"`: Highlights the currently authenticated user's row if visible.

### 2.9 The Match History (`MatchHistoryView`)
*   **Purpose:** Provides a chronological log of a player's past matches, outcomes, and replay access.
*   **Engine Mapping:** Server `MatchRepository` (archived matches)
*   **Interactive Contract:**
  *   `data-component="MatchHistoryView"`: The top-level container.
  *   `data-component="MatchHistoryCard"`: A discrete past match entry showing opponent, date, and outcome (Victory/Defeat).
  *   `data-action="watch-replay"`: Action to load the historical GameViewState and step through the deterministic replay.

### 2.10 The Achievements & Progression (`AchievementView`)
*   **Purpose:** Tracks and displays meta-progression, unlocked titles, cosmetics, or milestones.
*   **Engine Mapping:** Server progression/unlocks database table
*   **Interactive Contract:**
  *   `data-component="AchievementView"`: The top-level container for all achievements.
  *   `data-component="AchievementBadge"`: An individual achievement item.
  *   `data-state="unlocked" | "locked"`: Visual state distinguishing completed vs pending milestones.
  *   `data-action="equip-title"`: If applicable, allows user to set a title/badge for their public profile.
