# Backlog Best Practices

This guide is the authoritative standard for all agents and contributors to the Phalanx Duel game. Adherence is mandatory for maintaining systemic integrity and velocity.

## 1. The Leverage-First Mindset
Prioritize actions that unlock future capability or reduce dependency debt over superficial feature visibility. If a task does not improve systemic leverage, it is low priority.

## 2. Backlog as the System of Record
The repository's `Backlog.md` (and associated CLI tools) is the *only* planning system. Do not utilize external trackers, Jira, or informal lists. If it isn't in `Backlog.md`, it is not being worked on.

## 3. DAG-Based Sequencing
Tasks exist within a Directed Acyclic Graph. Explicitly document dependencies for every task. Never start a task if its parent dependencies have not been fully completed and validated.

## 4. Execution Waves
Adhere strictly to the wave-based execution model (Waves 0-4). Never skip a prerequisite wave.
*   **Wave 0**: Foundational capabilities/Infrastructure.
*   **Wave 1**: Core gameplay/Engine mechanics.
*   **Wave 2**: Feature implementation.
*   **Wave 3**: UX/UI/Polish.
*   **Wave 4**: Production/Deployment hardening.

## 5. Architectural Convergence
Favor existing abstractions, shared schemas, and established patterns. If an implementation requires introducing a new architectural paradigm or divergence from established design, stop immediately. Propose the divergence as a formal ADR for review.

## 6. Commit Protocol
Commits must be framed as **dependency/capability unlocks**, not just "code changes". Your commit message must clearly state what systemic capacity has been gained or what dependency has been resolved.
