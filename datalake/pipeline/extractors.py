"""
Extractors for Phalanx Duel Datalake:
- Git Commits & File Churn
- Git Tags
- GitHub Organization Repos, Releases & PRs
- Backlog Tasks
- Architectural Decision Records (ADRs)
- Project Dependencies
"""

import datetime
import json
import os
import re
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .config import RepoConfig, categorize_subsystem

def run_cmd(cmd: List[str], cwd: Optional[Path] = None) -> str:
    """Run a subprocess command and return decoded stdout."""
    try:
        res = subprocess.run(
            cmd,
            cwd=str(cwd) if cwd else None,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True,
        )
        return res.stdout
    except Exception as e:
        return ""

def parse_yaml_frontmatter(content: str) -> Tuple[Dict[str, Any], str]:
    """Parse YAML frontmatter enclosed in --- markers without external dependencies."""
    frontmatter = {}
    body = content
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            fm_text = parts[1]
            body = parts[2].strip()
            current_key = None
            current_list = None
            for line in fm_text.splitlines():
                line = line.rstrip()
                if not line or line.startswith("#"):
                    continue
                if line.startswith("  - ") and current_key:
                    if current_list is None:
                        current_list = []
                        frontmatter[current_key] = current_list
                    val = line[4:].strip().strip("'\"")
                    current_list.append(val)
                elif ":" in line:
                    current_list = None
                    key, val = line.split(":", 1)
                    key = key.strip()
                    val = val.strip().strip("'\"")
                    current_key = key
                    if val == "[]":
                        frontmatter[key] = []
                    elif val.lower() == "true":
                        frontmatter[key] = True
                    elif val.lower() == "false":
                        frontmatter[key] = False
                    elif val.isdigit():
                        frontmatter[key] = int(val)
                    else:
                        frontmatter[key] = val
    return frontmatter, body

