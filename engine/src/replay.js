import { createInitialState, drawCards } from './state.js';
import { applyAction } from './turns.js';
/**
 * PHX-TXLOG-003: Replay a game from its initial config and ordered actions.
 *
 * Creates initial state, draws cards, sets deployment phase, then applies
 * each action in order. Returns the final state and whether replay succeeded.
 */
export function replayGame(config, actions, options) {
    let state = createInitialState(config);
    state = drawCards(state, 0, 12);
    state = drawCards(state, 1, 12);
    state = { ...state, phase: 'deployment' };
    const applyOptions = options?.hashFn
        ? { hashFn: options.hashFn }
        : undefined;
    for (let i = 0; i < actions.length; i++) {
        try {
            state = applyAction(state, actions[i], applyOptions);
        }
        catch (err) {
            return {
                finalState: state,
                valid: false,
                failedAtIndex: i,
                error: err instanceof Error ? err.message : 'Unknown error',
            };
        }
    }
    return { finalState: state, valid: true };
}
//# sourceMappingURL=replay.js.map