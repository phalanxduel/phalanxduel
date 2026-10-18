"""
Phalanx Duel Datalake Builder:
Ingests raw multi-repository data into Bronze JSONL,
compiles Silver Parquet tables, and builds Gold DuckDB analytical views.
"""

import datetime
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List

import duckdb

from .config import discover_repositories
from .extractors import (
    extract_adrs,
    extract_backlog_tasks,
    extract_dependencies,
    extract_git_history,
    extract_github_metadata,
    extract_tags,
)

def build_datalake() -> Dict[str, Any]:
    """Execute the complete medallion datalake pipeline."""
    start_time = time.time()
    current_file = Path(__file__).resolve()
    lake_root = current_file.parents[1]
    game_path = lake_root.parent

    bronze_dir = lake_root / "data" / "bronze"
    silver_dir = lake_root / "data" / "silver"
    gold_dir = lake_root / "data" / "gold"
    reports_dir = lake_root / "reports"

    for d in [bronze_dir, silver_dir, gold_dir, reports_dir]:
        d.mkdir(parents=True, exist_ok=True)

    print("🚀 [1/4] Discovering organization repositories...")
    repos = discover_repositories()
    print(f"  Found {len(repos)} active repositories in purview:")
    for r in repos:
        print(f"   • {r.name:<20} ({r.category}) -> {r.path}")

    # Bronze extraction
    print("\n📦 [2/4] Ingesting Bronze Layer (JSONL extracts)...")
    all_commits: List[Dict[str, Any]] = []
    all_churn: List[Dict[str, Any]] = []
    all_tags: List[Dict[str, Any]] = []
    repo_records: List[Dict[str, Any]] = []

    for r in repos:
        print(f"  • Extracting git history: {r.name}...")
        commits, churn = extract_git_history(r)
        tags = extract_tags(r)
        all_commits.extend(commits)
        all_churn.extend(churn)
        all_tags.extend(tags)

        repo_records.append({
            "name": r.name,
            "category": r.category,
            "path": str(r.path),
            "description": r.description,
            "commits_count": len(commits),
            "tags_count": len(tags),
        })

    print("  • Extracting Backlog tasks...")
    tasks = extract_backlog_tasks(game_path)

    print("  • Extracting Architectural Decision Records (ADRs)...")
    adrs = extract_adrs(game_path)

    print("  • Extracting dependencies...")
    deps = extract_dependencies(game_path)

    print("  • Fetching GitHub API metadata...")
    gh_meta = extract_github_metadata()

    # Write Bronze JSONL files
    def write_jsonl(path: Path, data: List[Dict[str, Any]]) -> None:
        with open(path, "w", encoding="utf-8") as f:
            for item in data:
                f.write(json.dumps(item) + "\n")

    write_jsonl(bronze_dir / "repositories.jsonl", repo_records)
    write_jsonl(bronze_dir / "commits.jsonl", all_commits)
    write_jsonl(bronze_dir / "file_churn.jsonl", all_churn)
    write_jsonl(bronze_dir / "tags.jsonl", all_tags)
    write_jsonl(bronze_dir / "tasks.jsonl", tasks)
    write_jsonl(bronze_dir / "adrs.jsonl", adrs)
    write_jsonl(bronze_dir / "dependencies.jsonl", deps)

    with open(bronze_dir / "github_metadata.json", "w", encoding="utf-8") as f:
        json.dump(gh_meta, f, indent=2)

    print(f"  Bronze layer written: {len(all_commits)} commits, {len(all_churn)} file edits, {len(tasks)} tasks, {len(adrs)} ADRs.")

    # Silver transformation (Parquet)
    print("\n🥈 [3/4] Transforming Silver Layer (Parquet columnar encoding)...")
    con = duckdb.connect()

    con.execute(f"COPY (SELECT * FROM read_json_auto('{bronze_dir}/repositories.jsonl')) TO '{silver_dir}/repositories.parquet' (FORMAT PARQUET)")
    con.execute(f"COPY (SELECT * FROM read_json_auto('{bronze_dir}/commits.jsonl')) TO '{silver_dir}/commits.parquet' (FORMAT PARQUET)")
    con.execute(f"COPY (SELECT * FROM read_json_auto('{bronze_dir}/file_churn.jsonl')) TO '{silver_dir}/file_churn.parquet' (FORMAT PARQUET)")
    con.execute(f"COPY (SELECT * FROM read_json_auto('{bronze_dir}/tags.jsonl')) TO '{silver_dir}/tags.parquet' (FORMAT PARQUET)")
    if tasks:
        con.execute(f"COPY (SELECT * FROM read_json_auto('{bronze_dir}/tasks.jsonl')) TO '{silver_dir}/tasks.parquet' (FORMAT PARQUET)")
    if adrs:
        con.execute(f"COPY (SELECT * FROM read_json_auto('{bronze_dir}/adrs.jsonl')) TO '{silver_dir}/adrs.parquet' (FORMAT PARQUET)")
    if deps:
        con.execute(f"COPY (SELECT * FROM read_json_auto('{bronze_dir}/dependencies.jsonl')) TO '{silver_dir}/dependencies.parquet' (FORMAT PARQUET)")

    print("  Silver Parquet tables successfully compiled and compressed.")

    # Gold Layer (DuckDB Database & Materialized Views)
    print("\n🥇 [4/4] Materializing Gold Layer (Analytical DuckDB Views & Catalog)...")
    duckdb_path = gold_dir / "phalanx_datalake.duckdb"
    if duckdb_path.exists():
        duckdb_path.unlink()

    db = duckdb.connect(str(duckdb_path))

    # Load Silver Parquet tables as base tables in DuckDB
    db.execute(f"CREATE TABLE silver_repositories AS SELECT * FROM '{silver_dir}/repositories.parquet'")
    db.execute(f"CREATE TABLE silver_commits AS SELECT * FROM '{silver_dir}/commits.parquet'")
    db.execute(f"CREATE TABLE silver_file_churn AS SELECT * FROM '{silver_dir}/file_churn.parquet'")
    db.execute(f"CREATE TABLE silver_tags AS SELECT * FROM '{silver_dir}/tags.parquet'")
    if tasks:
        db.execute(f"CREATE TABLE silver_tasks AS SELECT * FROM '{silver_dir}/tasks.parquet'")
    if adrs:
        db.execute(f"CREATE TABLE silver_adrs AS SELECT * FROM '{silver_dir}/adrs.parquet'")
    if deps:
        db.execute(f"CREATE TABLE silver_dependencies AS SELECT * FROM '{silver_dir}/dependencies.parquet'")

    # Analytical Views & Materialized Tables
    db.execute("""
    CREATE TABLE gold_monthly_velocity AS
    SELECT 
        year_month,
        repo_name,
        COUNT(DISTINCT commit_hash) AS commit_count,
        COUNT(DISTINCT author_email) AS active_authors,
        SUM(insertions) AS lines_added,
        SUM(deletions) AS lines_deleted,
        SUM(insertions) - SUM(deletions) AS net_line_growth
    FROM silver_commits
    GROUP BY year_month, repo_name
    ORDER BY year_month ASC, repo_name ASC;
    """)

    db.execute("""
    CREATE TABLE gold_subsystem_churn AS
    SELECT 
        subsystem,
        repo_name,
        COUNT(DISTINCT commit_hash) AS commit_touches,
        SUM(insertions) AS total_insertions,
        SUM(deletions) AS total_deletions,
        SUM(insertions) + SUM(deletions) AS gross_churn
    FROM silver_file_churn
    GROUP BY subsystem, repo_name
    ORDER BY gross_churn DESC;
    """)

    db.execute("""
    CREATE TABLE gold_contributor_matrix AS
    SELECT 
        author_name,
        COUNT(DISTINCT commit_hash) AS total_commits,
        COUNT(DISTINCT repo_name) AS repos_touched,
        MIN(date_iso) AS first_commit_date,
        MAX(date_iso) AS latest_commit_date,
        SUM(insertions) AS total_insertions,
        SUM(deletions) AS total_deletions
    FROM silver_commits
    GROUP BY author_name
    ORDER BY total_commits DESC;
    """)

    db.execute("""
    CREATE TABLE gold_commit_type_distribution AS
    SELECT 
        commit_type,
        COUNT(*) AS count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM silver_commits), 2) AS percentage
    FROM silver_commits
    GROUP BY commit_type
    ORDER BY count DESC;
    """)

    db.execute("""
    CREATE TABLE gold_org_summary AS
    SELECT 
        COUNT(DISTINCT repo_name) AS total_repos,
        COUNT(DISTINCT commit_hash) AS total_commits,
        COUNT(DISTINCT author_email) AS total_unique_authors,
        MIN(date_iso) AS earliest_commit,
        MAX(date_iso) AS latest_commit,
        SUM(insertions) AS total_lines_inserted,
        SUM(deletions) AS total_lines_deleted
    FROM silver_commits;
    """)

    # Query summary metrics
    summary_row = db.execute("SELECT * FROM gold_org_summary").fetchone()
    summary_dict = {
        "total_repos": int(summary_row[0]),
        "total_commits": int(summary_row[1]),
        "total_unique_authors": int(summary_row[2]),
        "earliest_commit": str(summary_row[3]),
        "latest_commit": str(summary_row[4]),
        "total_lines_inserted": int(summary_row[5]),
        "total_lines_deleted": int(summary_row[6]),
        "built_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "build_duration_sec": round(time.time() - start_time, 2),
    }

    # Save catalog summary
    with open(gold_dir / "datalake_catalog.json", "w", encoding="utf-8") as f:
        json.dump(summary_dict, f, indent=2)

    # Generate rich Markdown Report
    top_subsystems = db.execute("SELECT subsystem, repo_name, commit_touches, gross_churn FROM gold_subsystem_churn LIMIT 10").fetchall()
    type_distribution = db.execute("SELECT commit_type, count, percentage FROM gold_commit_type_distribution LIMIT 8").fetchall()
    top_authors = db.execute("SELECT author_name, total_commits, first_commit_date, latest_commit_date FROM gold_contributor_matrix LIMIT 5").fetchall()
    velocity = db.execute("SELECT year_month, SUM(commit_count), SUM(lines_added), SUM(lines_deleted) FROM gold_monthly_velocity GROUP BY year_month ORDER BY year_month DESC LIMIT 12").fetchall()

    report_content = f"""# Phalanx Duel Multi-Repository Datalake Report

> **Generated at**: `{summary_dict['built_at']}`  
> **Ingestion Duration**: `{summary_dict['build_duration_sec']}s`  
> **Database**: `datalake/data/gold/phalanx_datalake.duckdb` (DuckDB columnar lake)  

---

## 1. Organization Summary KPIs

| Metric | Value |
| --- | --- |
| **Total Repositories Ingested** | `{summary_dict['total_repos']}` |
| **Total Historical Commits** | `{summary_dict['total_commits']:,}` |
| **Unique Contributors** | `{summary_dict['total_unique_authors']}` |
| **Date Span** | `{summary_dict['earliest_commit']}` to `{summary_dict['latest_commit']}` |
| **Total Lines Added** | `+{summary_dict['total_lines_inserted']:,}` |
| **Total Lines Deleted** | `-{summary_dict['total_lines_deleted']:,}` |
| **Tracked Backlog Tasks** | `{len(tasks)}` |
| **Architectural Decision Records** | `{len(adrs)}` |

---

## 2. Commit Type Distribution (Conventional Commits)

| Conventional Type | Commit Count | Share (%) |
| --- | --- | --- |
"""
    for ctype, count, pct in type_distribution:
        report_content += f"| `{ctype}` | {count:,} | {pct}% |\n"

    report_content += """
---

## 3. Top Architectural Subsystems by Gross Churn

| Subsystem | Primary Repository | Commits Touched | Gross Churn (Lines) |
| --- | --- | --- | --- |
"""
    for sub, repo, touches, churn in top_subsystems:
        report_content += f"| `{sub}` | `{repo}` | {touches:,} | {churn:,} |\n"

    report_content += """
---

## 4. Recent Monthly Velocity

| Year-Month | Commits | Lines Added | Lines Deleted | Net Growth |
| --- | --- | --- | --- | --- |
"""
    for ym, c_cnt, l_add, l_del in velocity:
        report_content += f"| `{ym}` | {c_cnt:,} | +{l_add:,} | -{l_del:,} | {l_add - l_del:+,} |\n"

    report_content += """
---

## 5. Contributor Profile

| Contributor | Commits | First Active | Latest Active |
| --- | --- | --- | --- |
"""
    for name, c_cnt, f_date, l_date in top_authors:
        report_content += f"| **{name}** | {c_cnt:,} | `{f_date}` | `{l_date}` |\n"

    report_content += """
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
"""

    with open(reports_dir / "DATALAKE_REPORT.md", "w", encoding="utf-8") as f:
        f.write(report_content)

    db.close()
    con.close()

    print(f"\n🎉 Datalake built successfully in {summary_dict['build_duration_sec']}s!")
    print(f"📊 Summary: {summary_dict['total_commits']} commits across {summary_dict['total_repos']} repos.")
    print(f"📄 Report: {reports_dir / 'DATALAKE_REPORT.md'}")
    print(f"💾 DuckDB: {duckdb_path}")

    return summary_dict

if __name__ == "__main__":
    build_datalake()
