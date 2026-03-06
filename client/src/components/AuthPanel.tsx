import { useState, useEffect, useRef } from 'preact/hooks';
import { setUser } from '../state';
import { setToken, getToken } from '../auth';

interface AuthPanelProps {
  onClose: () => void;
}

export function AuthPanel({ onClose }: AuthPanelProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
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
    const body = isLogin ? { email, password } : { email, password, name };

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
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div class="form-group">
              <label for="auth-name">Name</label>
              <input
                id="auth-name"
                type="text"
                placeholder="Your name"
                value={name}
                onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)}
                required
                minLength={1}
                maxLength={50}
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
              onInput={(e) => setEmail((e.currentTarget as HTMLInputElement).value)}
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
              onInput={(e) => setPassword((e.currentTarget as HTMLInputElement).value)}
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
