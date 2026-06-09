-- DuckDB Setup for ORGANIZATIONAL THUNDERA Metadata (FORENSIC MODE)

-- 1. Raw Ingestion (Resilient to missing files)
CREATE OR REPLACE TABLE raw_prs_pages AS SELECT * FROM read_json_auto(DATA_PATH_VAR || '/*_prs_deep.json', union_by_name=true);

-- 2. Nodes
CREATE OR REPLACE TABLE pr_nodes AS
SELECT 
    data.repository.nameWithOwner as repo_name,
    unnest(data.repository.pullRequests.nodes) as node
FROM raw_prs_pages;

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
    (node.author.login LIKE 'app/%' OR node.author.login LIKE '%bot%') as is_bot
FROM pr_nodes;

-- 4. Flatten File Changes
CREATE OR REPLACE TABLE pr_files AS
SELECT 
    repo_name,
    node.number as pr_number,
    f.path as file_path,
    f.additions,
    f.deletions
FROM pr_nodes CROSS JOIN unnest(node.files.nodes) as t(f)
WHERE f IS NOT NULL;

-- 5. PIPELINE FORENSICS
CREATE OR REPLACE VIEW pipeline_instability AS
SELECT 
    repo_name,
    count(distinct pr_number) as workflow_modifying_prs,
    sum(additions + deletions) as workflow_churn,
    round(count(distinct pr_number)::FLOAT / (SELECT count(*) FROM prs p2 WHERE p2.repo_name = pr_files.repo_name) * 100, 1) as tinkering_rate_percent
FROM pr_files
WHERE file_path LIKE '.github/workflows/%'
GROUP BY 1
ORDER BY 3 DESC;

-- 6. TEST RESONANCE
CREATE OR REPLACE VIEW test_files AS
SELECT *,
    (file_path LIKE '%_test.go' OR file_path LIKE 'spec/%' OR file_path LIKE 'test/%' OR file_path LIKE '%_spec.rb' OR file_path LIKE '%_test.rb' OR file_path LIKE '%.test.ts') as is_test
FROM pr_files;

CREATE OR REPLACE VIEW test_resonance AS
WITH pr_stats AS (
    SELECT repo_name, pr_number, 
           sum(CASE WHEN is_test THEN additions + deletions ELSE 0 END) as test_churn,
           sum(CASE WHEN NOT is_test AND file_path NOT LIKE '%lock%' THEN additions + deletions ELSE 0 END) as code_churn
    FROM test_files GROUP BY 1, 2
)
SELECT p.repo_name, p.number, p.author, 
       CASE WHEN s.code_churn = 0 THEN 1.0 ELSE s.test_churn::FLOAT / s.code_churn END as resonance_ratio
FROM prs p JOIN pr_stats s ON p.repo_name = s.repo_name AND p.number = s.pr_number;

-- 7. DEVELOPER MOBILITY
CREATE OR REPLACE VIEW developer_mobility AS
SELECT author, count(distinct repo_name) as repo_count, count(*) as total_prs
FROM prs GROUP BY 1 ORDER BY 2 DESC;