def extract_git_history(repo: RepoConfig) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Extract full commit history and file churn using git log with numstat.
    Returns (commits, file_churn).
    """
    cmd = [
        "git",
        "log",
        "--numstat",
        "--format=COMMIT|%H|%an|%ae|%at|%ad|%s",
        "--date=iso",
    ]
    raw = run_cmd(cmd, cwd=repo.path)
    if not raw:
        return [], []

    commits: List[Dict[str, Any]] = []
    file_churn: List[Dict[str, Any]] = []

    current_commit: Optional[Dict[str, Any]] = None
    commit_insertions = 0
    commit_deletions = 0
    commit_files_changed = 0

    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue

        if line.startswith("COMMIT|"):
            if current_commit:
                current_commit["insertions"] = commit_insertions
                current_commit["deletions"] = commit_deletions
                current_commit["files_changed"] = commit_files_changed
                commits.append(current_commit)

            parts = line.split("|")
            commit_hash = parts[1]
            author_name = parts[2]
            author_email = parts[3]
            timestamp = int(parts[4])
            date_str = parts[5]
            subject = "|".join(parts[6:])

            # Parse conventional commit type & scope
            match = re.match(r"^([a-zA-Z]+)(?:\(([^)]+)\))?:\s*(.+)$", subject)
            commit_type = match.group(1).lower() if match else "other"
            scope = match.group(2) if match else None

            # Convert timestamp to ISO YYYY-MM-DD
            dt = datetime.datetime.fromtimestamp(timestamp, tz=datetime.timezone.utc)
            year_month = dt.strftime("%Y-%m")
            date_iso = dt.strftime("%Y-%m-%d")

            current_commit = {
                "commit_hash": commit_hash,
                "repo_name": repo.name,
                "category": repo.category,
                "author_name": author_name,
                "author_email": author_email,
                "timestamp": timestamp,
                "date_iso": date_iso,
                "year_month": year_month,
                "subject": subject,
                "commit_type": commit_type,
                "scope": scope,
                "insertions": 0,
                "deletions": 0,
                "files_changed": 0,
            }
            commit_insertions = 0
            commit_deletions = 0
            commit_files_changed = 0
        else:
            # Numstat line: <insertions>\t<deletions>\t<file_path>
            parts = line.split("\t")
            if len(parts) >= 3 and current_commit:
                raw_ins, raw_del, file_path = parts[0], parts[1], parts[2]
                ins = int(raw_ins) if raw_ins.isdigit() else 0
                dels = int(raw_del) if raw_del.isdigit() else 0
                commit_insertions += ins
                commit_deletions += dels
                commit_files_changed += 1

                ext = Path(file_path).suffix.lstrip(".").lower() or "none"
                subsystem = categorize_subsystem(repo.name, file_path)

                file_churn.append({
                    "commit_hash": current_commit["commit_hash"],
                    "repo_name": repo.name,
                    "date_iso": current_commit["date_iso"],
                    "year_month": current_commit["year_month"],
                    "file_path": file_path,
                    "subsystem": subsystem,
                    "file_extension": ext,
                    "insertions": ins,
                    "deletions": dels,
                    "net_lines": ins - dels,
                })

    if current_commit:
        current_commit["insertions"] = commit_insertions
        current_commit["deletions"] = commit_deletions
        current_commit["files_changed"] = commit_files_changed
        commits.append(current_commit)

    return commits, file_churn

def extract_tags(repo: RepoConfig) -> List[Dict[str, Any]]:
    """Extract git tags and release versions."""
    cmd = ["git", "tag", "-l", "--format=%(refname:short)|%(creatordate:iso8601)|%(objectname:short)"]
    raw = run_cmd(cmd, cwd=repo.path)
    tags = []
    for line in raw.splitlines():
        line = line.strip()
        if not line or "|" not in line:
            continue
        parts = line.split("|")
        tag_name = parts[0]
        date_str = parts[1] if len(parts) > 1 else ""
        commit_hash = parts[2] if len(parts) > 2 else ""
        date_iso = date_str[:10] if len(date_str) >= 10 else ""

        tags.append({
            "repo_name": repo.name,
            "tag_name": tag_name,
            "date_iso": date_iso,
            "commit_hash": commit_hash,
        })
    return tags

def extract_github_metadata() -> Dict[str, Any]:
    """Extract GitHub org repos, releases, and PRs via gh CLI."""
    repos_json = run_cmd(["gh", "repo", "list", "phalanxduel", "--json", "name,nameWithOwner,description,isArchived,visibility,updatedAt,defaultBranchRef"])
    repos_data = []
    if repos_json:
        try:
            raw_list = json.loads(repos_json)
            for r in raw_list:
                repos_data.append({
                    "name": r.get("name"),
                    "full_name": r.get("nameWithOwner"),
                    "description": r.get("description", ""),
                    "is_archived": r.get("isArchived", False),
                    "visibility": r.get("visibility", "public"),
                    "updated_at": r.get("updatedAt", ""),
                    "default_branch": r.get("defaultBranchRef", {}).get("name", "main"),
                })
        except Exception:
            pass

    releases_json = run_cmd(["gh", "release", "list", "-R", "phalanxduel/phalanxduel", "--json", "tagName,name,publishedAt,isLatest"])
    releases_data = []
    if releases_json:
        try:
            releases_data = json.loads(releases_json)
        except Exception:
            pass

    prs_json = run_cmd(["gh", "pr", "list", "-R", "phalanxduel/phalanxduel", "--state", "all", "--limit", "50", "--json", "number,title,state,author,createdAt,mergedAt"])
    prs_data = []
    if prs_json:
        try:
            raw_prs = json.loads(prs_json)
            for pr in raw_prs:
                prs_data.append({
                    "number": pr.get("number"),
                    "title": pr.get("title"),
                    "state": pr.get("state"),
                    "author": pr.get("author", {}).get("login", ""),
                    "created_at": pr.get("createdAt", ""),
                    "merged_at": pr.get("mergedAt", ""),
                })
        except Exception:
            pass

    return {
        "repositories": repos_data,
        "releases": releases_data,
        "prs": prs_data,
    }

def extract_backlog_tasks(game_path: Path) -> List[Dict[str, Any]]:
    """Extract all tasks from backlog/tasks/*.md."""
    tasks_dir = game_path / "backlog" / "tasks"
    if not tasks_dir.exists():
        return []

    tasks = []
    for file_path in tasks_dir.glob("*.md"):
        try:
            text = file_path.read_text(encoding="utf-8")
            fm, body = parse_yaml_frontmatter(text)
            task_id = fm.get("id") or file_path.stem.split(" - ")[0].upper()
            title = fm.get("title") or file_path.stem
            status = fm.get("status") or "Unknown"
            priority = fm.get("priority") or "medium"
            milestone = fm.get("milestone") or "General"
            labels = fm.get("labels") or []
            updated_date = fm.get("updated_date") or ""
            deps = fm.get("dependencies") or []

            tasks.append({
                "task_id": str(task_id),
                "title": str(title),
                "status": str(status),
                "priority": str(priority),
                "milestone": str(milestone),
                "labels": json.dumps(labels) if isinstance(labels, list) else str(labels),
                "dependencies_count": len(deps) if isinstance(deps, list) else 0,
                "updated_date": str(updated_date),
                "file_path": str(file_path.relative_to(game_path)),
            })
        except Exception:
            continue
    return tasks

def extract_adrs(game_path: Path) -> List[Dict[str, Any]]:
    """Extract all Architectural Decision Records from docs/adr/."""
    adr_dir = game_path / "docs" / "adr"
    if not adr_dir.exists():
        return []

    adrs = []
    for file_path in adr_dir.glob("ADR-*.md"):
        try:
            text = file_path.read_text(encoding="utf-8")
            fm, body = parse_yaml_frontmatter(text)
            adr_id = fm.get("id") or file_path.stem.split("-")[0] + "-" + file_path.stem.split("-")[1]
            title = fm.get("title") or file_path.stem
            status = fm.get("status") or "accepted"
            date = fm.get("date") or ""
            owner = fm.get("owner") or "Architecture Team"

            adrs.append({
                "adr_id": str(adr_id),
                "file_name": file_path.name,
                "title": str(title),
                "status": str(status),
                "date": str(date),
                "owner": str(owner),
            })
        except Exception:
            continue
    return sorted(adrs, key=lambda x: x["file_name"])

def extract_dependencies(game_path: Path) -> List[Dict[str, Any]]:
    """Extract dependency graph components across workspaces and root package.json."""
    deps = []
    # Root package.json
    root_pkg = game_path / "package.json"
    if root_pkg.exists():
        try:
            data = json.loads(root_pkg.read_text(encoding="utf-8"))
            for name, version in data.get("dependencies", {}).items():
                deps.append({"project": "root", "dep_type": "production", "name": name, "version": version})
            for name, version in data.get("devDependencies", {}).items():
                deps.append({"project": "root", "dep_type": "development", "name": name, "version": version})
        except Exception:
            pass

    # Sub-packages (engine, server, client, shared)
    for pkg_dir in ["engine", "server", "client", "shared", "admin"]:
        pkg_file = game_path / pkg_dir / "package.json"
        if pkg_file.exists():
            try:
                data = json.loads(pkg_file.read_text(encoding="utf-8"))
                for name, version in data.get("dependencies", {}).items():
                    deps.append({"project": pkg_dir, "dep_type": "production", "name": name, "version": version})
                for name, version in data.get("devDependencies", {}).items():
                    deps.append({"project": pkg_dir, "dep_type": "development", "name": name, "version": version})
            except Exception:
                pass

    return deps
