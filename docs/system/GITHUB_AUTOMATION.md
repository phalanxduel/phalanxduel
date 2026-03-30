# GitHub Automation

This document describes the GitHub Actions workflows and automation commands in this repository. Five of eight workflows are Gemini-powered AI automation; the remaining three handle CI, staleness, and auto-assignment.

---

## Workflows Overview

| Workflow | File | Trigger | Status |
|----------|------|---------|--------|
| 🔀 Gemini Dispatch | `gemini-dispatch.yml` | PR events, issue events, comments | Active |
| ▶️ Gemini Invoke | `gemini-invoke.yml` | Called by Dispatch | Active |
| 🔎 Gemini Review | `gemini-review.yml` | Called by Dispatch | Active |
| 📋 Gemini Scheduled Triage | `gemini-scheduled-triage.yml` | Weekly cron + manual | Active |
| 🔀 Gemini Triage | `gemini-triage.yml` | Called by Dispatch | Active |
| 🔧 Pipeline | `pipeline.yml` | Push/PR to `main` | Active |
| 🧹 Stale | `stale.yml` | Schedule | Active |
| 👤 Auto Assign | `auto-assign.yml` | PR opened | Active |

---

## Gemini AI Automation

### Architecture

The Gemini automation uses a **dispatch pattern**:

1. **Dispatch** (`gemini-dispatch.yml`) is the central event router. It listens to PR events (opened, review submitted, review comments) and issue events (opened, reopened, comments).
2. Based on the event type and context, Dispatch calls one of three reusable workflows: **Invoke**, **Review**, or **Triage**.
3. Each reusable workflow authenticates via a GitHub App token (`APP_ID` / `APP_PRIVATE_KEY`) and Google Cloud Workload Identity Federation (`GCP_WIF_PROVIDER`).

### Gemini Dispatch

- **File:** `.github/workflows/gemini-dispatch.yml`
- **Triggers:** `pull_request_review_comment.created`, `pull_request_review.submitted`, `pull_request.opened`, `issues.opened`, `issues.reopened`, `issue_comment.created`
- **Purpose:** Routes GitHub events to the appropriate Gemini workflow. Acts as a central dispatcher — no AI logic runs here, only event matching and delegation.
- **Safety:** Only dispatches for authorized collaborators (`OWNER`, `MEMBER`, `COLLABORATOR`).

### Gemini Invoke

- **File:** `.github/workflows/gemini-invoke.yml`
- **Trigger:** Called by Dispatch (reusable workflow via `workflow_call`)
- **Purpose:** General-purpose Gemini CLI invocation. Can execute arbitrary Gemini commands in the context of an issue or PR, with optional `additional_context` passed from the Dispatch event.
- **Permissions:** `contents: read`, `issues: write`, `pull-requests: write`
- **Instruction sources:** Reads from `AGENTS.md`, `.gemini/` config, and repository context.

### Gemini Review

- **File:** `.github/workflows/gemini-review.yml`
- **Trigger:** Called by Dispatch (reusable workflow via `workflow_call`)
- **Purpose:** AI-powered code review on pull requests. Generates a structured review following project standards (security, fairness, replay integrity, trust boundaries).
- **Permissions:** `contents: read`, `issues: write`, `pull-requests: write`
- **Timeout:** 7 minutes
- **Concurrency:** One review per PR (latest cancels previous)
- **Instruction sources:** `.github/commands/gemini-review.toml` defines the review prompt, criteria, and output format.

### Gemini Triage

- **File:** `.github/workflows/gemini-triage.yml`
- **Trigger:** Called by Dispatch (reusable workflow via `workflow_call`)
- **Purpose:** Analyzes a single GitHub issue and applies appropriate labels from the repository's label set.
- **Permissions:** `contents: read`, `issues: read`, `pull-requests: read`
- **Timeout:** 7 minutes
- **Instruction sources:** `.github/commands/gemini-triage.toml` defines the triage prompt, label selection criteria, and output format.

### Gemini Scheduled Triage

- **File:** `.github/workflows/gemini-scheduled-triage.yml`
- **Trigger:** Weekly cron (`0 0 * * 0` — Sunday midnight UTC), plus manual `workflow_dispatch`
- **Purpose:** Batch triages all unlabeled issues. Runs independently of Dispatch.
- **Permissions:** `contents: read`, `issues: read`, `pull-requests: read`
- **Timeout:** 10 minutes
- **Instruction sources:** `.github/commands/gemini-scheduled-triage.toml` defines the batch triage prompt and JSON output format.

---

## Command Files

Command files in `.github/commands/` define the prompts and behavior for each Gemini workflow:

| File | Used By | Purpose |
|------|---------|---------|
| `gemini-invoke.toml` | Gemini Invoke | General invocation prompt |
| `gemini-review.toml` | Gemini Review | Code review criteria and output format |
| `gemini-triage.toml` | Gemini Triage | Single-issue label classification |
| `gemini-scheduled-triage.toml` | Gemini Scheduled Triage | Batch issue triage with JSON output |

---

## Non-Gemini Workflows

### Pipeline

- **File:** `.github/workflows/pipeline.yml`
- **Trigger:** Push and PR to `main`
- **Purpose:** CI/CD pipeline — builds, lints, typechecks, tests, and runs all verification scripts (`bin/check` equivalent).

### Stale

- **File:** `.github/workflows/stale.yml`
- **Trigger:** Scheduled
- **Purpose:** Marks and closes stale issues and PRs after a period of inactivity.

### Auto Assign

- **File:** `.github/workflows/auto-assign.yml`
- **Trigger:** PR opened
- **Purpose:** Automatically assigns PR authors as reviewers or assignees.

---

## Safety Boundaries

- **Authentication:** Gemini workflows use GitHub App tokens (not personal tokens) for write operations. The `APP_ID` and `APP_PRIVATE_KEY` are stored as repository secrets.
- **Authorization:** Dispatch only triggers for users with `OWNER`, `MEMBER`, or `COLLABORATOR` association.
- **Concurrency:** Each workflow uses concurrency groups to prevent parallel runs on the same PR/issue.
- **Timeouts:** All Gemini workflows have explicit timeout limits (7–10 minutes).
- **Read-only by default:** Triage workflows only have read permissions; write permissions are scoped to issues and PRs only.
- **No code execution:** Gemini workflows analyze and comment but do not push commits or merge PRs.

## Disabling Automation

To disable Gemini automation:

1. **All Gemini workflows:** Set `GEMINI_ENABLED=false` in repository variables, or delete/disable the workflows in the GitHub UI.
2. **Individual workflows:** Disable specific workflows via the GitHub Actions UI (Settings → Actions → select workflow → Disable).
3. **Debug mode:** Set `GEMINI_DEBUG=true` in repository variables to enable verbose logging without disabling functionality.
