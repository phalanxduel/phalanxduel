-- DuckDB Setup for ORGANIZATIONAL THUNDERA Metadata (FORENSIC MODE)

-- 1. Raw Ingestion
CREATE OR REPLACE TABLE raw_prs_pages AS 
SELECT * FROM read_json_auto(DATA_PATH_VAR || '/*_prs_deep.json', union_by_name=true);

CREATE OR REPLACE TABLE raw_issues_pages AS 
SELECT * FROM read_json_auto(DATA_PATH_VAR || '/*_issues.json', union_by_name=true);

-- 2. Nodes
CREATE OR REPLACE TABLE pr_nodes AS
SELECT 
    data.repository.nameWithOwner as repo_name,
    unnest(data.repository.pullRequests.nodes) as node
FROM raw_prs_pages;

CREATE OR REPLACE TABLE issue_nodes AS
SELECT 
    data.repository.nameWithOwner as repo_name,
    unnest(data.repository.issues.nodes) as node
FROM raw_issues_pages;

-- 3. Flattened PRs
CREATE OR REPLACE TABLE prs AS
SELECT 
    repo_name,
    node.number,
    node.title,
    node.body,
    node.state,
    node.author.login as author,
    node.createdAt::TIMESTAMP as created_at,
    node.mergedAt::TIMESTAMP as merged_at,
    node.reviewThreads.totalCount as thread_count,
    node.statusCheckRollup.state as ci_state,
    (node.author.login LIKE 'app/%' OR node.author.login LIKE '%bot%') as is_bot,
    [i.number for i in node.closingIssuesReferences.nodes] as closed_issues
FROM pr_nodes;

-- 4. Flattened Issues
CREATE OR REPLACE TABLE issues AS
SELECT 
    repo_name,
    node.number,
    node.title,
    node.state,
    node.author.login as author,
    node.createdAt::TIMESTAMP as created_at,
    node.closedAt::TIMESTAMP as closed_at,
    [l.name for l in node.labels.nodes] as labels
FROM issue_nodes;

-- 5. Flatten File Changes
CREATE OR REPLACE TABLE pr_files AS
SELECT 
    repo_name,
    node.number as pr_number,
    f.path as file_path,
    f.additions,
    f.deletions
FROM pr_nodes CROSS JOIN unnest(node.files.nodes) as t(f)
WHERE f IS NOT NULL;

-- 6. AGILE ANALYTICS: ISSUE -> PR -> MERGE LIFECYCLE
-- Link Issues and PRs
CREATE OR REPLACE TABLE issue_lifecycle AS
SELECT 
    i.repo_name,
    i.number as issue_number,
    p.number as pr_number,
    i.created_at as issue_created_at,
    p.created_at as pr_created_at,
    p.merged_at as pr_merged_at,
    date_diff('hour', i.created_at, p.created_at) as spec_to_code_hours,
    date_diff('hour', p.created_at, p.merged_at) as code_to_merge_hours,
    date_diff('hour', i.created_at, p.merged_at) as total_lead_time_hours
FROM issues i
JOIN (
    SELECT repo_name, number, created_at, merged_at, unnest(closed_issues) as closing_issue
    FROM prs
) p ON i.repo_name = p.repo_name AND i.number = p.closing_issue;

-- 7. TEST RESONANCE FORENSICS
CREATE OR REPLACE VIEW test_files AS
SELECT *,
    (
        file_path LIKE '%_test.go' OR 
        file_path LIKE 'spec/%' OR 
        file_path LIKE 'test/%' OR 
        file_path LIKE 'tests/%' OR 
        file_path LIKE '%_spec.rb' OR 
        file_path LIKE '%_test.rb' OR
        file_path LIKE '%.test.ts' OR
        file_path LIKE '%.spec.ts' OR
        file_path LIKE '%.test.js' OR
        file_path LIKE '%.spec.js'
    ) as is_test
FROM pr_files;

CREATE OR REPLACE VIEW test_resonance AS
WITH pr_stats AS (
    SELECT 
        repo_name,
        pr_number,
        count(CASE WHEN is_test THEN 1 END) as test_files,
        count(CASE WHEN NOT is_test AND file_path NOT LIKE '%lock%' THEN 1 END) as code_files,
        sum(CASE WHEN is_test THEN additions + deletions ELSE 0 END) as test_churn,
        sum(CASE WHEN NOT is_test AND file_path NOT LIKE '%lock%' THEN additions + deletions ELSE 0 END) as code_churn
    FROM test_files
    GROUP BY 1, 2
)
SELECT 
    p.repo_name,
    p.number,
    p.author,
    s.test_files,
    s.code_files,
    CASE WHEN s.code_churn = 0 THEN 1.0 ELSE s.test_churn::FLOAT / s.code_churn END as resonance_ratio
FROM prs p
JOIN pr_stats s ON p.repo_name = s.repo_name AND p.number = s.pr_number;

-- 8. THE "HIDDEN CRACKS" & LEADERSHIP VIEWS

-- LINGER TIME: Open issues with no activity (simplified as total age)
CREATE OR REPLACE VIEW issue_linger AS
SELECT 
    repo_name,
    number,
    title,
    author,
    date_diff('day', created_at, now()) as days_open
FROM issues
WHERE state = 'OPEN'
ORDER BY days_open DESC;

-- AGILE VELOCITY: Median lead times per repo
CREATE OR REPLACE VIEW agile_velocity AS
SELECT 
    repo_name,
    quantile_cont(spec_to_code_hours, 0.5) as median_spec_to_code_h,
    quantile_cont(code_to_merge_hours, 0.5) as median_code_to_merge_h,
    quantile_cont(total_lead_time_hours, 0.5) as median_total_lead_time_h,
    count(*) as resolved_count
FROM issue_lifecycle
GROUP BY 1;

-- DEVELOPER MOBILITY
CREATE OR REPLACE VIEW developer_mobility AS
SELECT 
    author,
    count(distinct repo_name) as repo_count,
    list(distinct repo_name) as repos,
    count(*) as total_prs
FROM prs
GROUP BY 1
ORDER BY 2 DESC;

-- PROCESS LEAKAGE
CREATE OR REPLACE VIEW process_leakage AS
SELECT 
    repo_name,
    number,
    title,
    author,
    ci_state,
    thread_count
FROM prs
WHERE state = 'MERGED' 
  AND (ci_state = 'FAILURE' OR thread_count = 0)
  AND NOT is_bot
ORDER BY repo_name;
