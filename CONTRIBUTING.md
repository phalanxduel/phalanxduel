# Contributing to Phalanx Duel

Thank you for your interest in contributing! This document outlines our workflow, standards, and expectations.

## 🛠️ Getting Started

For technical setup, running the app locally, and common developer workflows, please refer to the **[Development Guide](docs/development.md)**.

## 🤝 Contribution Workflow

1.  **Find a Task**: Check the `backlog/` directory or GitHub Issues for prioritized work.
2.  **Create a PR**: We follow a "Single-threaded on main" policy for small edits, but larger features should use descriptive PRs.
3.  **Validate**: Ensure `pnpm verify:quick` passes locally before opening a PR.
4.  **Review**: All PRs require review from at least one maintainer.

## ✅ Definition of Done (DoD)

A task is considered complete when:
1.  Code passes all linting, type-checking, and tests (`pnpm verify:quick`).
2.  Gameplay changes are verified via `pnpm qa:playthrough:verify`.
3.  Documentation is updated (Architecture, README, or specific guides).
4.  Observability is considered (Spans, Events, or Logs).

See **[docs/reference/dod.md](docs/reference/dod.md)** for the detailed checklist.

## 🤖 AI Collaboration

If you are using AI assistants (like Claude, Gemini, or Copilot), please ensure you follow the guidelines in **[AGENTS.md](AGENTS.md)**.

- AI output must be reviewed and tested by a human.
- Do not bypass project safeguards (e.g., never use `--no-verify`).
- Mark AI-generated content clearly if it hasn't been fully verified.

## 📐 Standards & Principles

- **Deterministic Rules**: The engine must remain 100% deterministic.
- **Server Authority**: The server is the ultimate source of truth for match state.
- **Minimal Dependencies**: Prefer native solutions and standard libraries.
- **Small Commits**: Commit often, keep them focused.

## 📄 Documentation

- Documentation belongs in `docs/`.
- Use Architectural Decision Records (ADRs) in `docs/adr/` for significant design choices.
- Keep the wiki index (`docs/README.md`) updated.

## 🛡️ Security

Report vulnerabilities according to our **[Security Policy](.github/SECURITY.md)**. Never commit secrets or PII.
