-- DuckDB Setup for ORGANIZATIONAL THUNDERA Metadata (FORENSIC MODE)

-- 1. Raw Ingestion
CREATE OR REPLACE TABLE raw_prs_pages AS 
SELECT * FROM read_json_auto(DATA_PATH_VAR || '/*_prs_deep.json', union_by_name=true);

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

-- 5. TEST RESONANCE FORENSICS
-- Measures the ratio of test changes to functional changes

-- Identify test files based on Rails, Go, and TS/JS conventions
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

-- TEST RESONANCE: Calculate test-to-code ratio per PR
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

-- 6. THE "HIDDEN CRACKS" FORENSIC VIEWS

-- ATROPHYING REPOS: High logic churn with low test resonance
CREATE OR REPLACE VIEW atrophying_repos AS
SELECT 
    repo_name,
    avg(resonance_ratio) as avg_resonance,
    sum(test_files) as total_test_files,
    sum(code_files) as total_code_files
FROM test_resonance
GROUP BY 1;

-- BOT LIFE SUPPORT: Repos where humans have left but bots are still 'keeping it alive'
CREATE OR REPLACE VIEW bot_life_support AS
SELECT 
    repo_name,
    count(CASE WHEN NOT is_bot THEN 1 END) as human_prs,
    count(CASE WHEN is_bot THEN 1 END) as bot_prs,
    max(CASE WHEN NOT is_bot THEN created_at END) as last_human_seen,
    date_diff('day', max(CASE WHEN NOT is_bot THEN created_at END), now()) as human_stagnation_days
FROM prs
GROUP BY 1
HAVING human_prs < 2 AND bot_prs > 5
ORDER BY human_stagnation_days DESC;

-- PROCESS LEAKAGE: PRs merged with CI failures or zero reviews
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
