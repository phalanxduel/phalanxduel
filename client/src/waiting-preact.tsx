import { render as preactRender } from 'preact';
import { getState, resetToLobby } from './state';
import { type AppState } from './state';
import { CopyButton } from './components/CopyButton';

function WaitingApp({ state }: { state: AppState }) {
  const onCancel = (e: MouseEvent) => {
    e.preventDefault();
    resetToLobby();
  };

  const matchId = state.matchId ?? '';

  const getPlayLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('match', matchId);
    url.searchParams.set('mode', getState().damageMode);
    return url.toString();
  };

  const getWatchLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('watch', matchId);
    return url.toString();
  };

  return (
    <div class="waiting">
      <div class="waiting-hero">
        <div class="waiting-icon">🛡️</div>
        <h2 class="title">Prepare for Battle</h2>
        <p class="waiting-hint">Your match is ready. Share an invitation below to begin.</p>
      </div>
      <div class="waiting-grid">
        <section class="share-section share-section-play" aria-labelledby="share-play">
          <header class="share-header">
            <span class="share-icon">⚔️</span>
            <p class="share-label" id="share-play">
              Challenge a Player
            </p>
          </header>
          <p class="share-subtitle">
            Send this to your opponent. They will join the match as your direct adversary.
          </p>
          <div class="match-id-display">
            <code class="match-id" data-testid="waiting-match-id">
              {matchId}
            </code>
          </div>
          <div class="share-btn-row">
            <CopyButton label="Copy Link" getValue={getPlayLink} />
          </div>
        </section>

        <section class="share-section share-section-watch" aria-labelledby="share-watch">
          <header class="share-header">
            <span class="share-icon">👁️</span>
            <p class="share-label" id="share-watch">
              Invite Spectators
            </p>
          </header>
          <p class="share-subtitle">
            Allow others to watch the match in real-time without participating in combat.
          </p>
          <div class="match-id-display">
            <code class="match-id" data-testid="waiting-watch-match-id">
              {matchId}
            </code>
          </div>
          <div class="share-btn-row">
            <CopyButton label="Copy Watch Link" getValue={getWatchLink} />
          </div>
        </section>
      </div>
      <div class="waiting-actions">
        <p class="waiting-meta">Invitations stay active for a limited time.</p>
        <button class="btn btn-secondary btn-cancel" onClick={onCancel}>
          Cancel & Return to Lobby
        </button>
      </div>
    </div>
  );
}

export function renderWaitingPreact(container: HTMLElement, state: AppState): void {
  preactRender(<WaitingApp state={state} />, container);
}
