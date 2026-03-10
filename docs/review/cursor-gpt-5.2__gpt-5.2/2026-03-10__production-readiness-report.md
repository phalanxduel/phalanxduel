# Phalanx Duel — Production Readiness Review (Cursor Agent, GPT‑5.2)

**Reviewer:** Cursor AI coding agent (“cursor-gpt-5.2”)  
**Model(s) utilized:** GPT‑5.2  
**Date:** 2026-03-10  
**Repository:** `phalanxduel/game` (TypeScript monorepo: `shared/`, `engine/`, `server/`, `client/`)  
**Method:** Targeted static review of rules + architecture docs + selected engine/server code + tests + CI config.  
**Important note:** Where I did not directly verify something in code/config/tests, I mark it as **`insufficient_evidence`**.

---

## 1. Executive Assessment

### Overall judgment
**Conditionally ready for limited production**.

This repository is unusually well-shaped for a deterministic competitive game: it has a canonical rules spec (`docs/RULES.md`), a deliberately pure engine (`engine/`), an authoritative server with validation + replay endpoint (`server/`), strong CI gates (lint/typecheck/build/test/schema/rules checks), and explicit observability hooks.

The biggest production risks I see are (a) **operational maturity gaps** (runbooks, backups/restore, scaling model for websockets + in-memory match state), (b) **audit log / event model maturity** (the rules spec discusses a span-based event model; the implementation appears centered on a transaction log + state hashes and Pino/OTel telemetry—alignment needs to be made explicit), and (c) **container hardening** (runtime image runs as root).

### Top 5 risks that most threaten success
1. **Runtime container hardening**: Docker runtime stage has no `USER` directive → runs as root (`Dockerfile`).  
2. **Operational readiness and scaling uncertainty**: server holds match state in-process and uses websockets; scaling/HA strategy and incident runbooks are not evident (**insufficient_evidence** for a documented plan).  
3. **Event/audit model alignment**: spec emphasizes span-based event model; implementation evidence centers on transaction log entries + hashes + telemetry. Risk of drift/ambiguity about what is “canonical match truth.”  
4. **Replay/audit determinism of metadata**: replay mechanism injects a `system:init` action with `new Date().toISOString()` in engine replay (`engine/src/replay.ts`). Hashes exclude transaction log, so outcomes can still be deterministic, but canonical logs/metadata can diverge across replays unless normalized.  
5. **Secrets/config posture for production**: `JWT_SECRET` has a development fallback (`server/src/app.ts`). That’s fine for dev/test, but production safety depends on deployment configuration enforcement (**insufficient_evidence** that production deploy rejects unset secret).

---

## 2. Architecture and System Boundaries

**Evidence:**
- Monorepo structure and package roles in `README.md`
- Architecture doc: `docs/system/ARCHITECTURE.md`
- Engine exports: `engine/src/index.ts`
- Server app entry: `server/src/app.ts`

### Findings
- **Clear separation of concerns**:
  - **Rules/spec**: canonical and explicit in `docs/RULES.md`.
  - **Engine/domain**: pure functions, no I/O, explicit replay API (`engine/src/index.ts`, `engine/src/replay.ts`).
  - **Server/transport**: Fastify + WebSocket routing and validation, plus replay endpoint (`server/src/app.ts`).
  - **Shared contracts**: Zod schemas and hashing utilities in `shared/` (see `README.md` + `server/src/app.ts` import `computeStateHash`).
- **Single-source-of-truth intent is strong**: Architecture doc states server authoritative; client sends intents and renders state (`docs/system/ARCHITECTURE.md`).

### Risks / recommendations
- **Risk:** unclear boundary between “canonical event history” and “telemetry/logging.” The system logs `game_action` entries via Pino and emits OTel spans (`server/src/app.ts`), while the rules spec describes a span-based event model (see `docs/RULES.md`, “Structured Event Model (Span-based)” in preamble).  
  - **Recommendation:** explicitly document what is canonical: likely **transaction log + action history + state hashes**; and clearly separate it from telemetry (OTel/Pino). If the “span-based” model is intended as canonical, ensure persistence format matches or explicitly declare it aspirational.

