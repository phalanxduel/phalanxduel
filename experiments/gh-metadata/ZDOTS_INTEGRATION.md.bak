# Zdots System Integration Guide

This document outlines how to integrate the GitHub metadata experiment into the broader `zdots` ecosystem.

## 1. Knowledge Layer Ingestion (`zdots-ctx`)
Once the "Context Cohorts" or "Process Latency" metrics are derived in DuckDB, they should be captured into the system-wide knowledge base.

**Command Example:**
```bash
# Capture a CSV of authors and their associated areas (labels)
zdots-ctx capture \
  --title "Phalanx Duel: Context Cohorts" \
  --description "Mapping of authors to functional areas based on PR labels" \
  --file experiments/gh-metadata/data/cohorts.csv
```

## 2. Database Migration (DuckDB to Postgres)
The `zdots` system uses a central Postgres database (`my`). For long-term correlation with other services (logs, traces, incidents), the metadata should be mirrored there.

**Connection Info:**
- **URL**: `postgresql://zdots_rw@/my` (from `ZDOTS_DATABASE_URL`)
- **Explore**: `psql -U zdots_ro my`

**Migration Strategy:**
Use DuckDB's `postgres` extension to push tables directly:
```sql
-- In DuckDB
INSTALL postgres;
LOAD postgres;
ATTACH 'dbname=my user=zdots_rw' AS zdots_pg (TYPE postgres);

-- Mirror the PRs table
CREATE TABLE zdots_pg.gh_prs AS SELECT * FROM prs;
```

## 3. Observability & Tracing
If the harvesting process becomes a scheduled task (e.g., via `zsvc`), use the local OTEL collector to monitor API performance.

- **OTLP Endpoint**: `http://127.0.0.1:4318`
- **Visualization**: `http://127.0.0.1:5080` (OpenObserve)

## 4. AI-Powered Analysis
The `zdots` system includes a local `llama.cpp` server and `ai-query`. You can use these to perform qualitative analysis on the captured metadata.

**Example:**
```bash
# Ask the local AI about the bus factor in the Engine area
ai-query "Given the following PR data: $(cat experiments/gh-metadata/data/engine_prs.json), who are the primary context holders for the Combat Resolution logic?"
```
