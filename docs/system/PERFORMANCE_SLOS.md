# Performance Targets and Service Level Objectives (SLOs)

This document defines the formal performance targets and reliability goals for the Phalanx Duel system. These targets anchor our load testing, architectural decisions, and operational priorities.

---

## 1. Gameplay Responsiveness (Latency)

Competitive integrity depends on a predictable, high-speed feedback loop between player intent and state confirmation.

| Metric | Target (p50) | Target (p95) | SLO Goal | Data Source |
| :--- | :--- | :--- | :--- | :--- |
| **Engine Turn Application** | < 20ms | < 100ms | 99% | `game.action.duration` (OTel) |
| **Lobby Match Creation** | < 100ms | < 500ms | 95% | `http.server.duration` (OTel) |
| **State Broadcast (End-to-End)** | < 200ms | < 1s | 90% | OTLP traces plus structured logs |

### 1.1 Degraded Network Policy
On mobile or high-jitter networks (3G/LTE), the engine remains deterministic.
*   **Target**: State must sync within 3 seconds even under 10% packet loss.
*   **Requirement**: Client must show "Connection Warning" if latency exceeds 2 seconds.

---

## 2. System Availability

Reliability targets for the Phalanx Duel platform.

| Service | SLO | Definition |
| :--- | :--- | :--- |
| **Lobby & API** | 99.9% | Successfully handles `GET /health` and `/ready`. |
| **Match Engine (WS)** | 99.5% | WebSocket handshakes succeed and maintain a 30s heartbeat. |
| **Persistence (Postgres)** | 99.9% | Queries to `matches` and `transaction_logs` succeed. |

---

## 3. Scalability & Throughput

Baseline capacity targets for the v1.0 release.

| Dimension | Baseline Target | Stress Target |
| :--- | :--- | :--- |
| **Concurrent Matches** | 50 | 500 |
| **Active Spectators** | 200 (Total) | 1,000 (Total) |
| **Match Creation Rate** | 1 / second | 10 / second |

---

## 4. Error Budgets & Policy

*   **Calculation**: SLO compliance is calculated over a rolling 30-day window.
*   **Breach Policy**: If the error budget for any SLO is exhausted (< 10% remaining), **Security and Reliability tasks take absolute priority** over new gameplay features.
*   **Triage**: Any p99 latency spike > 5s triggers immediate investigation in
    the centralized LGTM dashboards and traces.

---

## 5. Continuous Verification

*   **Load Testing**: Baseline runs (TASK-62) must verify the system can handle the **Stress Target** without breaching SLOs.
*   **Regressions**: CI/CD will block deployments if unit test suites exceed a 5-minute execution time (developer experience budget).