---

## 3. Determinism and Rule Fidelity

**Evidence:**
- Rules determinism framing and card ID scheme: `docs/RULES.md` (sections 2.1, 4)
- Engine determinism/replay: `engine/src/replay.ts`, `engine/src/turns.ts`
- Deterministic state hashing: `shared/src/hash.ts`

### Findings
- **Deterministic hashing approach is sound**: `computeStateHash` sorts object keys recursively and hashes JSON (`shared/src/hash.ts`). This prevents nondeterminism from key order.
- **Engine transition model is explicit**: `applyAction` validates then transitions via a state machine and records `phaseTrace` in the transaction log (`engine/src/turns.ts`).
- **Replay is first-class**: `replayGame(config, actions, { hashFn })` exists (`engine/src/replay.ts`) and the server exposes `GET /matches/:matchId/replay` which calls engine replay with `computeStateHash` (`server/src/app.ts`).

### Risks / recommendations
- **Risk (audit metadata determinism):** replay injects `system:init` with `timestamp: new Date().toISOString()` (`engine/src/replay.ts`). Hashing excludes transaction log (per architecture intent), so this likely won’t affect `stateHash*`, but it can cause **canonical log entries** to differ between original play and replay.  
  - **Recommendation:** make replay use a deterministic timestamp source (e.g., config `drawTimestamp`, match creation timestamp, or first action timestamp) for system actions, or explicitly state that system-init timestamps are non-canonical.
- **Rule fidelity confidence:** high in shape, but full fidelity requires systematic mapping from spec sections to tests (some exists; see section 5). Any drift between `docs/RULES.md` and engine/server behavior should be treated as production risk.

---

## 4. Event Model, Logging, Replay, and Auditability

**Evidence:**
- Transaction log described in `docs/system/ARCHITECTURE.md`
- Transaction log entry creation in `engine/src/turns.ts`
- Server logs `game_action` including `stateHash` (`server/src/app.ts`)
- Replay endpoint protected by Basic Auth (`server/src/app.ts`, `server/tests/replay.test.ts`)

### Findings
- **Replay/audit mechanism exists and is protected**: `GET /matches/:matchId/replay` requires Basic Auth, tested in `server/tests/replay.test.ts`.
- **Canonical-ish transaction log exists in engine**: `applyAction` appends `TransactionLogEntry` with `sequenceNumber`, `action`, `stateHashBefore/After`, `timestamp`, `details`, `phaseTrace` (`engine/src/turns.ts`).
- **Operational telemetry is present**: OTel spans and metrics exist (`server/src/app.ts`), and game actions are logged to Pino with hashes (`server/src/app.ts`).

### Risks / recommendations
- **Risk:** event versioning strategy is not clearly enforced in code. There is a `specVersion: "1.0"` in the rules spec; I did not confirm a strict runtime gate beyond schemas (**insufficient_evidence**).  
  - **Recommendation:** add an explicit `specVersion` check at match creation and enforce it in persistence/replay; include `eventSchemaVersion` (or equivalent) in persisted match records.
- **Risk:** boundary between audit log and telemetry could blur for operators.  
  - **Recommendation:** define a canonical “match record” envelope: `{ specVersion, matchParams, rngSeed, drawTimestamp, actions[], stateHashAfterEachTurn[] }` (or similar) and ensure it’s what is persisted/exportable; treat Pino/OTel as non-canonical.

---

## 5. Test Strategy and Correctness Guarantees

**Evidence:**
- Engine tests present: `engine/tests/*` including replay and FSM fixtures
- Server tests present: `server/tests/*` including ws, replay auth, openapi snapshot, hardening
- CI runs: lint/typecheck/build/test/schema/rules checks (`.github/workflows/ci.yml`)

