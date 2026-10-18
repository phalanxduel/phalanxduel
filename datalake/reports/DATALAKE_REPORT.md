# Phalanx Duel Multi-Repository Datalake Report

> **Generated at**: `2026-10-18T04:58:13.683881+00:00`  
> **Ingestion Duration**: `6.74s`  
> **Database**: `datalake/data/gold/phalanx_datalake.duckdb` (DuckDB columnar lake)  

---

## 1. Organization Summary KPIs

| Metric | Value |
| --- | --- |
| **Total Repositories Ingested** | `7` |
| **Total Historical Commits** | `2,425` |
| **Unique Contributors** | `2` |
| **Date Span** | `2022-07-10` to `2026-10-18` |
| **Total Lines Added** | `+1,586,321` |
| **Total Lines Deleted** | `-1,004,382` |
| **Tracked Backlog Tasks** | `169` |
| **Architectural Decision Records** | `31` |

---

## 2. Commit Type Distribution (Conventional Commits)

| Conventional Type | Commit Count | Share (%) |
| --- | --- | --- |
| `feat` | 651 | 20.66% |
| `chore` | 621 | 19.71% |
| `other` | 586 | 18.6% |
| `fix` | 503 | 15.96% |
| `docs` | 419 | 13.3% |
| `test` | 71 | 2.25% |
| `refactor` | 59 | 1.87% |
| `backlog` | 53 | 1.68% |

---

## 3. Top Architectural Subsystems by Gross Churn

| Subsystem | Primary Repository | Commits Touched | Gross Churn (Lines) |
| --- | --- | --- | --- |
| `docs` | `game` | 614 | 763,403 |
| `other` | `distributed-ledger` | 730 | 653,484 |
| `root-config` | `game` | 907 | 551,598 |
| `server` | `game` | 472 | 176,832 |
| `client-go-sdk` | `game` | 28 | 98,290 |
| `shared-schema` | `game` | 205 | 79,756 |
| `client-web` | `game` | 466 | 64,193 |
| `backlog` | `game` | 703 | 50,966 |
| `tooling-ops` | `game` | 405 | 48,187 |
| `engine` | `game` | 215 | 34,849 |

---

## 4. Recent Monthly Velocity

| Year-Month | Commits | Lines Added | Lines Deleted | Net Growth |
| --- | --- | --- | --- | --- |
| `2026-10` | 5 | +4,139 | -3,992 | +147 |
| `2026-09` | 154 | +33,271 | -182,049 | -148,778 |
| `2026-08` | 42 | +27,835 | -4,918 | +22,917 |
| `2026-07` | 169 | +314,027 | -58,901 | +255,126 |
| `2026-06` | 123 | +42,047 | -20,183 | +21,864 |
| `2026-05` | 343 | +152,349 | -77,101 | +75,248 |
| `2026-04` | 612 | +152,947 | -79,251 | +73,696 |
| `2026-03` | 1,023 | +314,432 | -413,674 | -99,242 |
| `2026-02` | 621 | +539,407 | -162,739 | +376,668 |
| `2022-10` | 1 | +17 | -11 | +6 |
| `2022-08` | 20 | +1,795 | -1,071 | +724 |
| `2022-07` | 38 | +4,055 | -492 | +3,563 |

---

## 5. Contributor Profile

| Contributor | Commits | First Active | Latest Active |
| --- | --- | --- | --- |
| **Mike Hall** | 2,425 | `2022-07-10` | `2026-10-18` |

---

## 6. How to Query the Datalake

```bash
# Launch interactive DuckDB shell against the datalake
bin/phx-datalake shell

# Run an ad-hoc query
bin/phx-datalake query "SELECT * FROM gold_monthly_velocity ORDER BY commit_count DESC LIMIT 5"

# Re-run datalake extraction & ingestion
bin/phx-datalake build
```
