# Security Strategy and Threat Model

This document defines the formal security strategy, threat model, and defensive posture for the Phalanx Duel project. It follows the **STRIDE** model to identify risks and mandates specific mitigations for all components (`client`, `server`, `engine`, `shared`).

---

## 1. Core Security Principles

1. Server-Authoritative: The `engine` is the only source of truth for rules. Clients send intents (`Action`); the server validates and broadcasts state.
2. Information Redaction (Fog of War): Hidden state (hands, drawpiles, face-down cards) must be redacted at the server boundary before transmission or persistence to public-facing APIs.
3. Deterministic Integrity: Every state change must be signed by a hash. Replayability ensures that tampering is detectable.
4. Defense in Depth: Multiple layers of validation (Schema -> State Machine -> Rule Engine) must protect the game state.

---

## 2. Threat Model (STRIDE)

### 2.1 Spoofing (Identity/Auth)

* Threat: An attacker impersonates a player to join a match or perform actions as them.
* Mitigation:
  * JWT-based session management for registered users.
  * WebSocket connections are bound to a specific `playerId` and `matchId` upon joining.
  * Actions are rejected if the `playerId` of the socket does not match the `activePlayerIndex` of the match.
* Status: **IMPLEMENTED**.

### 2.2 Tampering (Data Integrity)

* Threat: An attacker modifies the game state or sends illegal actions to gain an advantage.
* Mitigation:
  * **Zod Validation**: All incoming messages are validated against strict schemas in `shared/src/schema.ts`.
  * **State Machine Hardening**: Actions are rejected if they do not correspond to a valid edge in the `STATE_MACHINE` graph for the current phase.
  * **Rule Engine Validation**: `engine/src/turns.ts` validates every action against the current state before applying changes.
* Status: **IMPLEMENTED** (Verified with 100% transition coverage).

### 2.3 Repudiation (Audit/Logging)

* Threat: A player claims they did not perform an action, or a match outcome is disputed.
* Mitigation:
  * **Transaction Log**: Every action is recorded in the `transactionLog` with `stateHashBefore` and `stateHashAfter`.
  * **Match Event Log**: A flattened, human-readable event log is persisted for every match.
* Status: **IMPLEMENTED**.

### 2.4 Information Disclosure (Fog of War)

* Threat: A player or spectator gains access to hidden information (opponent's hand, deck contents, or face-down cards).
* Mitigation:
  * **Live Redaction**: `filterStateForPlayer` and `filterStateForSpectator` in `server/src/match.ts` redact sensitive fields before broadcasting.
  * **Vulnerability (FIXED)**: The public Match Log API (`/matches/:id/log`) served unredacted events derived from the raw transaction log.
* Status: **IMPLEMENTED**.

### 2.5 Denial of Service (DoS)

* Threat: An attacker crashes the server or exhausts resources by flooding it with requests or large payloads.
* Mitigation:
  * **Rate Limiting**: Fastify `rate-limit` (100 req/min) and custom WebSocket sliding windows (10 msg/sec).
  * **Payload Limits**: Strict 10KB limit on WebSocket messages and schema-based rejection of malformed objects.
  * **Connection Limits**: Enforced maximum of 10 concurrent WebSocket connections per IP address.
  * **Resource Management**: Stale match cleanup (stale matches removed after 10 minutes of inactivity) and server-side heartbeats (ping/pong) to prune dead connections every 30 seconds.
* Status: **IMPLEMENTED**.

### 2.7 Cross-Site WebSocket Hijacking (CSWSH)

* Threat: A malicious site establishes a WebSocket connection to the Phalanx server using the victim's session cookies.
* Mitigation:
  * **Strict Origin Validation**: The server rejects WebSocket handshakes that missing the `Origin` header (in production) or provide an origin not in the explicit allowlist.
  * **SameSite Cookies**: Session cookies use `SameSite: strict` to prevent browsers from sending them during cross-site upgrade requests.
* Status: **IMPLEMENTED**.

### 2.6 Elevation of Privilege (Admin Access)

* Threat: An attacker gains access to the `/admin` dashboard or sensitive debugging routes.
* Mitigation:
  * **HTTP Basic Auth**: Protected by constant-time comparison (`timingSafeEqual`) and environment-configured credentials.
  * **Environment Gating**: Debugging routes and Sentry toolbars are disabled in production by default.
* Status: **IMPLEMENTED**.

---

## 3. High-Priority Remediation Plan

### 3.1 Log API Redaction (COMPLETE)

The Match Log API has been updated to ensure that events served to non-owners or publicly are redacted consistently with the live game state.
* **Action**: Implemented `redactPhalanxEvents(events)` and `filterEventLogForPublic(log)`.
* **Action**: Applied these filters in the `GET /matches/:id/log` route based on participant identity verification.

### 3.2 Authorization for Match Logs (COMPLETE)

Access to the full event log is now restricted.
* **Action**: Only participants (verified via JWT or `X-Phalanx-Player-Id`) see the full, unredacted log.
* **Action**: Spectators or anonymous users see the redacted version (card details hidden).

### 3.3 Session Hardening (COMPLETE)

* **Action**: Enforced `JWT_SECRET` in production environments (server fails fast if missing).
* **Action**: Set `HttpOnly`, `Secure` (production), and `SameSite: strict` flags on all session cookies.

---

## 4. Maintenance and Compliance

* **Security Audits**: Run `pnpm audit` weekly (enforced in CI).
* **Action Pinning**: All GitHub Actions must be pinned to commit SHAs.
* **Dependency Policy**: No new dependencies without vulnerability review.
