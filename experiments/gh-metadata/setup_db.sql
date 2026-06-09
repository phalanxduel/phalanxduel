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

-- 3. Flattened PRs with Deep Signals
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
    regexp_matches(node.body, '[a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+#[0-9]+') as cross_repo_mentions,
    (node.author.login LIKE 'app/%' OR node.author.login LIKE '%bot%') as is_bot
FROM pr_nodes;

-- 4. Flatten File Changes
CREATE OR REPLACE TABLE pr_files AS
SELECT 
    repo_name,
    node.number as pr_number,
    f.path as file_path
FROM pr_nodes CROSS JOIN unnest(node.files.nodes) as t(f)
WHERE f IS NOT NULL;

-- 5. THE "HIDDEN CRACKS" FORENSIC VIEWS

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

-- SHADOW ENTANGLEMENT: Files that are consistently modified in the same PRs (Logical Coupling)
-- This finds files that 'leak' their concerns into other files
CREATE OR REPLACE VIEW shadow_entanglement AS
SELECT 
    f1.file_path as file_a,
    f2.file_path as file_b,
    count(*) as together_count
FROM pr_files f1
JOIN pr_files f2 ON f1.repo_name = f2.repo_name AND f1.pr_number = f2.pr_number
WHERE f1.file_path < f2.file_path 
  AND f1.file_path NOT LIKE '%lock%' AND f2.file_path NOT LIKE '%lock%' -- Ignore lockfiles
GROUP BY 1, 2
HAVING together_count > 3
ORDER BY 3 DESC;

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

-- THE INVISIBLE GLUE: People who review/interact across the most silos
CREATE OR REPLACE VIEW invisible_glue AS
SELECT 
    author,
    count(distinct repo_name) as repos_bridged,
    count(*) as total_interventions
FROM prs
WHERE thread_count > 0 -- Only counting those who actually comment/review
GROUP BY 1
ORDER BY 2 DESC;
