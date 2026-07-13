import { useEffect, useState, useRef } from 'preact/hooks';
import type { GameState, TransactionLogEntry } from '@phalanxduel/shared';

interface Props {
  matchId: string;
  onClose: () => void;
  token?: string | null;
}

export function MatchDetailsDialog({ matchId, onClose, token }: Props) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }

    let isMounted = true;

    fetch(`/api/matches/${matchId}/replay?step=9999`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((stateData) => {
        if (!isMounted) return;
        if (!stateData) {
          setError('Failed to load match breakdown.');
        } else {
          setGameState(stateData as GameState);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [matchId, token]);

  const handleClose = () => {
    if (dialogRef.current) {
      dialogRef.current.close();
    }
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      class="phx-dialog"
      onCancel={(e) => {
        e.preventDefault();
        handleClose();
      }}
      style={{
        maxWidth: '800px',
        width: '90vw',
        padding: '24px',
        background: 'rgba(10,12,16,0.95)',
        border: '1px solid var(--gold-dim)',
        color: '#fff',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
        }}
      >
        <h2 class="section-label" style={{ margin: '0', color: 'var(--gold)' }}>
          MATCH BREAKDOWN
        </h2>
        <button class="btn btn-tiny" onClick={handleClose}>
          CLOSE
        </button>
      </div>

      {loading ? (
        <div class="status-card" style={{ textAlign: 'center', opacity: '0.7' }}>
          DECRYPTING MATCH DATA...
        </div>
      ) : error ? (
        <div class="status-card" style={{ color: 'var(--neon-red)', textAlign: 'center' }}>
          {error}
        </div>
      ) : gameState ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            class="status-card"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: '16px',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  color: gameState.outcome?.winnerIndex === 0 ? 'var(--neon-green)' : 'inherit',
                }}
              >
                {gameState.players[0]?.player.name || 'Player 1'}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', marginTop: '8px' }}>
                LP:{' '}
                <span style={{ color: 'var(--neon-red)' }}>{gameState.players[0]?.lifepoints}</span>
              </div>
            </div>

            <div
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold)', fontSize: '1.5rem' }}
            >
              VS
            </div>

            <div>
              <div
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  color: gameState.outcome?.winnerIndex === 1 ? 'var(--neon-green)' : 'inherit',
                }}
              >
                {gameState.players[1]?.player.name || 'Player 2'}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', marginTop: '8px' }}>
                LP:{' '}
                <span style={{ color: 'var(--neon-red)' }}>{gameState.players[1]?.lifepoints}</span>
              </div>
            </div>
          </div>

          {gameState.outcome && (
            <div
              style={{
                textAlign: 'center',
                color: 'var(--gold)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.9rem',
              }}
            >
              {gameState.outcome.winnerIndex === null
                ? 'RESULT: DRAW'
                : `WINNER: ${
                    gameState.players[gameState.outcome.winnerIndex]?.player.name ??
                    `Player ${gameState.outcome.winnerIndex + 1}`
                  }`}
              {gameState.outcome.victoryType ? ` (${gameState.outcome.victoryType})` : ''}
              {' · '}
              TOTAL TURNS: {gameState.turnNumber}
            </div>
          )}

          {gameState.transactionLog && (
            <div>
              <h3
                class="section-label"
                style={{
                  fontSize: '1rem',
                  marginBottom: '12px',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  paddingBottom: '8px',
                }}
              >
                TIMELINE
              </h3>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  paddingRight: '8px',
                }}
              >
                {gameState.transactionLog.map((tx: TransactionLogEntry, i: number) => {
                  let text = '';
                  let color = '#fff';

                  const playerIndex = 'playerIndex' in tx.action ? tx.action.playerIndex : null;
                  const playerNameStr =
                    playerIndex !== undefined && playerIndex !== null
                      ? `Player ${playerIndex + 1}`
                      : 'System';

                  switch (tx.details.type) {
                    case 'system:init':
                      text = 'Match Initialized';
                      color = 'var(--gold)';
                      break;
                    case 'deploy':
                      text = `${playerNameStr} deployed to grid index ${tx.details.gridIndex}`;
                      color = 'var(--neon-blue)';
                      break;
                    case 'attack':
                      text = `${playerNameStr} initiated combat`;
                      color = 'var(--neon-red)';
                      break;
                    case 'pass':
                      text = `${playerNameStr} passed their turn`;
                      color = '#888';
                      break;
                    case 'reinforce':
                      text = `${playerNameStr} reinforced column ${tx.details.column}`;
                      color = 'var(--neon-green)';
                      break;
                    case 'forfeit':
                      text = `${playerNameStr} forfeited`;
                      color = 'var(--neon-red)';
                      break;
                  }

                  return (
                    <div
                      key={i}
                      style={{
                        padding: '8px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '4px',
                        borderLeft: `2px solid ${color}`,
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8rem',
                      }}
                    >
                      <span style={{ color }}>{text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </dialog>
  );
}
