# GitHub Metadata Experiment Tools

This file documents the recommended tools for the GitHub metadata harvesting and analysis experiment, aligned with the `zdots` ecosystem.

## Homebrew Tools (Brewfile)
See the local `Brewfile` in this directory.

- **duckdb**: High-performance analytical database.
- **miller**: Powerful tool for processing CSV, JSON, and other tabular data.
- **gh**: Official GitHub CLI.
- **gh-dash**: TUI for monitoring PRs and Issues.
- **git-sizer**: Analyzes repository size and metadata.
- **mergestat-lite**: SQL for Git repositories (good for local git metadata).

## Python Tools
Install via `pip` (recommend using a virtualenv or `pipx`):

- **duckdb**: Python API for DuckDB.
- **pandas**: Data manipulation and analysis.
- **PyGithub**: Comprehensive GitHub API library for complex logic.
- **dbt-duckdb**: SQL modeling for DuckDB.

## Go Tools
- **mergestat**: Advanced SQL interface for Git/GitHub.

## Node/NPM Tools
- **octokit**: Official GitHub SDK for JS.

## Rust/Cargo Tools
- **tokei**: Fast code counter and statistics.
- **git-delta**: Pager for git/diff with better metadata visualization.

## zdots Integration
The experiment should leverage the following `zdots` capabilities:

1. **Knowledge Layer**: Use `zdots-ctx capture` to feed derived insights (e.g., "Context Cohorts") back into the system's memory.
2. **Database**: Consider exporting final aggregated tables from DuckDB to the `zdots` Postgres database (`my`) for long-term storage and cross-service correlation.
3. **Observability**: Use the local OTEL collector if we want to trace the harvesting process or monitor API latency over time.
