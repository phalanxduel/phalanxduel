# Security Knowledge Base and Reference Index

This document aggregates industry-standard security recommendations, compliance cheat sheets, and technical papers used to harden the Phalanx Duel system.

---

## 1. WebSocket Security (Transport & Protocol)

The Phalanx system uses WebSockets for real-time game state synchronization. We adhere to the **OWASP WebSocket Security Cheat Sheet** and related industry standards.

### 1.1 Core References
*   **[OWASP WebSocket Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html)**: Primary guide for handshake validation, origin checks, and DoS prevention.
*   **[RFC 6455 (The WebSocket Protocol)](https://datatracker.ietf.org/doc/html/rfc6455)**: Section 10 (Security Considerations).
*   **[Mozilla Observatory (WebSocket Guide)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#security_considerations)**: Guidance on secure `wss://` implementation.

### 1.2 Implemented Controls
*   **Strict Origin Validation**: Handshakes are rejected if the `Origin` header is missing or not in the explicit allowlist (implemented in `TASK-76`).
*   **CSWSH Mitigation**: Enforced `SameSite: strict` on session cookies to prevent cross-site upgrade requests.
*   **Message Rate Limiting**: Sliding window limits (10 msgs/sec) to prevent flooding (implemented in `app.ts`).
*   **Payload Gating**: Strict 10KB message size limit verified at the buffer level.
*   **Zombie Pruning**: 30-second server-side heartbeats (Ping/Pong) to terminate dead connections.

---

## 2. Server-Authoritative Game Security

The Phalanx system follows a "Dumb Client / Smart Server" model to prevent cheating and state manipulation.

### 2.1 Core References
*   **[Valve: Source Multiplayer Networking](https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking)**: The foundational paper on authoritative servers and lag compensation.
*   **[Gabriel Gambetta: Fast-Paced Multiplayer](https://www.gabrielgambetta.com/client-server-game-architecture.html)**: Excellent series on authoritative movement and action validation.
*   **[Anti-Cheat PD: Game Security Principles](https://anticheatpd.com/resources/)**: Modern techniques for detecting automated inputs and state tampering.

### 2.2 Implemented Controls
*   **Rule Engine Isolation**: All game logic resides in the `engine` package; the client only suggests intents.
*   **Area of Interest (AoI) Culling**: Fog of War implementation ensures the server only sends data the client is authorized to see (implemented in `TASK-75`).
*   **Deterministic Hash Chaining**: Every state transition is signed by a hash of the total state, preventing memory manipulation or "ghost actions" (implemented in `TASK-2`).

---

## 3. Replay and Log Integrity

Maintaining a trustworthy audit trail is critical for competitive integrity and dispute resolution.

### 3.1 Core References
*   **[Cloudflare: Securing the Chain of Trust](https://www.cloudflare.com/learning/security/what-is-the-chain-of-trust/)**: Concepts applied to hash-chained game logs.
*   **[OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Vocabulary_Cheat_Sheet.html)**: Best practices for immutable, tamper-evident logs.

### 3.2 Implemented Controls
*   **Immutable Transaction Log**: Every action is persisted with `stateHashBefore` and `stateHashAfter`.
*   **Public Log Redaction**: Information disclosure protection for public-facing event logs (implemented in `TASK-29`).
*   **Deterministic Replayability**: `replayGame` utility verifies the hash chain of any match to ensure no steps were skipped or altered.

---

## 4. Continuous Hardening Workflow

*   **Dependency Audits**: Weekly `pnpm audit` and `Trivy` scans (implemented in `TASK-55` and `TASK-63`).
*   **Action Pinning**: All GitHub Actions pinned to immutable commit SHAs.
*   **Secret Masking**: Unified secret management prevents leakage into logs or image layers (implemented in `TASK-74`).
