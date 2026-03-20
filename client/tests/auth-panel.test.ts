import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Sentry before any other imports
vi.mock('@sentry/browser', () => ({
  addBreadcrumb: vi.fn(),
  init: vi.fn(),
  browserTracingIntegration: vi.fn(),
}));

import { h, render } from 'preact';
import { AuthPanel } from '../src/components/AuthPanel';

describe('AuthPanel', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it('renders login form by default', () => {
    render(h(AuthPanel, { onClose: () => {} }), container);
    expect(container.querySelector('h3')?.textContent).toBe('Login');
    expect(container.querySelector('input[type="email"]')).toBeTruthy();
    expect(container.querySelector('input[type="password"]')).toBeTruthy();
    expect(container.querySelector('input[type="text"]')).toBeNull();
  });

  it('switches to register form', async () => {
    render(h(AuthPanel, { onClose: () => {} }), container);
    const toggleBtn = container.querySelector('.btn-text')!;
    toggleBtn.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector('h3')?.textContent).toBe('Register');
    expect(container.querySelector('input[type="text"]')).toBeTruthy();
  });

  it('has role="dialog" and aria-modal', () => {
    render(h(AuthPanel, { onClose: () => {} }), container);
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(h(AuthPanel, { onClose }), container);
    const dialog = container.querySelector('[role="dialog"]')!;
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(h(AuthPanel, { onClose }), container);
    const backdrop = container.querySelector('.auth-modal-backdrop')!;
    backdrop?.click();
    expect(onClose).toHaveBeenCalled();
  });

  it('displays error message on failed login', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid credentials' }),
    });

    render(h(AuthPanel, { onClose: () => {} }), container);
    const emailInput = container.querySelector('input[type="email"]')!;
    const passwordInput = container.querySelector('input[type="password"]')!;
    emailInput.value = 'test@example.com';
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    passwordInput.value = 'password123';
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));

    const form = container.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true }));

    await new Promise((r) => setTimeout(r, 50));
    expect(container.querySelector('.auth-error')?.textContent).toBe('Invalid credentials');
  });
});
