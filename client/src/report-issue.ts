import { getState } from './state';
import { el } from './renderer';

// Persistent, always-visible report link. Mounted once outside the screen
// render cycle (renderer.ts only resets #app's children) so it survives
// every screen change instead of needing to be re-added per screen.

const ISSUES_URL = 'https://github.com/phalanxduel/phalanxduel/issues/new';

const SCREEN_LABELS: Record<string, string> = {
  lobby: 'Lobby',
  waiting: 'Waiting Room',
  auth: 'Sign In',
  settings: 'Settings',
  ladder: 'Ladder',
  public_lobby: 'Public Lobby',
  spectator_lobby: 'Spectator Lobby',
  game: 'Match',
  gameOver: 'Game Over',
  rewatch: 'Replay',
  profile: 'Profile',
  achievement_detail: 'Achievement',
  all_achievements: 'Achievements',
};

// Deep-links into the repo's own .github/ISSUE_TEMPLATE/bug_report.yml
// (a GitHub issue form) rather than a separate ad hoc template, pre-filling
// every field this client can answer for itself. `version`, `environment`,
// and `evidence` are the form's own field ids.
function buildIssueUrl(): string {
  const state = getState();
  const gameState = 'gameState' in state ? state.gameState : undefined;
  const isSpectator = 'isSpectator' in state ? state.isSpectator : undefined;

  const screenLabel = SCREEN_LABELS[state.screen] ?? state.screen;
  const phaseLabel = gameState?.phase ? ` / ${gameState.phase}` : '';
  const matchLabel = state.matchId ? ` (match ${state.matchId.slice(0, 8)})` : '';
  const title = `[Bug] ${screenLabel}${phaseLabel}${matchLabel}: `;

  const environment = [
    navigator.userAgent,
    `${window.innerWidth}x${window.innerHeight} viewport`,
    window.location.href,
  ].join('\n');

  const evidence = [
    `Screen: ${state.screen}`,
    `Phase: ${gameState?.phase ?? 'n/a'}`,
    `Match ID: ${state.matchId ?? 'none'}`,
    `Player: ${state.playerIndex ?? 'n/a'}${isSpectator !== undefined ? ` (spectator: ${isSpectator})` : ''}`,
    `Connection: ${state.connectionState}`,
    `Time: ${new Date().toISOString()}`,
  ].join('\n');

  const params = new URLSearchParams({
    template: 'bug_report.yml',
    title,
    area: 'Client UI',
    version: `v${__APP_VERSION__} (build ${__BUILD_ID__})`,
    environment,
    evidence,
    labels: 'bug,needs-triage,player-reported',
  });
  return `${ISSUES_URL}?${params.toString()}`;
}

export function mountReportIssueButton(): void {
  if (document.getElementById('pz-report-issue')) return;

  // A real anchor, not a button + window.open: navigation from a genuine
  // <a target="_blank"> is exempt from popup blockers that can silently
  // swallow a script-initiated window.open, even from a real click.
  const link = el('a', 'pz-report-issue-btn') as HTMLAnchorElement;
  link.id = 'pz-report-issue';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.title = 'Report an issue or request a feature — captures your current screen and match';
  link.innerHTML = '<span aria-hidden="true">🚩</span><span>Report issue</span>';
  link.addEventListener('mousedown', () => {
    link.href = buildIssueUrl();
  });
  link.href = buildIssueUrl();

  document.body.appendChild(link);
}