### Findings
- **Engine tests are meaningfully domain-oriented**: e.g. `engine/tests/replay.test.ts`, `engine/tests/state-machine.test.ts`, `engine/tests/facecard.test.ts`, `engine/tests/pass-rules.test.ts`, plus FSM trace fixtures. This is the right direction for a deterministic rules engine.
- **Server tests include hardening and protocol surfaces**: e.g. `server/tests/ws.test.ts`, `server/tests/hardening.test.ts`, `server/tests/replay.test.ts`, `server/tests/openapi.test.ts`.
- **CI includes nontrivial gates**: `pnpm schema:check` and `pnpm rules:check` are particularly relevant for drift prevention (`.github/workflows/ci.yml`).

### Gaps / recommendations
- **Golden replay fixtures**: I saw fixtures for phase trace, and replay tests that validate behavior; I did not confirm an end-to-end “play → persist → replay → compare hashes” invariant across server persistence (**insufficient_evidence**).  
  - **Recommendation:** add a canonical match transcript fixture suite: store action history + expected per-turn hashes + expected final hash, and run it in CI in both engine and server layers.
- **Invalid/malformed action fuzzing**: some defensive tests exist (`server/tests/hardening.test.ts`), but systematic fuzzing/property-based testing is not confirmed (**insufficient_evidence**).  
  - **Recommendation:** add property tests around determinism (same inputs → same outputs), schema rejection, and “no hidden information leakage” constraints for spectator/player filters.

---

## 6. Documentation as a Production Asset

**Evidence:** `README.md`, `docs/RULES.md`, `docs/system/ARCHITECTURE.md`, `SECURITY.md`

### Findings
- **Rules are easy to find and explicitly canonical**: `README.md` points to `docs/RULES.md`.
- **Architecture is documented** with boundaries and replay hashing model (`docs/system/ARCHITECTURE.md`).
- **Security policy exists** and emphasizes CI supply-chain hygiene (pinned GitHub Actions) (`SECURITY.md`).

### Gaps / recommendations
- **Operational runbook**: deploy/rollback/backup/incident response docs are not evident (**insufficient_evidence**).  
  - **Recommendation:** add `docs/ops/RUNBOOK.md` covering deploy, config, incident triage, replay dispute procedure, and DB restore steps.
- **Event model documentation alignment**: clarify whether span-based event model in rules is implemented or aspirational; reduce ambiguity.

---

## 7. Code Quality and Maintainability

**Evidence:** sampled engine/server code and tests (see above).

### Findings
- **Engine API is compact and explicit** (`engine/src/index.ts`).
- **Shared hashing is small and deterministic** (`shared/src/hash.ts`).
- **Server has pragmatic hardening** (origin allowlist, rate limiting, message size limit, JSON schema validation) (`server/src/app.ts`).

### Risks / recommendations
- **Risk:** Server contains many concerns in `server/src/app.ts` (auth, helmet CSP, rate limiting, ws protocol, routes). This may become a maintainability hotspot as features grow.  
  - **Recommendation:** keep extracting cohesive modules (ws handler, auth policy, admin endpoints, match routes) and maintain a “threat model / trust boundaries” doc that matches the code layout.

---

## 8. Operational Readiness

**Evidence:** `Dockerfile`, `fly.toml` (presence), server health endpoint, telemetry setup in `README.md` and server code, CI workflow.

### Findings
- **Deployability exists**: Docker multi-stage build builds all packages and runs server (`Dockerfile`).
- **Health endpoint exists**: `/health` returns version, uptime, memory, and observability flags (`server/src/app.ts`).
- **Observability is intentionally supported**: local OTLP collector instructions and OTel plumbing (`README.md`, `server/src/app.ts`).
- **Rate limiting exists**: global HTTP rate limit + per-socket message rate limiting (`server/src/app.ts`).

### Gaps / recommendations
- **Root container**: runtime stage runs as root (no `USER`) (`Dockerfile`).  
  - **Recommendation:** add a non-root user in runtime stage and set `USER`. This is a pre-production hardening baseline.
- **Scaling/HA story** for in-memory match manager is not documented (**insufficient_evidence**).  
  - **Recommendation:** document whether production is single-instance, or requires sticky sessions + externalized state, and what happens on restart (match recovery from DB, etc.).
