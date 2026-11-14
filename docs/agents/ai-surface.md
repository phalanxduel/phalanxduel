# AI Surface & Multi-Agent Integration Guide

This repository uses the normalized **zdots platform AI stack**: **Oh-My-Pi (`omp` / `zomp`)** as the primary multi-role AI surface, paired with **Backlog.md**, **Groma.md**, **graphify**, **rtk**, and the 17 canonical skills under `.agents/skills/`.

## 1. Environment Posture (Home vs. Work)

| Environment | Primary Interactive Agents | Local LLM (`llama.cpp` @ `127.0.0.1:11500/v1`) | Cloud / Frontier Routing |
|---|---|---|---|
| **Work (`ZDOTS_CONTEXT=work`)** | **Claude Code** + **Local LLM** (`zomp` local-only) | `zomp`, `zdots-ask`, `ai-query` (strictly loopback `--offline`) | Employer-sanctioned Claude Code or `zomp --work-gateway` (`$ZDOTS_WORK_AI_GATEWAY_URL`) only. Consumer cloud lanes (`--hybrid`, `--or`, `omp-gateway-ctl import-keychain`) are hard-blocked. |
| **Home** | **Oh-My-Pi (`zomp --hybrid`)** + **Local LLM** | Handles OMP `smol` role (commit messages, titles, prewalk) at $0 / zero quota burn | Multi-account pool via `omp-gateway-ctl` (`127.0.0.1:11509` / `11510`) across Gemini CLI, Codex, Copilot, OpenRouter, and HF with automatic `429` rollover. |

## 2. Per-Agent Integration Requirements

Every agent operating in this repository must respect the same repo-local contracts (`AGENTS.md`, `backlog/`, `groma/`, `graphify-out/`, `.agents/skills/`) and global token/safety hooks:

- **Oh-My-Pi (`omp` / `zomp`)**:
  - Launch via `zomp` (strictly local, Work & Home), `zomp --hybrid` (Home multi-account), or `zomp --work-gateway` (Work corporate gateway).
  - Requires global `~/.omp/agent/extensions/rtk.ts` (auto-linked into `zomp` profiles) and reads `AGENTS.md` + `.agents/skills/`.
  - Can import prior sessions from Claude Code (`omp --from-claude`) or Codex (`omp --from-codex`).
- **Claude Code (`claude`)**:
  - Primary Work coding agent alongside Local LLM.
  - Requires global `rtk hook claude` + `@RTK.md` in `~/.claude/settings.json`.
  - Reads `CLAUDE.md` / `AGENTS.md`, `.agents/skills/`, and `backlog/` / `groma/` / `graphify-out/`.
- **Gemini CLI (`gm` / `gemini-invoke`)**:
  - Requires global `rtk hook gemini` in `~/.gemini/hooks/rtk-hook-gemini.sh` and reads `GEMINI.md` / `AGENTS.md`.
  - Query `graphify-out/graph.json` (`graphify query "<question>"`) before broad file scans.
  - At Home, authenticate `google-gemini-cli` in `omp-gateway-ctl login google-gemini-cli` so OMP can pool Gemini quota.
- **Codex CLI (`codex`)**:
  - Requires global `rtk hook codex` in `~/.codex/hooks.json` + `@RTK.md` in `~/.codex/AGENTS.md`.
  - At Home, authenticate `openai-codex` in `omp-gateway-ctl login openai-codex` so OMP can pool Codex quota.
- **Local LLM (`llama.cpp` via `llama-ctl`)**:
  - Must be running on `127.0.0.1:11500/v1` (`llama-ctl start`) for `zomp` (`llamacpp/local`), `zdots-ask`, `ai-query`, and `zaider`.
  - Always safe for PHI-adjacent and Work tasks; zero external network egress.

## 3. Shared Non-Negotiable Rules

1. **No AI Attribution**: Never add `Co-Authored-By:`, "Generated with …", 🤖 badges, or session links in commits, PRs, code, or docs.
2. **Signed Commits**: All commits use the operator's 1Password SSH signing key. Never pass `--no-gpg-sign`.
3. **Architecture & Task Hygiene**: Query `graphify-out/graph.json`, respect `groma/architecture.json` C4 boundaries (`groma agent-instructions`), and track work via `backlog` CLI (`backlog/`).
