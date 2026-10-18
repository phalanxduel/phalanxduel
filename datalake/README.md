# Phalanx Duel Multi-Repository Engineering Datalake

A local, high-performance columnar datalake and analytics engine powered by **DuckDB** and **Apache Parquet**. It ingests, normalizes, and materializes development history, code churn, tasks, architectural decisions, and dependencies across all repositories in the `phalanxduel` organization.

---

## 🏛️ Medallion Architecture

```text
                    ┌────────────────────────────────────────────────────────┐
                    │            Repositories in Purview (8 Repos)           │
                    │  game · site · wiki · game-swiftui · monitor · archive │
                    └───────────────────────────┬────────────────────────────┘
                                                │
                                                ▼ [Extraction]
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🥉 BRONZE LAYER (Raw Semi-Structured Extracts)                                                  │
│   • data/bronze/commits.jsonl           • data/bronze/file_churn.jsonl                          │
│   • data/bronze/tasks.jsonl             • data/bronze/adrs.jsonl                                │
│   • data/bronze/tags.jsonl              • data/bronze/dependencies.jsonl                        │
│   • data/bronze/github_metadata.json                                                            │
└───────────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                                │
                                                ▼ [DuckDB Columnar Parquet Ingestion]
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🥈 SILVER LAYER (Cleaned & Typed Columnar Parquet Tables)                                       │
│   • data/silver/commits.parquet         • data/silver/file_churn.parquet                        │
│   • data/silver/tasks.parquet           • data/silver/adrs.parquet                              │
│   • data/silver/tags.parquet            • data/silver/repositories.parquet                      │
│   • data/silver/dependencies.parquet                                                            │
└───────────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                                │
                                                ▼ [Materialization & Dimensional Aggregation]
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🥇 GOLD LAYER (DuckDB Analytical Engine & Materialized Views)                                    │
│   • data/gold/phalanx_datalake.duckdb                                                           │
│     - gold_org_summary                  - gold_monthly_velocity                                 │
│     - gold_subsystem_churn              - gold_contributor_matrix                               │
│     - gold_commit_type_distribution     - silver_* (relational views over Parquet)              │
│   • reports/DATALAKE_REPORT.md          - Auto-generated comprehensive analytical summary       │
│   • data/gold/datalake_catalog.json     - Machine-readable catalog metadata                     │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Quickstart & CLI Usage

The datalake is operated via `bin/phx-datalake` or `pnpm datalake:*`:

### 1. Build & Ingest the Datalake
Extracts the full git history, tasks, ADRs, and dependencies across all repositories, builds the Silver Parquet tables, and compiles the Gold DuckDB database in ~6 seconds:
```bash
bin/phx-datalake build
# or: pnpm datalake:build
```

### 2. View Summary KPIs
```bash
bin/phx-datalake summary
```

### 3. List Available Tables and Views
```bash
bin/phx-datalake tables
```

### 4. Execute Ad-Hoc SQL Queries
Run arbitrary analytical queries with instant terminal formatting:
```bash
# Query monthly commit velocity
bin/phx-datalake query "SELECT * FROM gold_monthly_velocity LIMIT 10"

# Output as JSON
bin/phx-datalake query "SELECT repo_name, COUNT(*) AS count FROM silver_commits GROUP BY repo_name" --json

# Output as CSV
bin/phx-datalake query "SELECT * FROM gold_subsystem_churn" --csv
```

### 5. Launch Interactive DuckDB Shell
Launches the full interactive DuckDB CLI directly attached to `phalanx_datalake.duckdb`:
```bash
bin/phx-datalake shell
```

### 6. Read the Automated Analytics Report
```bash
bin/phx-datalake report
```

---

## 📊 Pre-Packaged SQL Queries

The `datalake/queries/` directory provides pre-written analytical models:

- `datalake/queries/repo_velocity.sql`: Longitudinal commit and line growth velocity.
- `datalake/queries/subsystem_churn.sql`: Code churn breakdown across engine, server, client, shared, CLI, and ops.
- `datalake/queries/task_delivery.sql`: Backlog task completion rate and priority matrix.

---

## 🔒 Storage & Git Policy

All raw binary Parquet tables, DuckDB files, and JSONL staging files in `datalake/data/` are gitignored to preserve clean working trees. The ingestion pipeline can be re-run at any time to recreate the entire datalake deterministically in seconds.