- **Backups/migrations/rollback**: no runbook evidence (**insufficient_evidence**).  
  - **Recommendation:** document DB backup/restore, migration procedures, and a rollback plan.

---

## 9. Security and Fair Play Considerations

**Evidence:** `server/src/app.ts`, spectator/player filtering in `server/src/match.ts`, `SECURITY.md`.

### Findings
- **Client/server trust boundary is addressed**:
  - Server validates and applies actions (MatchManager pattern; details partially inspected in `server/src/match.ts`).
  - WebSocket origin validation allowlist exists (`server/src/app.ts`).
  - Message size limit, schema validation (`ClientMessageSchema.safeParse`), and rate limiting exist (`server/src/app.ts`).
  - Spectator/player state redaction exists (`filterStateForSpectator`, `filterStateForPlayer` in `server/src/match.ts`).
- **Replay endpoint protected** with Basic Auth + timing-safe comparison (`server/src/app.ts`, `server/tests/replay.test.ts`).

### Risks / recommendations
- **JWT secret dev fallback**: `fastifyJwt` uses `process.env['JWT_SECRET'] || 'phalanx-dev-secret'` (`server/src/app.ts`).  
  - **Recommendation:** fail fast in production if `JWT_SECRET` is unset.
- **Fair-play integrity beyond validation** (bot detection, anomaly detection, dispute workflows) is not evident (**insufficient_evidence**).  
  - **Recommendation:** define a minimal dispute and adjudication process: “how to verify a match,” “how to export match record,” and “what constitutes evidence.”

---

## 10. Product and Contributor Readiness

**Evidence:** `README.md`, `CONTRIBUTING.md` (exists), docs structure, test/CI posture.

### Findings
- **Project communicates seriousness**: canonical rules, architecture doc, CI checks, security policy.
- **First-run experience** is straightforward (`pnpm install`, `pnpm test`, dev server/client commands in README).

### Gaps / recommendations
- **Contributor guide is minimal** (`CONTRIBUTING.md` is small; I did not evaluate its completeness beyond presence — **insufficient_evidence**).  
  - **Recommendation:** expand contributor onboarding: repo layout, how to add a rule, how to add a golden fixture, how to run replay verification locally, and how to interpret “rules:check”.

---

## 11. Production Readiness Scorecard (1–5)

For each low score, I include what would move it up by one level.

- **Architecture clarity:** **5**  
  - Move to 5→(already 5): maintain as features grow; keep boundaries enforced.
- **Determinism confidence:** **4**  
  - To reach 5: add end-to-end golden replay fixtures that assert per-turn hashes across engine+server persistence; normalize replay metadata timestamps.
- **Rule fidelity confidence:** **4**  
  - To reach 5: explicit mapping from spec sections to tests/fixtures (traceability table); automated drift checks beyond current `rules:check` (**insufficient_evidence** of full mapping).
- **Replay/audit readiness:** **4**  
  - To reach 5: clear canonical match record export + versioning strategy + operator-friendly verification tooling.
- **Test maturity:** **4**  
  - To reach 5: more golden fixtures + property tests/fuzzing for malformed actions and determinism invariants.
- **Documentation quality:** **4**  
  - To reach 5: add ops runbook + clarify canonical event model vs telemetry.
- **Operational readiness:** **3**  
  - To reach 4: non-root container, production config enforcement (secrets), runbook, backup/restore docs.  
- **Security/fair-play posture:** **4**  
  - To reach 5: threat model + production secret enforcement + match integrity export/signing strategy (if needed) + abuse monitoring plan.
- **Maintainability:** **4**  
  - To reach 5: keep server composition modular (avoid “god” app file), strengthen typed boundaries and invariants where possible.
- **Onboarding clarity:** **4**  
  - To reach 5: expand contributor docs and provide “first PR” pathways plus architecture walk-throughs.

---

## 12. Concrete Deliverables

