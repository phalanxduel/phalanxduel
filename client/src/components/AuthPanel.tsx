import { useState } from 'preact/hooks';
import { setUser } from '../state';

export function AuthPanel() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
      } else {
        localStorage.setItem('phalanx_token', data.token);
        setUser(data.user);
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="auth-panel">
      <h3>{isLogin ? 'Login' : 'Register'}</h3>
      {error && <p class="auth-error">{error}</p>}
      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <div class="form-group">
            <input
              type="text"
              placeholder="Name"
              value={name}
              onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)}
              required
            />
          </div>
        )}
        <div class="form-group">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onInput={(e) => setEmail((e.currentTarget as HTMLInputElement).value)}
            required
          />
        </div>
        <div class="form-group">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onInput={(e) => setPassword((e.currentTarget as HTMLInputElement).value)}
            required
          />
        </div>
        <button type="submit" class="btn btn-primary" disabled={loading}>
          {loading ? 'Processing...' : isLogin ? 'Login' : 'Register'}
        </button>
      </form>
      <button class="btn-text" onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
      </button>
    </div>
  );
}
