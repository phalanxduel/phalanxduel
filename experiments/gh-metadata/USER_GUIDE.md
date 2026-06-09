# 👁️ Thundera: The Organizational Black Box Recorder

## 🚀 Purpose
Thundera is a **high-fidelity forensic tool** designed for engineering leaders taking ownership of large, complex, or legacy repository estates (e.g., a 95-repo takeover). 

Unlike standard dashboards that show lagging "productivity" metrics, Thundera reveals the **"Real Process"** embedded in your systems—the hidden cracks, the social gravity wells, and the architectural decay that lead to expensive production "root canals."

---

## 🔍 Key Forensic Signals

### 1. Test Resonance (Defensive Gravity)
*   **The Number**: Ratio of test churn vs. logic churn in PRs.
*   **The Insight**: Is the team investing in future stability? 
    *   **> 1.0**: Healthy "Defensive Gravity." 
    *   **< 0.1**: "Atrophy Alert." Logic is moving faster than its verification layer.

### 2. Pipeline Instability (Tinkering Rate)
*   **The Number**: % of PRs that modify GitHub Actions (`.github/workflows/`).
*   **The Insight**: Are you fighting the machinery? 
    *   **High Rate (> 30%)**: The system is being "manually steered" through automation. The real process is manual tinkering, not stable delivery.

### 3. Ghost Areas (Knowledge Decay)
*   **The Signal**: Days since the last active human contribution in a labeled functional area.
*   **The Insight**: Identifies code that is functional but "Contextually Orphaned." You have the source, but the *intent* has left the building.

### 4. Shadow Stakeholders (The Real Org Chart)
*   **The Signal**: Actors who comment/review extensively but author zero code.
*   **The Insight**: These are your hidden Subject Matter Experts (SMEs). PMs, QA, and Design leads who define the code's value from the shadows.

---

## 🛠️ How to Leverage This System

### Phase 1: The Harvest (Gathering Evidence)
Run the harvester against your target organization. This is a **read-only** operation that skips already-harvested data.

```bash
cd experiments/gh-metadata
./harvest.sh <TARGET_ORG_NAME>
```

### Phase 2: The Consolidation (Building the Graph)
The harvester automatically triggers `setup_db.sql` via DuckDB. This flattens the raw JSON into high-performance relational tables.

*   **Database File**: `gh_metadata_<ORG>.db` (A single, portable file containing the entire history).

### Phase 3: The Visualization (Executive Command Center)
Generate the sleek HTML dashboard to present findings to stakeholders or higher leadership.

```bash
python3 generate_report.py <TARGET_ORG_NAME>
```
*   **Output**: `thundera_report_<ORG>.html`

---

## 🤖 Integration with `zdots` (The Intelligence Layer)

Thundera is designed to feed your project's "Second Brain":

1.  **Quantitative => Qualitative**: When Thundera identifies a **Ghost Area** with a **High Tinkering Rate**, use `zdots-ctx capture` to document the immediate risk.
2.  **AI-Powered Analysis**: Feed Thundera's DuckDB tables to `ai-query` to ask: *"Based on the Shadow Stakeholders identified, who is the best person to interview for the upcoming Ruby-to-Go migration?"*

---

## 🛑 Warning: Sight Beyond Sight
Thundera reveals the **Forensic Truth**, which often contradicts the **Official Narrative**. Use it to:
- Identify systems ready for "Cold Storage."
- Prioritize "Knowledge Extraction" sessions before key personnel leave.
- Stabilize the delivery pipeline before scaling the team.

*For Thundera!*
