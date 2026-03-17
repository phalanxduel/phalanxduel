import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Login } from './pages/Login.js';
import { Dashboard } from './pages/Dashboard.js';
import { MatchCreator } from './pages/MatchCreator.js';
import { MatchDetail } from './pages/MatchDetail.js';
import { UserList } from './pages/UserList.js';
import { UserDetail } from './pages/UserDetail.js';
import { Reports } from './pages/Reports.js';

function parseHash(hash: string): { route: string; params: Record<string, string> } {
  const path = hash.replace(/^#\/?/, '') || '/';
  const parts = path.split('/');

  if (parts[0] === 'matches' && parts[1] === 'new') return { route: 'match-creator', params: {} };
  if (parts[0] === 'matches' && parts[1])
    return { route: 'match-detail', params: { matchId: parts[1] } };
  if (parts[0] === 'users' && parts[1])
    return { route: 'user-detail', params: { userId: parts[1] } };
  if (parts[0] === 'users') return { route: 'user-list', params: {} };
  if (parts[0] === 'reports') return { route: 'reports', params: {} };
  if (parts[0] === 'login') return { route: 'login', params: {} };
  return { route: 'dashboard', params: {} };
}

function Sidebar({ route }: { route: string }) {
  const navLink = (href: string, label: string, active: boolean) => (
    <a href={href} class={`app-nav-link${active ? ' active' : ''}`}>
      {label}
    </a>
  );

  return (
    <nav class="app-nav">
      <div class="app-nav-brand">
        Phalanx
        <br />
        Admin
      </div>

      <div class="app-nav-section">
        <div class="app-nav-label">Overview</div>
        {navLink('#/', 'Dashboard', route === 'dashboard')}
      </div>

      <div class="app-nav-section">
        <div class="app-nav-label">Matches</div>
        {navLink('#/matches/new', 'New Match', route === 'match-creator')}
      </div>

      <div class="app-nav-section">
        <div class="app-nav-label">Players</div>
        {navLink('#/users', 'All Users', route === 'user-list' || route === 'user-detail')}
      </div>

      <div class="app-nav-section">
        <div class="app-nav-label">Analytics</div>
        {navLink('#/reports', 'Queries', route === 'reports')}
      </div>
    </nav>
  );
}

function App() {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const handler = () => {
      setHash(window.location.hash);
    };
    window.addEventListener('hashchange', handler);
    return () => {
      window.removeEventListener('hashchange', handler);
    };
  }, []);

  const { route, params } = parseHash(hash);

  if (route === 'login') return <Login />;

  return (
    <div class="app-shell">
      <Sidebar route={route} />
      <main class="app-content">
        {route === 'dashboard' && <Dashboard />}
        {route === 'match-creator' && <MatchCreator />}
        {route === 'match-detail' && <MatchDetail matchId={params['matchId']!} />}
        {route === 'user-list' && <UserList />}
        {route === 'user-detail' && <UserDetail userId={params['userId']!} />}
        {route === 'reports' && <Reports />}
      </main>
    </div>
  );
}

render(<App />, document.getElementById('app')!);
