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

function Nav({ route }: { route: string }) {
  if (route === 'login') return null;

  const link = (href: string, label: string) => {
    const isActive =
      window.location.hash === href || (href === '#/' && window.location.hash === '');
    return (
      <a
        href={href}
        class={isActive ? 'active' : ''}
        onClick={() => {
          window.location.hash = href.slice(1);
        }}
      >
        {label}
      </a>
    );
  };

  return (
    <nav class="nav">
      <span class="nav-brand">PHALANX ADMIN</span>
      {link('#/', 'Dashboard')}
      {link('#/matches/new', 'New Match')}
      {link('#/users', 'Users')}
      {link('#/reports', 'Reports')}
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

  return (
    <>
      <Nav route={route} />
      <main>
        {route === 'login' && <Login />}
        {route === 'dashboard' && <Dashboard />}
        {route === 'match-creator' && <MatchCreator />}
        {route === 'match-detail' && <MatchDetail matchId={params['matchId']!} />}
        {route === 'user-list' && <UserList />}
        {route === 'user-detail' && <UserDetail userId={params['userId']!} />}
        {route === 'reports' && <Reports />}
      </main>
    </>
  );
}

render(<App />, document.getElementById('app')!);
