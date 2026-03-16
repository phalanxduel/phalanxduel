import { useState } from 'preact/hooks';
import { apiPost } from '../hooks/useApi.js';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await apiPost('/admin-api/auth/login', { email, password });
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    window.location.hash = '#/';
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
      }}
    >
      <div class="card" style={{ width: '340px' }}>
        <div
          class="card-title"
          style={{
            textAlign: 'center',
            marginBottom: '20px',
            fontSize: '18px',
            color: 'var(--accent)',
          }}
        >
          PHALANX ADMIN
        </div>
        <form onSubmit={handleSubmit}>
          <div class="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onInput={(e) => {
                setEmail((e.target as HTMLInputElement).value);
              }}
              required
            />
          </div>
          <div class="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onInput={(e) => {
                setPassword((e.target as HTMLInputElement).value);
              }}
              required
            />
          </div>
          {error && <p class="error-msg">{error}</p>}
          <button
            type="submit"
            class="primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '8px' }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
