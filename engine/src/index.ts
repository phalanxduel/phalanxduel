export const ENGINE_VERSION = '0.1.0';

// The engine package exposes pure, deterministic functions for game rule
// evaluation. All functions are side-effect free: no I/O, no randomness
// (RNG is injected), no transport. This makes every game state transition
// fully testable and replayable.
//
// TODO: implement rule functions as rules are finalized in docs/RULES.md
