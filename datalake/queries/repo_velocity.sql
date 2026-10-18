-- Monthly Commit Velocity & Line Growth Across All Repositories
SELECT 
    year_month,
    repo_name,
    commit_count,
    active_authors,
    lines_added,
    lines_deleted,
    net_line_growth
FROM gold_monthly_velocity
ORDER BY year_month DESC, commit_count DESC;
