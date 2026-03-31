# Phalanx Duel — Development Tools
# Usage: brew bundle

# --- Security & Hardening ---

# Gitleaks: Scans git history and staged changes for secrets (API keys, tokens).
# Used in pre-commit hooks to prevent accidental credential leakage.
brew "gitleaks"

# Trufflehog: High-fidelity secret scanner that searches for 
# secrets across git repositories and filesystems.
brew "trufflehog"

# --- Infrastructure & Deployment ---

# K6: Load testing tool for HTTP and WebSockets.
# Used for 'tests/load/phalanxduel-load.js' to verify performance SLOs.
brew "k6"

# Docker CLI: Required for local compose workflows and OTEL collector helpers.
# Used by 'pnpm docker:*', 'bin/maint/run-otel-collector.sh', and related scripts.
brew "docker"

# Colima: Local container runtime used for the centralized local LGTM stack.
# Required for the documented Colima-backed observability workflow in AGENTS.md.
brew "colima"

# Act: Runs GitHub Actions workflows locally for pre-CI validation.
# Used via the documented 'act' commands in AGENTS.md.
brew "act"

# Flyctl: CLI for managing Fly.io applications (deployments, secrets, logs).
# Required for 'pnpm deploy:run:*' and 'scripts/release/deploy-fly.sh'.
brew "flyctl"

# Mise: Polyglot tool manager (successor to asdf).
# Manages Node.js, PNPM, and other runtime versions via 'mise.toml'.
brew "mise"

# Dashing: Builds the Dash.app docset from the generated API and curated system docs.
# Required for 'pnpm docs:dash'.
brew "dashing"
