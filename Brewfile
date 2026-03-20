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

# Flyctl: CLI for managing Fly.io applications (deployments, secrets, logs).
# Required for 'pnpm deploy:run:*' and 'scripts/release/deploy-fly.sh'.
brew "flyctl"

# Mise: Polyglot tool manager (successor to asdf).
# Manages Node.js, PNPM, and other runtime versions via 'mise.toml'.
brew "mise"
