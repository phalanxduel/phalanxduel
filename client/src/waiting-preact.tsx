import { render as preactRender } from 'preact';
import { getState, resetToLobby } from './state';
import { type AppState } from './state';

function CopyButton({ label, getValue }: { label: string; getValue: () => string }) {
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(getValue());
      // Maybe show a temporary "Copied!" state if we want to be fancy.
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <button type="button" class="btn btn-secondary" onClick={onCopy}>
      {label}
    </button>
  );
}

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
      <h2 class="title">Waiting for Challenger</h2>
      <p class="waiting-hint">
        Share one of the options below — opponents join to play, spectators watch live.
      </p>

      {/* -- Opponent invite -- */}
      <div class="share-section">
        <p class="share-label">Invite to play</p>
        <div class="match-id-display">
          <code class="match-id" data-testid="waiting-match-id">
            {matchId}
          </code>
        </div>
        <div class="share-btn-row">
          <CopyButton label="Copy Code" getValue={() => matchId} />
          <CopyButton label="Copy Link" getValue={getPlayLink} />
        </div>
      </div>

      {/* -- Spectator invite -- */}
      <div class="share-section">
        <p class="share-label">Invite to watch</p>
        <div class="match-id-display">
          <code class="match-id" data-testid="waiting-watch-match-id">
            {matchId}
          </code>
        </div>
        <div class="share-btn-row">
          <CopyButton label="Copy Code" getValue={() => matchId} />
          <CopyButton label="Copy Watch Link" getValue={getWatchLink} />
        </div>
      </div>

      <a href="#" class="cancel-link" onClick={onCancel}>
        Cancel and return to lobby
      </a>
    </div>
  );
}

export function renderWaitingPreact(container: HTMLElement, state: AppState): void {
  preactRender(<WaitingApp state={state} />, container);
}
