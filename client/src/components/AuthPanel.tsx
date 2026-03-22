import { useState, useEffect, useRef } from 'preact/hooks';
import { formatGamertag } from '@phalanxduel/shared';
import { setUser, setPlayerName } from '../state';
import { setToken, getToken } from '../auth';

interface AuthPanelProps {
  onClose: () => void;
}

export function AuthPanel({ onClose }: AuthPanelProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gamertag, setGamertag] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const firstInput = dialogRef.current?.querySelector('input') as HTMLElement | null;
    firstInput?.focus();
  }, [isLogin]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin ? { email, password } : { email, password, gamertag };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
      } else {
        setToken(data.token);
        setUser(data.user);
        setPlayerName(formatGamertag(data.user.gamertag, data.user.suffix));
        const token = getToken();
        if (token) {
          const { getConnection } = await import('../renderer');
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
        aria-label={isLogin ? 'Login' : 'Register'}
        ref={dialogRef}
        onKeyDown={handleKeyDown}
      >
        <h3>{isLogin ? 'Login' : 'Register'}</h3>
        {error && (
          <p class="auth-error" role="alert">
            {error}
          </p>
        )}
        <form onSubmit={(e: Event) => void handleSubmit(e)}>
          {!isLogin && (
            <div class="form-group">
              <label for="auth-gamertag">Gamertag</label>
              <input
                id="auth-gamertag"
                type="text"
                placeholder="3-20 characters"
                value={gamertag}
                onInput={(e) => {
                  setGamertag(e.currentTarget.value);
                }}
                required
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9 _-]+"
              />
            </div>
          )}
          <div class="form-group">
            <label for="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              placeholder="Email"
              value={email}
              onInput={(e) => {
                setEmail(e.currentTarget.value);
              }}
              required
            />
          </div>
          <div class="form-group">
            <label for="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              placeholder="Password (min 8 characters)"
              value={password}
              onInput={(e) => {
                setPassword(e.currentTarget.value);
              }}
              required
              minLength={8}
            />
          </div>
          <button type="submit" class="btn btn-primary" disabled={loading}>
            {loading ? 'Processing...' : isLogin ? 'Login' : 'Register'}
          </button>
        </form>
        <button
          class="btn-text"
          onClick={() => {
            setIsLogin(!isLogin);
            setError(null);
          }}
        >
          {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  );
}
