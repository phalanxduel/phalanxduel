import { describe, it, expect, beforeEach } from 'vitest';

describe('renderDebugButton', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('renders a button with test error text', async () => {
    const { renderDebugButton } = await import('../src/debug');
    renderDebugButton(container);

    const btn = container.querySelector('button');
    expect(btn).toBeTruthy();
    expect(btn?.textContent).toBe('Trigger Test Error');
  });

  it('applies subtle styling', async () => {
    const { renderDebugButton } = await import('../src/debug');
    renderDebugButton(container);

    const btn = container.querySelector('button')!;
    expect(btn.style.marginTop).toBe('1rem');
    expect(btn.style.opacity).toBe('0.5');
  });

  it('has a click handler that throws telemetry verification error', async () => {
    const { renderDebugButton } = await import('../src/debug');
    renderDebugButton(container);

    const btn = container.querySelector('button')!;
    const errors: Error[] = [];
    const handler = (e: ErrorEvent) => {
      errors.push(e.error as Error);
      e.preventDefault();
    };
    window.addEventListener('error', handler);
    try {
      btn.click();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBeInstanceOf(Error);
      expect(errors[0]!.message).toBe('Telemetry Verification Error');
    } finally {
      window.removeEventListener('error', handler);
    }
  });
});
