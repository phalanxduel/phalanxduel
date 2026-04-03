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
        <h2 class="title">Waiting for Challenger</h2>
        <p class="waiting-hint">
          Share one of the options below — opponents step in to play, spectators join to watch every
          move.
        </p>
        <p class="waiting-meta">
          The code stays reserved for a short time. Cancel to refresh the invite if you want a clean
          slate.
        </p>
      </div>
      <div class="waiting-grid">
        <section class="share-section share-section-play" aria-labelledby="share-play">
          <p class="share-label" id="share-play">
            Invite to play
          </p>
          <p class="share-subtitle">
            A player accepts this match and instantly steps into the active seat.
          </p>
          <div class="match-id-display">
            <code class="match-id" data-testid="waiting-match-id">
              {matchId}
            </code>
          </div>
          <div class="share-btn-row">
            <CopyButton label="Copy Code" getValue={() => matchId} />
            <CopyButton label="Copy Link" getValue={getPlayLink} />
          </div>
          <p class="share-note">
            We keep this invite live while you wait so you can share it across chat or socials.
          </p>
        </section>

        <section class="share-section share-section-watch" aria-labelledby="share-watch">
          <p class="share-label" id="share-watch">
            Invite to watch
          </p>
          <p class="share-subtitle">
            Viewers attach as spectators and follow the state without interacting directly.
          </p>
          <div class="match-id-display">
            <code class="match-id" data-testid="waiting-watch-match-id">
              {matchId}
            </code>
          </div>
          <div class="share-btn-row">
            <CopyButton label="Copy Code" getValue={() => matchId} />
            <CopyButton label="Copy Watch Link" getValue={getWatchLink} />
          </div>
          <p class="share-note">
            Spectator links stay valid even while the invite to play is live.
          </p>
        </section>
      </div>
      <p class="waiting-footnote">
        Need to refresh invites or try again from scratch? Hit cancel and start a new lobby.
      </p>
      <a href="#" class="cancel-link" onClick={onCancel}>
        Cancel and return to lobby
      </a>
    </div>
  );
}

export function renderWaitingPreact(container: HTMLElement, state: AppState): void {
  preactRender(<WaitingApp state={state} />, container);
}
