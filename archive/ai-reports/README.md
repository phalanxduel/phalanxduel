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

## Reference

Current active review documents and guidelines remain in:
- `docs/review/META_ANALYSIS.md`
- `docs/review/PRODUCTION_PATH_REVIEW_GUIDELINE.md`

## Maintenance

When new large-scale automated reports are generated and need to be archived, create a new dated subdirectory (e.g., `archive/ai-reports/YYYY-MM-DD/`) rather than overwriting existing ones.
