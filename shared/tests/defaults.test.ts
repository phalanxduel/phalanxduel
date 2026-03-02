import { describe, it, expect } from 'vitest';
import { DEFAULT_MATCH_PARAMS, MatchParametersSchema } from '../src/schema';

describe('DEFAULT_MATCH_PARAMS', () => {
  it('has rows=2, columns=4 as default', () => {
    expect(DEFAULT_MATCH_PARAMS.rows).toBe(2);
    expect(DEFAULT_MATCH_PARAMS.columns).toBe(4);
  });

  it('passes MatchParametersSchema validation', () => {
    const result = MatchParametersSchema.safeParse(DEFAULT_MATCH_PARAMS);
    expect(result.success).toBe(true);
  });

  it('satisfies initialDraw formula (rows*columns + columns)', () => {
    expect(DEFAULT_MATCH_PARAMS.initialDraw).toBe(
      DEFAULT_MATCH_PARAMS.rows * DEFAULT_MATCH_PARAMS.columns + DEFAULT_MATCH_PARAMS.columns,
    );
  });

  it('has maxHandSize equal to columns', () => {
    expect(DEFAULT_MATCH_PARAMS.maxHandSize).toBe(DEFAULT_MATCH_PARAMS.columns);
  });

  it('has strict mode parity between top-level and classic block', () => {
    expect(DEFAULT_MATCH_PARAMS.rows).toBe(DEFAULT_MATCH_PARAMS.classic.battlefield.rows);
    expect(DEFAULT_MATCH_PARAMS.columns).toBe(DEFAULT_MATCH_PARAMS.classic.battlefield.columns);
  });
});
