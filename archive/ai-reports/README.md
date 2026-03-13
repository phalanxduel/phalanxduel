# AI Reports Archive

This directory holds archived AI-generated review prompts, generated reviews, and audit artifacts that previously lived in `docs/review/archive/`.

The primary goal of this archive is to:
- Keep `docs/review/` focused on active, high-quality review guidance.
- Preserve the historical corpus of AI analysis for comparison and progress tracking.
- Prevent "context drift" in current tools by separating legacy reports from active project documentation.

## Archive Layout

- `/archive/ai-reports/2026-03-11/`: Initial large-scale production readiness and documentation audit across multiple models (Gemini, GPT-5, Claude-Opus, Gordon, etc.).
  - Original prompts used for the reviews.
  - Generated production readiness reports.
  - Detailed JSON documentation audits.

## Canonical Layout For New Runs

Historical archive contents predate a strict naming convention and are preserved as-is.

For all new generated AI review runs, use this layout:

- `/archive/ai-reports/YYYY-MM-DD/<platform>/<model>/`

Path rules:

- `<platform>` is the tool or client slug, such as `codex`, `cline`, `claude-code`, `cursor`
- `<model>` is the model slug, such as `gpt-5.2`, `chatgpt-5.1`, `opus-4.1`
- both path segments should be lowercase ASCII and use only `a-z`, `0-9`, `.`, `_`, `-`
- replace spaces or slashes with `-`
- do not combine platform and model into one directory name

Recommended filenames:

- `hardening-audit__<agent-id>__reviewer.md`
- `hardening-audit__<agent-id>__synthesis.md`

Example:

- `/archive/ai-reports/2026-03-12/codex/gpt-5.2/hardening-audit__codex-r1__reviewer.md`

## Reference

Current active review documents and guidelines remain in:
- `docs/review/META_ANALYSIS.md`
- `docs/review/PRODUCTION_PATH_REVIEW_GUIDELINE.md`

## Maintenance

When new large-scale automated reports are generated and need to be archived:

- create a new dated subdirectory (e.g., `archive/ai-reports/YYYY-MM-DD/`) rather than overwriting existing ones
- place each agent output under that date's `<platform>/<model>/` directory
- keep generated outputs out of `docs/review/`
- preserve historical inconsistent layouts, but do not reuse them as the pattern for new runs
