/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 */

import { useState } from 'preact/hooks';
import type { AppState } from '../state';
import { setUser } from '../state';
import { getToken, logout } from '../auth';

interface SettingsPanelProps {
  state: AppState;
  onClose: () => void;
}

export function SettingsPanel({ state, onClose }: SettingsPanelProps) {
  const { user } = state;
  if (!user) return null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [purgePassword, setPurgePassword] = useState('');

  const updatePreference = async (key: string, value: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch('/api/auth/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [key]: value }),
      });

      if (!response.ok) throw new Error('Failed to update preferences');

      // Optimistically update local state
      setUser({
        ...user,
        [key]: value,
      });
    } catch {
      setError('COMM_FAILURE: Preferences not synchronized.');
    } finally {
      setSaving(false);
    }
  };

  const toggleMarketing = async (value: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch('/api/auth/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ marketingConsent: value }),
      });

      if (!response.ok) throw new Error('Failed to update preferences');

      setUser({
        ...user,
        marketingConsentAt: value ? new Date().toISOString() : null,
      });
    } catch {
      setError('COMM_FAILURE: Preferences not synchronized.');
    } finally {
      setSaving(false);
    }
  };

  const handlePurge = async () => {
    if (!purgePassword) return;
    setSaving(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch('/api/auth/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: purgePassword }),
      });

      if (response.status === 401) {
        setError('AUTH_FAILURE: Incorrect authorization code.');
        return;
      }

      if (!response.ok) throw new Error('Purge failed');

      // Success! User is gone.
      await logout();
      window.location.reload();
    } catch {
      setError('CRITICAL_FAILURE: The Purge could not be initialized.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="auth-panel brutalist-panel">
      <div class="auth-header">
        <h2 class="auth-title">OPERATIVE_SETTINGS</h2>
        <button class="auth-close" onClick={onClose}>
          ×
        </button>
      </div>

      {error && (
        <div class="auth-error" style="margin-bottom: 1rem">
          {error}
        </div>
      )}

      <div class="settings-group">
        <h3 class="settings-label">COMMUNICATION_CHANNELS</h3>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-name">TRANSACTIONAL_UPLINK</span>
            <span class="setting-desc">
              Critical alerts, password resets, and security notices.
            </span>
          </div>
          <div class="brutalist-toggle active">MANDATORY</div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-name">ENGAGEMENT_ALERTS</span>
            <span class="setting-desc">Notifications for match starts and turn reminders.</span>
          </div>
          <button
            class={`brutalist-toggle ${user.reminderNotifications ? 'active' : ''}`}
            disabled={saving}
            onClick={() => {
              void updatePreference('reminderNotifications', !user.reminderNotifications);
            }}
          >
            {user.reminderNotifications ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-name">MARKETING_BEACON</span>
            <span class="setting-desc">
              News, promotional offers, and tactical updates (TCPA compliant).
            </span>
          </div>
          <button
            class={`brutalist-toggle ${user.marketingConsentAt ? 'active' : ''}`}
            disabled={saving}
            onClick={() => {
              void toggleMarketing(!user.marketingConsentAt);
            }}
          >
            {user.marketingConsentAt ? 'AUTHORIZED' : 'DE-AUTHORIZED'}
          </button>
        </div>
      </div>

      <div class="settings-group" style="margin-top: 2rem">
        <h3 class="settings-label">DATA_SOVEREIGNTY</h3>
        <p class="setting-desc" style="margin-bottom: 1rem">
          You have the right to be forgotten. Purging your account will permanently delete your
          identity and anonymize your combat history.
        </p>

        {!showPurgeConfirm ? (
          <button
            class="btn btn-danger"
            style="width: 100%; letter-spacing: 2px"
            onClick={() => {
              setShowPurgeConfirm(true);
            }}
          >
            INITIALIZE_THE_PURGE
          </button>
        ) : (
          <div class="purge-confirm-zone" style="border: 2px solid var(--neon-red); padding: 1rem">
            <p
              class="warning-text"
              style="color: var(--neon-red); font-weight: 900; margin-bottom: 1rem"
            >
              WARNING: This action is IRREVERSIBLE.
            </p>
            <input
              type="password"
              class="name-input"
              style="margin-bottom: 1rem"
              placeholder="CONFIRM_PASSWORD"
              value={purgePassword}
              onInput={(e) => {
                setPurgePassword(e.currentTarget.value);
              }}
            />
            <div style="display: flex; gap: 8px">
              <button
                class="btn btn-danger"
                style="flex: 1"
                disabled={saving || !purgePassword}
                onClick={() => {
                  void handlePurge();
                }}
              >
                {saving ? 'PURGING...' : 'CONFIRM_PURGE'}
              </button>
              <button
                class="btn btn-secondary"
                style="flex: 1"
                onClick={() => {
                  setShowPurgeConfirm(false);
                }}
              >
                ABORT
              </button>
            </div>
          </div>
        )}
      </div>

      <div class="auth-footer" style="margin-top: 2rem; opacity: 0.5; font-size: 0.6rem">
        LEGAL_CONSENT_v1.0 | GDPR/TCPA_READY
      </div>
    </div>
  );
}
