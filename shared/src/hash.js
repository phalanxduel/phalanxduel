import { createHash } from 'node:crypto';
/**
 * Computes a deterministic SHA-256 hash of a JSON-serializable state object.
 * Keys are sorted recursively to ensure consistent ordering.
 */
export function computeStateHash(state) {
    const json = JSON.stringify(state, (_key, value) => {
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            const obj = value;
            return Object.keys(obj)
                .sort()
                .reduce((sorted, k) => {
                sorted[k] = obj[k];
                return sorted;
            }, {});
        }
        return value;
    });
    return createHash('sha256').update(json).digest('hex');
}
//# sourceMappingURL=hash.js.map