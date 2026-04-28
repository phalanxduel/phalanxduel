import { render as preactRender } from 'preact';
import { getState, resetToLobby } from './state';
import { type AppState } from './state';
import { CopyButton } from './components/CopyButton';

export function WaitingApp({ state }: { state: AppState }) {
  const onCancel = (e: MouseEvent) => {
    e.preventDefault();
    resetToLobby();
  };

  const matchId = state.matchId ?? '';

  const getPlayLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('screen');
    url.searchParams.delete('profile');
    url.searchParams.set('action', 'join');
    url.searchParams.set('match', matchId);
    url.searchParams.set('mode', getState().damageMode);
    return url.toString();
  };

  const getWatchLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('screen');
    url.searchParams.delete('profile');
    url.searchParams.set('action', 'watch');
    url.searchParams.set('match', matchId);
    return url.toString();
  };

  return (
    <div class="waiting">
      <div class="waiting-hero">
        <div class="waiting-icon">SIGNAL_PENDING</div>
        <h2 class="title">Prepare for Battle</h2>
        <p class="waiting-hint">Match initialized. Broadcast invitation to begin.</p>
      </div>
      <div class="waiting-grid">
        <section class="share-section share-section-play" aria-labelledby="share-play">
          <header class="share-header">
            <p class="share-label" id="share-play">
              ADVERSARY_LINK
            </p>
          </header>
          <p class="share-subtitle">
            Transmit to your opponent. Direct combat authorization required.
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
            <p class="share-label" id="share-watch">
              OBSERVER_LINK
            </p>
          </header>
          <p class="share-subtitle">
            Allow passive monitoring of tactical engagement in real-time.
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
        <p class="waiting-meta">Connection window limited.</p>
        <button class="btn btn-secondary btn-cancel" onClick={onCancel}>
          Abort & Return to Command
        </button>
      </div>
    </div>
  );
}

export function renderWaiting(container: HTMLElement, state: AppState): void {
  preactRender(<WaitingApp state={state} />, container);
}
