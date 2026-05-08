import { describe, it, expect, beforeAll } from 'vitest';
import { ContentFilterService } from '../src/content-filter';

describe('ContentFilterService', () => {
  beforeAll(async () => {
    await ContentFilterService.getInstance().initialize();
  });

  it('blocks built-in guards', () => {
    const filter = ContentFilterService.getInstance();
    expect(filter.isFlagged('admin')).toBe(true);
    expect(filter.isFlagged('system')).toBe(true);
  });

  it('allows clean names', () => {
    const filter = ContentFilterService.getInstance();
    expect(filter.isFlagged('dragonslayer')).toBe(false);
    expect(filter.isFlagged('coolwarrior99')).toBe(false);
  });

  it('catches substrings in normalized form', () => {
    const filter = ContentFilterService.getInstance();
    expect(filter.isFlagged('XadminX')).toBe(true);
  });

  it('operates on normalized input (lowercase)', () => {
    const filter = ContentFilterService.getInstance();
    expect(filter.isFlagged('ADMIN')).toBe(true);
  });
});
