/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 */

import { useState } from 'preact/hooks';

interface ResetPasswordPanelProps {
  token: string;
  onClose: () => void;
}

export function ResetPasswordPanel({ token, onClose }: ResetPasswordPanelProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('PASSWORDS_MISMATCH: Data integrity check failed.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'RESET_FAILED: Uplink rejected.');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('NETWORK_ERROR: Carrier lost.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div class="auth-modal-backdrop">
        <div class="auth-panel" role="dialog">
          <h3>ACCESS_RESTORED</h3>
          <p class="meta-tag" style="color: var(--color-green); margin-bottom: 1.5rem">
            CREDENTIALS_UPDATED: Your security protocol has been refreshed.
          </p>
          <button class="btn btn-primary" onClick={onClose}>
            RETURN_TO_LOGIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      class="auth-modal-backdrop"
      onClick={(e) => {
        if ((e.target as HTMLElement).classList.contains('auth-modal-backdrop')) onClose();
      }}
    >
      <div class="auth-panel" role="dialog">
        <h3>REESTABLISH_CREDENTIALS</h3>
        <p class="meta-tag" style="margin-bottom: 1rem">
          TOKEN_VALIDATED: Define new security sequence.
        </p>

        {error && (
          <p class="auth-error" role="alert">
            {error}
          </p>
        )}

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
        >
          <div class="form-group">
            <label for="reset-password">New Password</label>
            <input
              id="reset-password"
              type="password"
              placeholder="Minimum 8 characters"
              value={password}
              onInput={(e) => {
                setPassword(e.currentTarget.value);
              }}
              required
              minLength={8}
            />
          </div>
          <div class="form-group">
            <label for="reset-confirm">Confirm Password</label>
            <input
              id="reset-confirm"
              type="password"
              placeholder="Re-enter password"
              value={confirm}
              onInput={(e) => {
                setConfirm(e.currentTarget.value);
              }}
              required
            />
          </div>
          <button type="submit" class="btn btn-primary" disabled={loading}>
            {loading ? 'PROCESSING...' : 'UPDATE_SECURITY_SEQUENCE'}
          </button>
        </form>
        <button class="btn-text" onClick={onClose}>
          CANCEL
        </button>
      </div>
    </div>
  );
}