### Top 10 observations
1. Canonical rules spec exists and is clearly signposted: `docs/RULES.md` (linked from `README.md`).
2. Server-authoritative design is explicit: `docs/system/ARCHITECTURE.md`, `server/src/app.ts`.
3. Engine exports a pure deterministic API including `replayGame`: `engine/src/index.ts`, `engine/src/replay.ts`.
4. Deterministic hashing uses sorted-key JSON and SHA-256: `shared/src/hash.ts`.
5. Transaction log entries include state hashes and phase trace: `engine/src/turns.ts`.
6. Server exposes replay validation endpoint behind Basic Auth: `server/src/app.ts`, `server/tests/replay.test.ts`.
7. WebSocket hardening exists (origin allowlist, message size limit, schema validation, per-socket rate limiting): `server/src/app.ts`.
8. CI is strong and includes schema and rules consistency checks: `.github/workflows/ci.yml`.
9. Observability is treated as a first-class dev/prod concern (OTel, Sentry toggles, collector configs): `README.md`, `server/src/app.ts`.
10. Docker build is multi-stage and uses build secrets for Sentry auth token, but runtime runs as root: `Dockerfile`.

### Top 10 recommendations
1. **Run server as non-root** in Docker runtime stage (`Dockerfile`): add user/group and `USER`.
2. **Add golden replay fixtures** with expected per-turn and final hashes; run in CI across engine and server.
3. **Normalize replay metadata timestamps** (avoid `new Date()` inside replay) or clearly define what metadata is non-canonical.
4. **Document and enforce event/versioning strategy** (`specVersion`, future schema versions) for replay compatibility.
5. **Write an ops runbook**: deploy, config, monitoring, incident response, replay dispute procedure.
6. **Enforce production secrets**: fail fast if `JWT_SECRET` is unset in production.
7. **Clarify canonical event history vs telemetry** in docs: transaction log/action history vs OTel/Pino.
8. **Scaling plan** for websockets + in-memory state: single instance vs HA; sticky sessions; crash recovery expectations.
9. **Property tests/fuzzing** for malformed actions, determinism invariants, and information redaction.
10. **Contributor onboarding expansion**: “how to change a rule safely” + “how to add a fixture” + “how to run verification.”

### Critical blockers before production
1. **Container runs as root** (`Dockerfile` runtime stage).  
2. **Production secret enforcement**: ensure no dev fallback secrets in production (e.g., `JWT_SECRET` fallback) (`server/src/app.ts`).  
3. **Canonical replay verification gates**: add golden replay fixtures to make determinism/audit claims enforceable in CI (current tests are good, but this is the production-grade bar).

### What is surprisingly strong
- The repo treats determinism and replay as core, with hashing, replay endpoint, and state-machine trace fixtures (`shared/src/hash.ts`, `engine/tests/*`, `server/tests/*`, `.github/workflows/ci.yml`).
- WebSocket hardening and operational attention (helmet CSP, origin allowlist, rate limiting, payload limits) are already present (`server/src/app.ts`).

### What can wait until after launch
- Advanced fair-play monitoring (anomaly detection, automated match flagging) (**insufficient_evidence** of current need/scale).
- Formal cryptographic signing of match records (depends on threat model; may be overkill for initial limited production).
- Admin dashboards beyond current basics (some admin endpoints exist; scaling them can be iterative).

### Suggested remediation sequence (priority order)
1. Docker runtime non-root + basic container hardening.
2. Enforce production secret requirements (no fallback JWT secret in prod).
3. Golden replay fixtures + CI verification of per-turn/final hashes.
4. Document canonical match record format + event/versioning strategy.
5. Ops runbook (deploy/rollback/backups/incident handling + dispute procedure).
6. Scale/HA plan for websockets + in-memory match state; validate crash recovery.
7. Property tests/fuzzing for invalid inputs + determinism invariants; redaction tests.

---

## Final verdict

**Conditionally ready for limited production.** The foundations for a deterministic competitive game are strong (canonical rules, pure engine, authoritative server, replay+hashing, meaningful tests, CI gates). To be comfortable calling it fully production-ready, it needs a small set of operational hardening steps (non-root container, production secret enforcement) and a stronger, automated “golden replay verification” pipeline that turns the determinism/audit promises into continuously enforced guarantees.

