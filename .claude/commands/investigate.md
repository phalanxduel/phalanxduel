# /investigate

Research a bug, behavior, or question about this codebase efficiently.

## Steps

1. State the question clearly in one sentence
2. Search code with `Grep` before reading files — find the symbol, then read only the relevant lines
3. Check `git log --oneline -20` if the question is about recent changes
4. Check `backlog/tasks/` for related task context if the question involves a known feature
5. Report findings as: **what you found**, **where it is** (file:line), **why it matters**

## Token-saving tips

- `Grep` with `output_mode: "content"` + `head_limit: 30` before reading whole files
- Read with `offset` + `limit` to get only the relevant section
- Use `Explore` agent for multi-file investigations that would take >3 Grep rounds
- Avoid reading files you already have in context
