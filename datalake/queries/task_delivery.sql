-- Backlog Task Delivery Metrics by Status and Priority
SELECT 
    status,
    priority,
    COUNT(*) AS task_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS share_percentage
FROM silver_tasks
GROUP BY status, priority
ORDER BY 
    CASE status
        WHEN 'Done' THEN 1
        WHEN 'In Progress' THEN 2
        WHEN 'Verification' THEN 3
        WHEN 'To Do' THEN 4
        ELSE 5
    END,
    task_count DESC;
