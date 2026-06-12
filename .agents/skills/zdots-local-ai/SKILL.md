---
name: zdots-local-ai
description: Use the local zdots AI control plane for Phalanx Duel work. Trigger when a task mentions zdots, agent-guide, capabilities, llama.cpp, local LLMs, ai-query, llama-caps, zdots-ctx, local inference, MCP llama/ctx tools, deployment log analysis with AI, or when Codex should decide whether local AI can safely assist with match analysis, summarization, diagnostics, or knowledge capture.
---

# zdots Local AI

Use this skill to discover and safely use the local zdots ecosystem. Treat
zdots as a live control plane whose capabilities can change between sessions.

## Capability Discovery

Run current checks before relying on local AI:

```bash
rtk agent-guide --json
rtk capabilities --json
rtk llama-caps --json
rtk llama-ctl status
rtk ai-query 'Reply with exactly: local-ai-ok'
```

Interpret `agent-guide` as the routing map, `capabilities` as the current host
profile, `llama-caps` as the model/API contract, and `ai-query` as the direct
smoke test.

If these disagree, trust the direct health/query result for whether inference
is usable now. Report the mismatch briefly.

## Local LLM Contract

When healthy, expect an OpenAI-compatible llama.cpp chat endpoint with:

- model alias `local`; do not use the GGUF filename in API calls
- chat completions, streaming, system role, multi-turn, and tool-use support
- roughly 32k context
- one parallel slot
- no image generation, moderation, or audio transcription from llama.cpp
- embeddings only when a separate embedding service is healthy and configured

Use local inference for cheap summarization, match-analysis drafts, diagnostics,
and second-pass reasoning. Do not use it as the only authority for code,
security, database, or production actions.

## zdots Context Layer

Use the context layer through its tools and commands, not direct database writes:

```bash
rtk zdots-ctx status
rtk zdots-ctx query '<question>'
rtk zdots-ctx capture
rtk zdots-ctx add-lesson '<lesson>'
```

If `zdots-ctx` fails because local Ruby gems or services are unhealthy, note the
failure and continue with repo-local docs and task records.

## Repo Integration

For Phalanx Duel MCP analysis, prefer the repo's MCP tools when available:

- `engine_valid_actions`
- `engine_bot_recommend`
- `engine_llm_recommend`
- `match_analyze`
- `match_get`
- `pipeline_status`

Read `mcp/README.md`, `docs/agents/README.md`, and
`docs/agents/agentic-gameplay.md` for the current tool profile and environment
requirements. Re-check `agent-guide` before hardcoding endpoints; local zdots
may advertise a newer endpoint than older repo docs.

## Safety

- Do not assume local AI is healthy just because a process is running.
- Do not send secrets, production credentials, or private tokens into prompts.
- Do not bypass Phalanx database isolation rules.
- Do not let local AI output replace verification; use it to narrow the next
  concrete command or source file to inspect.
