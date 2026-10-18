-- Architectural Subsystem Churn and File Activity
SELECT 
    subsystem,
    repo_name,
    commit_touches,
    total_insertions,
    total_deletions,
    gross_churn,
    ROUND(gross_churn * 100.0 / SUM(gross_churn) OVER (), 2) AS churn_percentage
FROM gold_subsystem_churn
ORDER BY gross_churn DESC;
