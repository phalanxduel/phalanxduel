import duckdb
import json
import os
import sys
from datetime import datetime

def generate_report(org_name):
    db_file = f"gh_metadata_{org_name}.db"
    if not os.path.exists(db_file):
        print(f"Error: Database {db_file} not found.")
        return

    conn = duckdb.connect(db_file)
    
    # 1. Executive Summary
    total_repos = conn.execute("SELECT count(distinct repo_name) FROM prs").fetchone()[0]
    
    # Safe checks for views
    def get_count(table):
        try: return conn.execute(f"SELECT count(*) FROM {table}").fetchone()[0]
        except: return 0

    def get_avg(query):
        try: return round(conn.execute(query).fetchone()[0] or 0, 2)
        except: return 0

    avg_resonance = get_avg("SELECT avg(resonance_ratio) FROM test_resonance")
    orphan_count = get_count("orphaned_systems")
    leakage_count = get_count("process_leakage")
    
    total_merged = conn.execute("SELECT count(*) FROM prs WHERE state = 'MERGED' AND NOT is_bot").fetchone()[0]
    leakage_percent = round((leakage_count / total_merged * 100) if total_merged > 0 else 0, 1)

    # 2. YoY Velocity Data
    yoy_res = conn.execute("""
        SELECT 
            month(created_at) as month,
            count(CASE WHEN year(created_at) = 2026 THEN 1 END) as current_year,
            count(CASE WHEN year(created_at) = 2025 THEN 1 END) as prev_year
        FROM prs
        GROUP BY 1 ORDER BY 1
    """).fetchall()
    
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    yoy_data = {
        "categories": months,
        "series": [
            {"name": "2026 (Active)", "data": [next((r[1] for r in yoy_res if r[0] == m), 0) for m in range(1, 13)]},
            {"name": "2025 (Historical)", "data": [next((r[2] for r in yoy_res if r[0] == m), 0) for m in range(1, 13)]}
        ]
    }

    # 3. Latency Whisker Data
    latency_stats = conn.execute("""
        SELECT quantile_cont(date_diff('hour', created_at, merged_at), [0, 0.25, 0.5, 0.75, 1])
        FROM prs WHERE merged_at IS NOT NULL
    """).fetchone()[0]
    latency_data = [{"x": "Org Average", "y": latency_stats}]

    # 4. Hotspot Heatmap
    heatmap_res = conn.execute("""
        SELECT repo_name, month(created_at) as month, count(*) as activity
        FROM prs GROUP BY 1, 2 ORDER BY 1, 2
    """).fetchall()
    repos = sorted(list(set([row[0] for row in heatmap_res])))
    heatmap_data = []
    for repo in repos[:15]: # Top 15 repos to keep heatmap readable
        repo_data = [{"x": months[m-1], "y": next((row[2] for row in heatmap_res if row[0] == repo and row[1] == m), 0)} for m in range(1, 13)]
        heatmap_data.append({"name": repo.split('/')[-1], "data": repo_data})

    # 5. Cohort Table
    try:
        cohort_res = conn.execute("SELECT author, repos_bridged, total_interventions FROM invisible_glue LIMIT 10").fetchall()
    except:
        cohort_res = []
        
    table_rows = ""
    for row in cohort_res:
        table_rows += f"""
        <tr class="border-t border-white/5 hover:bg-white/5 transition-colors">
            <td class="p-4 font-bold text-blue-400">{row[0]}</td>
            <td class="p-4">{row[1]}</td>
            <td class="p-4">{row[2]}</td>
            <td class="p-4 text-slate-500">Cross-Functional</td>
        </tr>
        """

    # Read Template and Replace
    with open("report_template.html", 'r') as f:
        html = f.read()
    
    replacements = {
        "{{ORG_NAME}}": org_name,
        "{{TIMESTAMP}}": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "{{TOTAL_REPOS}}": str(total_repos),
        "{{AVG_RESONANCE}}": str(avg_resonance),
        "{{ORPHAN_COUNT}}": str(orphan_count),
        "{{LEAKAGE_PERCENT}}": str(leakage_percent),
        "{{YOY_DATA_JSON}}": json.dumps(yoy_data),
        "{{LATENCY_DATA_JSON}}": json.dumps(latency_data),
        "{{HEATMAP_DATA_JSON}}": json.dumps(heatmap_data),
        "{{COHORT_TABLE_ROWS}}": table_rows
    }
    
    for k, v in replacements.items():
        html = html.replace(k, v)

    output_path = f"thundera_report_{org_name}.html"
    with open(output_path, 'w') as f:
        f.write(html)
    print(f"Sleek Forensic Report Generated: {output_path}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        generate_report(sys.argv[1])
    else:
        print("Usage: python3 generate_report.py <ORG_NAME>")
