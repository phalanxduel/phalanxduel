# Phalanx Duel: Privacy, Ethics, and Data Integrity

This document serves as the foundational reference for how Phalanx Duel handles data, monitoring, and decision-making. In this project, ethical engineering is not merely a moral choice; it is a technical requirement for building a robust, tactical game environment.

## 1. The Observability Architecture

Phalanx Duel uses a three-tier "Triad of Observability" to ensure technical health and product growth while maintaining player privacy.

### Tier 1: Forensic Health (Sentry)
*   **Purpose**: Debugging and engine performance.
*   **Ethical Rationale**: Technical failures disrupt the tactical integrity of the game. We use high-fidelity monitoring (Profiling and Session Replays) to ensure that logic errors in the game engine are identified and resolved immediately.
*   **Data Handling**: During prelaunch, we unmask UI elements in replays to see card data. This is a deliberate choice to allow "over-the-shoulder" debugging of complex state transitions.

### Tier 2: Behavioral Context (PostHog)
*   **Purpose**: Product analytics and user journey mapping.
*   **Ethical Rationale**: We must understand *why* players struggle or abandon the game to improve the experience. Linking PostHog to Sentry allows us to correlate a player's intent with the system's technical response.
*   **Data Identity**: We use an anonymous `visitorId` (UUID) to link sessions rather than PII (Personal Identifiable Information) like emails.

### Tier 3: Passive Traffic (GoatCounter)
*   **Purpose**: General web traffic statistics.
*   **Ethical Rationale**: Provides a baseline of traffic data without the use of cookies or tracking scripts for users who prefer maximum privacy.

---

## 2. Data Persistence & Transparency

Phalanx Duel is designed with a "Lobby-First" philosophy. We persist only what is necessary to maintain game state and continuity.

### Local Persistence (Browser)
| Key | Usage | Duration |
| :--- | :--- | :--- |
| `phalanx_visitor_id` | Cross-visit identification for support and analytics. | Permanent (until cleared) |
| `phalanx_session` | Active match ID and chosen player name for reconnection. | Permanent (until cleared) |
| `phalanx_damage_mode` | User preference for game rules. | Permanent (until cleared) |

### Server Persistence
*   **Transient State**: Active matches are kept in memory.
*   **Replays**: Game histories are stored as JSON blobs. We do not store "profiles" in a traditional database; we store "actions" that occurred within a match.

---

## 3. The Phalanx Duel Ethical Mandates

All future technical decisions must be evaluated against these three mandates:

### I. Integrity as a Technical Standard
A game of strategy requires a level playing field. Any tool added to the project must support the detection of engine exploits or win-trading without compromising the anonymity of the players.

### II. Data Minimization
If a feature can function without a backend database or a cookie, it must remain local. We prefer `localStorage` over cookies and in-memory validation over permanent storage for transient match data.

### III. The "Right to Vanish"
Players have the right to reset their identity. Because we use a decentralized identity model (localStorage UUIDs), a player can "vanish" from our persistent tracking by simply clearing their browser site data. We will not attempt to bypass this via advanced fingerprinting.

---

## 4. Code of Conduct

### For Players
*   **Tactical Integrity**: Exploiting bugs discovered via engine analysis is discouraged. Report them via the feedback widget instead.
*   **Respect the Phalanx Duel**: Harassment or abusive names in the lobby are a violation of the "strategy-first" environment.

### For Developers
*   **Transparency First**: Any change to what data is collected or how it is masked must be documented here.
*   **No PII Leakage**: Never commit secrets, and never log sensitive user data to stdout or external collectors.
*   **Architectural Honesty**: Do not build "dark patterns" designed to keep users engaged through psychological manipulation. Phalanx Duel wins through strategy, not addiction.

---

## 5. Verification Checklist for New Features
When adding a new feature or tool, ask:
1. Does this require new data collection?
2. Can this be achieved using the existing `visitorId`?
3. Does this introduce a "Dark Pattern"?
4. If this tool fails, does it degrade the player's privacy?

*Last Updated: February 20, 2026*
