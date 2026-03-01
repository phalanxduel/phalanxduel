import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/state', () => ({
  getState: vi.fn(() => ({ showHelp: true })),
}));

describe('help module', () => {
  beforeEach(() => {
    // Clear document body between tests
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  describe('HELP_CONTENT', () => {
    it('has entries for all expected keys: lp, battlefield, hand, stats, log', async () => {
      const { HELP_CONTENT } = await import('../src/help');
      expect(Object.keys(HELP_CONTENT)).toEqual(
        expect.arrayContaining(['lp', 'battlefield', 'hand', 'stats', 'log']),
      );
      expect(Object.keys(HELP_CONTENT)).toHaveLength(5);
      for (const entry of Object.values(HELP_CONTENT)) {
        expect(entry).toHaveProperty('title');
        expect(entry).toHaveProperty('body');
        expect(typeof entry.title).toBe('string');
        expect(typeof entry.body).toBe('string');
      }
    });
  });

  describe('renderHelpMarker', () => {
    it('adds a ? button with class .help-marker when showHelp is true', async () => {
      const { renderHelpMarker } = await import('../src/help');
      const container = document.createElement('div');
      renderHelpMarker('lp', container);
      const marker = container.querySelector('.help-marker');
      expect(marker).toBeTruthy();
      expect(marker!.tagName).toBe('BUTTON');
      expect(marker!.textContent).toBe('?');
    });

    it('does nothing for unknown keys', async () => {
      const { renderHelpMarker } = await import('../src/help');
      const container = document.createElement('div');
      renderHelpMarker('nonexistent-key', container);
      expect(container.children).toHaveLength(0);
    });
  });

  describe('renderHelpOverlay', () => {
    it('creates an overlay with class .help-overlay on document.body with correct title', async () => {
      const { renderHelpOverlay } = await import('../src/help');
      renderHelpOverlay('battlefield');
      const overlay = document.body.querySelector('.help-overlay');
      expect(overlay).toBeTruthy();
      const title = overlay!.querySelector('.help-title');
      expect(title).toBeTruthy();
      expect(title!.textContent).toBe('The Battlefield');
    });

    it('does nothing for unknown keys', async () => {
      const { renderHelpOverlay } = await import('../src/help');
      renderHelpOverlay('nonexistent-key');
      const overlay = document.body.querySelector('.help-overlay');
      expect(overlay).toBeNull();
    });
  });
});
