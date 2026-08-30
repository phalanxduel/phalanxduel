/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 */

import { useEffect, useState } from 'preact/hooks';
import type { CardSkinId } from '@phalanxduel/shared';
import type { AppState } from '../state';
import { setUser } from '../state';
import { getToken, logout } from '../auth';
import { CARD_SKINS, normalizeCardSkinId } from '../cosmetics';

interface SettingsPanelProps {
  state: AppState;
  onClose: () => void;
}

export function SettingsPanel({ state, onClose }: SettingsPanelProps) {
  const { user } = state;
  if (!user) return null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [purgePassword, setPurgePassword] = useState('');
  const [ownedCardSkinIds, setOwnedCardSkinIds] = useState<CardSkinId[]>(['default']);
  const [equippedCardSkinId, setEquippedCardSkinId] = useState<CardSkinId>('default');
  const [cosmeticsLoading, setCosmeticsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadCosmetics = async () => {
      try {
        const token = getToken();
        const response = await fetch('/api/store/loadout', {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!response.ok) throw new Error('Loadout unavailable');
        const payload = (await response.json()) as {
          equippedCardSkinId?: unknown;
          ownedCardSkinIds?: unknown[];
        };
        if (cancelled) return;
        const owned = (payload.ownedCardSkinIds ?? []).map(normalizeCardSkinId);
        setOwnedCardSkinIds([...new Set<CardSkinId>(['default', ...owned])]);
        setEquippedCardSkinId(normalizeCardSkinId(payload.equippedCardSkinId));
      } catch {
        if (!cancelled) setError('COSMETIC_LINK_OFFLINE: Loadout not synchronized.');
      } finally {
        if (!cancelled) setCosmeticsLoading(false);
      }
    };

    void loadCosmetics();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const equipSkin = async (cardSkinId: CardSkinId) => {
    setSaving(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch('/api/store/equip', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ cardSkinId }),
      });
      if (!response.ok) throw new Error('Equip failed');
      setEquippedCardSkinId(cardSkinId);
      setFlash('CARD_THEME_EQUIPPED');
      setTimeout(() => {
        setFlash(null);
      }, 3000);
    } catch {
      setError('COMM_FAILURE: Card theme not synchronized.');
    } finally {
      setSaving(false);
    }
  };

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
      setFlash('PREFERENCE_UPDATED');
      setTimeout(() => {
        setFlash(null);
      }, 3000);
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
      setFlash('MARKETING_CONSENT_UPDATED');
      setTimeout(() => {
        setFlash(null);
      }, 3000);
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
      localStorage.removeItem('phalanx_operative_id');
      await logout();
      window.location.reload();
    } catch {
      setError('CRITICAL_FAILURE: The Purge could not be initialized.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      class="auth-modal-backdrop"
      onClick={(e) => {
        if ((e.target as HTMLElement).classList.contains('auth-modal-backdrop')) onClose();
      }}
    >
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
        {flash && (
          <div class="phx-flash-message" style="margin-bottom: 1rem">
            {flash}
          </div>
        )}

        <div class="settings-group">
          <h3 class="settings-label">VOICE_CALIBRATION_TEST_REEL</h3>
          <p class="settings-desc">Test and adjust the TTS announcer persona.</p>
          <div class="voice-test-reel">
            <button
              class="phx-btn primary"
              onClick={() => {
                if (window.__commentary) {
                  window.__commentary.testVoice('male', 'Finish him! Clash of Aces! Triple Combo!');
                }
              }}
            >
              TEST MALE (Movie Guy / MK)
            </button>
            <button
              class="phx-btn primary"
              style="margin-left: 0.5rem"
              onClick={() => {
                if (window.__commentary) {
                  window.__commentary.testVoice(
                    'female',
                    'Get away from her! Target locked. Clash of Aces!',
                  );
                }
              }}
            >
              TEST FEMALE (Ripley / Sarah Connor)
            </button>
          </div>
        </div>

        <div class="settings-group">
          <h3 class="settings-label">SIGNAL_CHANNELS</h3>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-name">TRANSACTIONAL_UPLINK</span>
              <span class="setting-desc">
                Critical alerts, password resets, and security notices. Account management requires
                occasional system emails.
              </span>
            </div>
            <button
              class={`brutalist-toggle ${user.emailNotifications ? 'active' : ''}`}
              disabled={saving}
              onClick={() => {
                void updatePreference('emailNotifications', !user.emailNotifications);
              }}
            >
              {user.emailNotifications ? 'OPT_IN' : 'OPT_OUT'}
            </button>
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

        <div class="settings-group cosmetic-loadout-group">
          <h3 class="settings-label">CARD_SIGNAL_LOADOUT</h3>
          <p class="settings-desc">
            Your opponent sees your equipped card back in your hand and your theme on deployed
            cards.
          </p>
          <div
            class="cosmetic-loadout-grid"
            data-component="CosmeticLoadoutView"
            data-state={cosmeticsLoading ? 'loading' : 'ready'}
          >
            {CARD_SKINS.map((skin) => {
              const isOwned = ownedCardSkinIds.includes(skin.id);
              const isEquipped = equippedCardSkinId === skin.id;
              return (
                <article
                  key={skin.id}
                  class={`cosmetic-loadout-card ${isEquipped ? 'is-equipped' : ''} ${
                    isOwned ? 'is-owned' : 'is-locked'
                  }`}
                  data-card-theme={skin.id}
                  data-state={isEquipped ? 'equipped' : isOwned ? 'owned' : 'locked'}
                >
                  <div class="cosmetic-card-back" aria-hidden="true">
                    <div class="cosmetic-card-back-art" />
                  </div>
                  <div class="cosmetic-loadout-copy">
                    <strong>{skin.name}</strong>
                    <span>{skin.description}</span>
                    <small>{isOwned ? 'UNLOCKED' : `LOCKED · ${skin.unlock}`}</small>
                  </div>
                  <button
                    class={`phx-btn ${isEquipped ? 'secondary' : 'primary'}`}
                    disabled={saving || cosmeticsLoading || !isOwned || isEquipped}
                    onClick={() => {
                      void equipSkin(skin.id);
                    }}
                  >
                    {isEquipped ? 'EQUIPPED' : isOwned ? 'EQUIP' : 'LOCKED'}
                  </button>
                </article>
              );
            })}
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
            <div
              class="purge-confirm-zone"
              style="border: 2px solid var(--neon-red); padding: 1rem"
            >
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
    </div>
  );
}
