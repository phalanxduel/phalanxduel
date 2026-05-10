---
id: m-13
title: "AI Engine & Agentic Gameplay"
---

## Description

Safety hardening, match isolation (is_automated), LLM-driven move selection (engine_llm_recommend), and named bot difficulty tiers (scout→champion). Covers all work from ADR-029 through ADR-031. Critical path: security fix → DB backup tooling → is_automated migration chain (local → staging → production) → bot tier engine work → MCP exposure → docs.
