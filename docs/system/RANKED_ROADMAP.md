# Phalanx Duel — Ranked Play & ELO Roadmap

This document outlines the engineering path to transform Phalanx Duel from a session-based casual game into a competitive ranked platform with persistent player identities, ELO ratings, and verifiable match history.

---

## Phase 1: Game Integrity & Automation (Current)
*Before tracking ranks, we must ensure games are legitimate and deterministic.*

- [x] **PHX-PASS-001: Pass Rule Enforcement**
  - Implement `maxConsecutivePasses` (default 3) and `maxTotalPassesPerPlayer` (default 5).
  - Automatically trigger `victoryType: 'passLimit'` forfeit.
  - *Goal: Prevent infinite stalling in ranked matches.*
- [x] **PHX-AUDIT-001: State Hash Chain**
  - Implement per-turn hashing: `sha256(preState + action + postState)`.
  - Store hash in `TransactionLogEntry`.
  - Add a server-side verification route `/api/matches/:id/verify`.
  - *Goal: Ensure results cannot be forged by client-side manipulation.*

## Phase 2: Persistence & Identity
*Moving from ephemeral memory to a durable database.*

- [ ] **PHX-DB-001: Database Integration**
  - Setup PostgreSQL (via Supabase or Drizzle) to store `users` and `matches`.
  - Schema for `matches`: `id`, `player_1_id`, `player_2_id`, `outcome`, `transaction_log` (JSONB).
- [ ] **PHX-AUTH-001: Player Accounts**
  - Replace "Warrior Name" with a persistent login (JWT-based).
  - Link `playerId` in the engine to a `userId` in the database.
- [ ] **PHX-STATS-001: Basic Tracking**
  - Record Wins/Losses/Forfeits on user profiles.
  - Create a "Match History" UI in the lobby.

## Phase 3: Competitive Mechanics (The Ladder)
*Implementing the ELO algorithm and matchmaking queue.*

- [ ] **PHX-ELO-001: Rating System**
  - Implement standard ELO formula ($R' = R + K(S - E)$).
  - Trigger rating updates upon `gameOver` for "Ranked" match types.
- [ ] **PHX-MATCH-001: Global Matchmaking Queue**
  - Server-side `MatchmakingManager` to hold waiting players.
  - Logic to pair players within a specific ELO delta (e.g., ±100).
  - WebSocket signal to clients when a match is found.
- [ ] **PHX-LEADER-001: Global Leaderboard**
  - Public API and UI to display the top 50 players by ELO.

## Phase 4: Competitive Polish
- [ ] **PHX-REPLAY-001: Replay Viewer**
  - Client-side "Theater" mode that re-runs a `transaction_log` from the DB.
- [ ] **PHX-SEASON-001: Seasonal Resets**
  - Logic to archive ratings and start new seasons.

---

## Execution Order
1. **PHX-PASS-001** (Next Task)
2. **PHX-AUDIT-001**
3. **PHX-DB-001**
4. **PHX-AUTH-001**
5. **PHX-ELO-001**
6. **PHX-MATCH-001**
