---
episode_id: ep-31-ai-mcts-and-mcp-agents
title: "AI Opponents: Adversarial MCTS & MCP Agentic Gameplay"
format: "16:9"
companion_url: "https://phalanxduel.com/build-with-phalanx/"
privacy: private
pronunciation:
  Phalanx: FAY-lanks
  MCTS: M C T S
  MCP: M C P
  UCB1: U C B one
---

<!-- cue:mcts-bots -->
Phalanx Duel ships with a full ladder of AI opponents, culminating in an adversarial Monte Carlo Tree Search engine. It uses UCB1 selection that flips perspective on opponent turns, tactical rollouts, and board evaluation to beat our heuristic bot cleanly.

<!-- cue:mcp-surface -->
Want to pit your own AI agent against the engine? The built-in Model Context Protocol server exposes match creation, legal action enumeration, action submission, position evaluation, and full post-match analysis as native MCP tools.

<!-- cue:live-ai-match -->
Whether you train against Champion MCTS in the browser or wire an autonomous agent over MCP, every AI move passes through the exact same server-authoritative rules engine as human players.
