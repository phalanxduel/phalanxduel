# External References

This document records the external references that materially shaped Phalanx
Duel's Definition of Done, review bar, and AI-collaboration expectations.

The goal is not to import every idea from these sources. The goal is to make it
explicit which outside standards and guidance this repository intentionally
borrows from, and how those sources map onto project policy.

Use this document with:

- [`docs/system/DEFINITION_OF_DONE.md`](./DEFINITION_OF_DONE.md)
- [`docs/system/AI_COLLABORATION.md`](./AI_COLLABORATION.md)
- [`.github/CONTRIBUTING.md`](../../.github/CONTRIBUTING.md)
- [`.github/PULL_REQUEST_TEMPLATE.md`](../../.github/PULL_REQUEST_TEMPLATE.md)

## Selection Standard

These sources were selected because they are widely recognized, maintained by
the original steward or a highly trusted institution, and directly relevant to
software delivery, secure development, AI-assisted work, or code review.

## Agile and Definition Of Done

### Scrum Guide 2020

- Source: [Scrum Guide 2020](https://scrumguides.org/scrum-guide.html)
- Why it matters:
  The Scrum Guide defines Definition of Done as a quality commitment, not a
  loose team preference.
- Relevant guidance:
  It describes the Definition of Done as a formal description of the Increment's
  completed state and says it creates transparency through shared understanding.
- Project impact:
  This repo treats Definition of Done as a shared standard that governs release,
  review, and task completion, not as an optional checklist.
- Reflected in:
  [`docs/system/DEFINITION_OF_DONE.md`](./DEFINITION_OF_DONE.md)

## Secure Software and AI Risk

### NIST SP 800-218: Secure Software Development Framework (SSDF)

- Source:
  [NIST SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final)
- Why it matters:
  SSDF is a high-trust baseline for integrating security practices throughout
  software development.
- Relevant guidance:
  It frames secure development as a lifecycle concern aimed at reducing software
  vulnerability risk.
- Project impact:
  Security, verification, documentation, and operational readiness are treated
  as part of completion, not as late follow-up work.
- Reflected in:
  [`docs/system/DEFINITION_OF_DONE.md`](./DEFINITION_OF_DONE.md),
  [`docs/system/AI_COLLABORATION.md`](./AI_COLLABORATION.md)

### NIST SP 800-218A: SSDF Community Profile for Generative AI

- Source:
  [NIST SP 800-218A](https://csrc.nist.gov/pubs/sp/800/218/a/final)
- Why it matters:
  It extends SSDF thinking into generative AI and dual-use foundation model
  development.
- Relevant guidance:
  It makes AI-specific secure development and evaluation concerns explicit.
- Project impact:
  AI-assisted work in this repo is expected to meet explicit security,
  validation, and review expectations rather than being treated as a lower-bar
  shortcut.
- Reflected in:
  [`docs/system/AI_COLLABORATION.md`](./AI_COLLABORATION.md),
  [`docs/system/DEFINITION_OF_DONE.md`](./DEFINITION_OF_DONE.md)

### NIST AI RMF 1.0

- Source:
  [NIST AI RMF 1.0](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-ai-rmf-10)
- Why it matters:
  AI RMF is one of the most broadly cited public frameworks for governing
  trustworthy AI work.
- Relevant guidance:
  It centers context-specific risk management and trustworthy AI properties,
  rather than assuming generic AI quality claims are enough.
- Project impact:
  This repo uses trustworthiness lenses such as reliability, security,
  transparency, explainability, privacy, and fairness when evaluating AI
  collaboration and trust-critical gameplay/runtime changes.
- Reflected in:
  [`docs/system/AI_COLLABORATION.md`](./AI_COLLABORATION.md)

### NIST AI RMF Playbook

- Source:
  [NIST AI RMF Playbook](https://www.nist.gov/itl/ai-risk-management-framework/nist-ai-rmf-playbook)
- Why it matters:
  The Playbook turns AI RMF into operational actions across Govern, Map,
  Measure, and Manage.
- Relevant guidance:
  It provides practical actions and references instead of stopping at abstract
  framework language.
- Project impact:
  Repo policy emphasizes measurable verification, explicit governance, and
  observable evidence instead of informal confidence.
- Reflected in:
  [`docs/system/AI_COLLABORATION.md`](./AI_COLLABORATION.md),
  [`docs/system/DEFINITION_OF_DONE.md`](./DEFINITION_OF_DONE.md)

### NIST AI RMF Generative AI Profile

- Source:
  [NIST AI RMF Generative AI Profile](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence)
- Why it matters:
  It adapts AI RMF thinking to generative AI use cases and risks.
- Relevant guidance:
  It reinforces that generative systems need explicit guardrails, context, and
  evaluation rather than generic optimism.
- Project impact:
  This repo explicitly treats AI-generated code, review comments, and workflow
  instructions as requiring bounded scope and validation.
- Reflected in:
  [`docs/system/AI_COLLABORATION.md`](./AI_COLLABORATION.md)

## AI Collaboration and Instruction Design

### GitHub Copilot: Best Practices for Task Work

- Source:
  [GitHub Copilot best practices for task work](https://docs.github.com/en/copilot/tutorials/coding-agent/get-the-best-results)
- Why it matters:
  This is official vendor guidance for how AI coding-agent tasks should be
  framed to get reliable results.
- Relevant guidance:
  It recommends clear, well-scoped tasks with complete acceptance criteria and
  directions about the relevant files.
- Project impact:
  Repo guidance now requires explicit task framing, verification commands, and
  bounded task scope for AI-assisted work.
- Reflected in:
  [`docs/system/AI_COLLABORATION.md`](./AI_COLLABORATION.md),
  [`.github/CONTRIBUTING.md`](../../.github/CONTRIBUTING.md)

### GitHub Copilot: Repository Custom Instructions

- Source:
  [GitHub Copilot repository custom instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions)
- Why it matters:
  This is the canonical source for how GitHub expects repo-wide and
  path-specific instructions to be structured.
- Relevant guidance:
  It supports both repository-wide and path-specific instructions, and warns
  against conflicting instruction sets.
- Project impact:
  This repo now documents concise repo-wide instructions and path-specific trust
  boundary instructions instead of putting everything into one oversized prompt.
- Reflected in:
  [`.github/copilot-instructions.md`](../../.github/copilot-instructions.md),
  [`.github/instructions/trust-boundaries.instructions.md`](../../.github/instructions/trust-boundaries.instructions.md),
  [`docs/system/AI_COLLABORATION.md`](./AI_COLLABORATION.md)

### GitHub Copilot: Responsible Use of Coding Agent

- Source:
  [GitHub Copilot responsible use](https://docs.github.com/en/copilot/responsible-use/copilot-coding-agent)
- Why it matters:
  It is official guidance on the capabilities, limitations, and security posture
  of GitHub's coding agent.
- Relevant guidance:
  It says users remain responsible for reviewing and validating Copilot output,
  and to continue using security best practices while understanding the agent's
  limitations.
- Project impact:
  Human review and validation remain mandatory for AI-assisted work in this
  repository.
- Reflected in:
  [`docs/system/AI_COLLABORATION.md`](./AI_COLLABORATION.md),
  [`docs/system/DEFINITION_OF_DONE.md`](./DEFINITION_OF_DONE.md)

## Code Review Quality

### Google Engineering Practices: The Standard of Code Review

- Source:
  [The Standard of Code Review](https://google.github.io/eng-practices/review/reviewer/standard.html)
- Why it matters:
  It is one of the clearest and most widely cited public descriptions of what
  good review is for.
- Relevant guidance:
  It treats long-term code health as the core standard, not just immediate
  mergeability.
- Project impact:
  This repo's review expectations emphasize maintainability, design fit, and
  trust-boundary integrity instead of just "tests passed."
- Reflected in:
  [`docs/system/AI_COLLABORATION.md`](./AI_COLLABORATION.md),
  [`.github/PULL_REQUEST_TEMPLATE.md`](../../.github/PULL_REQUEST_TEMPLATE.md)

### Google Engineering Practices: What to Look for in a Code Review

- Source:
  [What to look for in a code review](https://google.github.io/eng-practices/review/reviewer/looking-for.html)
- Why it matters:
  It gives a compact, practical review lens covering design, tests, and
  documentation.
- Relevant guidance:
  It explicitly says design is the most important review concern, expects tests
  appropriate to the change, and asks that build/test/release docs be updated
  when workflows change.
- Project impact:
  This repo's PR template and DoD now ask for risk-matched verification,
  explicit traceability, and documentation updates when behavior or workflows
  change.
- Reflected in:
  [`docs/system/DEFINITION_OF_DONE.md`](./DEFINITION_OF_DONE.md),
  [`.github/PULL_REQUEST_TEMPLATE.md`](../../.github/PULL_REQUEST_TEMPLATE.md)

## How To Use This Catalog

- Prefer these sources when explaining why the repo expects explicit Definition
  of Done, secure development, or human review of AI-assisted work.
- Do not quote them as substitutes for project policy. The project policy lives
  in the repo docs.
- If repo policy evolves away from one of these references, update this catalog
  and explain the reason in the relevant internal doc.
