import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { h, render } from 'preact';
import { CopyButton } from '../src/components/CopyButton';

describe('CopyButton', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  async function flushUpdates(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
  }

  it('shows success feedback and resets after copying', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn(() => Promise.resolve()) },
    });

    render(
      h(CopyButton, { label: 'Copy Link', getValue: () => 'https://example.test' }),
      container,
    );

    const button = container.querySelector('button') as HTMLButtonElement;
    button.click();
    await flushUpdates();

    expect(button.textContent).toBe('Copied');
    expect(container.textContent).toContain('Copy Link copied to clipboard.');

    vi.advanceTimersByTime(2000);
    await flushUpdates();
    expect(button.textContent).toBe('Copy Link');
  });

  it('shows error feedback when clipboard write fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn(() => Promise.reject(new Error('denied'))) },
    });

    render(h(CopyButton, { label: 'Copy Code', getValue: () => 'ABC-123' }), container);

    const button = container.querySelector('button') as HTMLButtonElement;
    button.click();
    await flushUpdates();

    expect(button.textContent).toBe('Copy failed');
    expect(container.textContent).toContain('Unable to copy copy code.');
  });
});
