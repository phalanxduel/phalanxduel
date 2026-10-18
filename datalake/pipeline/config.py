"""
Phalanx Duel Datalake Configuration & Repository Discovery.
"""

from pathlib import Path
from typing import Dict, List, NamedTuple

class RepoConfig(NamedTuple):
    name: str
    category: str
    path: Path
    description: str

def discover_repositories() -> List[RepoConfig]:
    """Discover all local repositories under the phalanxduel project root."""
    current_file = Path(__file__).resolve()
    game_dir = current_file.parents[2]
    org_root = game_dir.parent

    candidates = [
        RepoConfig(
            name="game",
            category="core-monorepo",
            path=game_dir,
            description="Core TypeScript monorepo: deterministic engine, server, web client, Go CLI, MCP",
        ),
        RepoConfig(
            name="site",
            category="portal-docs",
            path=org_root / "site",
            description="Jekyll documentation and player portal hosting notebook archives (phalanxduel.com)",
        ),
        RepoConfig(
            name="wiki",
            category="handbook-wiki",
            path=org_root / "wiki",
            description="Architecture documentation, sequence diagrams, and operational runbooks",
        ),
        RepoConfig(
            name="game-swiftui",
            category="native-client",
            path=org_root / "game-swiftui",
            description="Native macOS/iOS SwiftUI client distributed via Homebrew tap",
        ),
        RepoConfig(
            name="monitor",
            category="ops-telemetry",
            path=org_root / "monitor",
            description="Terminal top-style monitoring dashboard for environment & database health",
        ),
        RepoConfig(
            name="phalanx-ruby",
            category="archived-lineage",
            path=org_root / ".archive" / "phalanx-ruby",
            description="Historical 2022 executable prototype exploring combat calculation in Ruby",
        ),
        RepoConfig(
            name="demo-repository",
            category="archived-lineage",
            path=org_root / ".archive" / "demo-repository",
            description="Historical CI and automation experimentation sandbox",
        ),
        RepoConfig(
            name="distributed-ledger",
            category="experimental-worktree",
            path=org_root / ".worktrees" / "distributed-ledger",
            description="Experimental distributed ledger worktree branch",
        ),
    ]

    active_repos = []
    for repo in candidates:
        if (repo.path / ".git").exists():
            active_repos.append(repo)

    return active_repos

def categorize_subsystem(repo_name: str, file_path: str) -> str:
    """Classify a changed file into an architectural subsystem."""
    p = file_path.lower()
    if repo_name == "game":
        if p.startswith("engine/"):
            return "engine"
        elif p.startswith("server/src/mcp"):
            return "mcp"
        elif p.startswith("server/"):
            return "server"
        elif p.startswith("client/"):
            return "client-web"
        elif p.startswith("shared/"):
            return "shared-schema"
        elif p.startswith("clients/go/") or p.startswith("sdk/"):
            return "client-go-sdk"
        elif p.startswith("admin/"):
            return "admin-ui"
        elif p.startswith("docs/adr/"):
            return "docs-adr"
        elif p.startswith("docs/"):
            return "docs"
        elif p.startswith("scripts/") or p.startswith("bin/"):
            return "tooling-ops"
        elif p.startswith("backlog/"):
            return "backlog"
        elif p.startswith(".github/"):
            return "ci-workflows"
        elif p.startswith("tests/") or p.startswith("test/"):
            return "tests"
        else:
            return "root-config"
    elif repo_name == "site":
        if "history" in p or "notebook" in p:
            return "history-notebook"
        elif p.startswith("assets/"):
            return "site-assets"
        return "site-content"
    elif repo_name == "wiki":
        return "wiki-docs"
    elif repo_name == "game-swiftui":
        return "swiftui-client"
    elif repo_name == "monitor":
        return "ops-monitor"
    elif repo_name == "phalanx-ruby":
        return "ruby-prototype"
    return "other"
