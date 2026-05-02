import { useState, useEffect, useRef } from 'preact/hooks';
import { formatGamertag } from '@phalanxduel/shared';
import { setUser, setOperativeId, getState, type AuthUser } from '../state';
import { setToken, getToken } from '../auth';

interface AuthPanelProps {
  onClose: () => void;
}

export function AuthPanel({ onClose }: AuthPanelProps) {
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gamertag, setGamertag] = useState(getState().operativeId || '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const firstInput = dialogRef.current?.querySelector('input') as HTMLElement | null;
    firstInput?.focus();
  }, [view]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint =
      view === 'login'
        ? '/api/auth/login'
        : view === 'register'
          ? '/api/auth/register'
          : '/api/auth/forgot-password';

    const body =
      view === 'forgot'
        ? { email }
        : view === 'login'
          ? { email, password }
          : { email, password, gamertag };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      const data = (await res.json()) as {
        error?: string;
        token: string;
        user: AuthUser;
      };
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
      } else if (view === 'forgot') {
        alert(
          'RECOVERY_BEACON_ACTIVE: If an account exists for this uplink, a reset link has been dispatched.',
        );
        setView('login');
      } else {
        setToken(data.token);
        setUser(data.user);
        setOperativeId(formatGamertag(data.user.gamertag, data.user.suffix));
        const token = getToken();
        if (token) {
          const { getConnection } = await import('../app-connection');
          const conn = getConnection();
          if (conn) {
            conn.send({ type: 'authenticate', token } as never);
          }
        }
        onClose();
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      class="auth-modal-backdrop"
      onClick={(e) => {
        if ((e.target as HTMLElement).classList.contains('auth-modal-backdrop')) onClose();
      }}
    >
      <div
        class="auth-panel"
        role="dialog"
        aria-modal="true"
        aria-label={
          view === 'login' ? 'Login' : view === 'register' ? 'Register' : 'Forgot Password'
        }
        ref={dialogRef}
        onKeyDown={handleKeyDown}
      >
        <h3>{view === 'login' ? 'LOGIN' : view === 'register' ? 'REGISTER' : 'RECOVER_ACCESS'}</h3>
        {error && (
          <p class="auth-error" role="alert">
            {error}
          </p>
        )}
        <form onSubmit={(e: Event) => void handleSubmit(e)}>
          {view === 'register' && (
            <div class="form-group">
              <label for="auth-gamertag">OPERATIVE_ID (Gamertag)</label>
              <input
                id="auth-gamertag"
                type="text"
                data-testid="auth-gamertag-input"
                placeholder="3-20 characters"
                value={gamertag}
                onInput={(e) => {
                  const val = e.currentTarget.value;
                  setGamertag(val);
                  setOperativeId(val);
                }}
                required
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9 _\-]+"
              />
            </div>
          )}
          <div class="form-group">
            <label for="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              data-testid="auth-email-input"
              placeholder="Email"
              autocomplete="email"
              value={email}
              onInput={(e) => {
                setEmail(e.currentTarget.value);
              }}
              required
            />
          </div>
          {view !== 'forgot' && (
            <div class="form-group">
              <label for="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                data-testid="auth-password-input"
                placeholder="Password (min 8 characters)"
                autocomplete={view === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onInput={(e) => {
                  setPassword(e.currentTarget.value);
                }}
                required
                minLength={8}
              />
            </div>
          )}
          <button
            type="submit"
            class="btn btn-primary"
            data-testid="auth-submit-btn"
            disabled={loading}
          >
            {loading
              ? 'PROCESSING...'
              : view === 'login'
                ? 'LOGIN'
                : view === 'register'
                  ? 'REGISTER'
                  : 'SEND_RESET_LINK'}
          </button>
        </form>

        <div class="auth-extra-links">
          {view === 'login' && (
            <button
              class="btn-text"
              onClick={() => {
                setView('forgot');
                setError(null);
              }}
            >
              FORGOT_PASSWORD?
            </button>
          )}

          <button
            class="btn-text"
            data-testid="auth-toggle-mode-btn"
            onClick={() => {
              setView(view === 'register' ? 'login' : 'register');
              setError(null);
            }}
          >
            {view === 'register'
              ? 'ALREADY_HAVE_AN_ACCOUNT? LOGIN'
              : "DON'T_HAVE_AN_ACCOUNT? REGISTER"}
          </button>

          {view === 'forgot' && (
            <button
              class="btn-text"
              onClick={() => {
                setView('login');
                setError(null);
              }}
            >
              BACK_TO_LOGIN
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
