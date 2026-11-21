import { useEffect, useState } from 'preact/hooks';
import { getToken } from '../auth';
import { getState, openAchievement, openAllAchievements, openRewatch } from '../state';

interface EarnedAchievement {
  type: string;
  awardedAt: string;
}

interface FavoriteMatchSummary {
  matchId: string;
  player1Name: string | null;
  player2Name: string | null;
}

interface PublicProfileSummary {
  userId: string;
  gamertag: string;
  displayName: string;
  elo: number;
  record: {
    wins: number;
    losses: number;
    draws: number;
    gamesPlayed: number;
  };
  streak: number;
  confidenceLabel: string;
  recentMatches: {
    matchId: string;
    result: 'win' | 'loss' | 'draw';
    mode: 'pvp' | 'sp-random' | 'sp-heuristic' | 'sp-mcts';
    opponentName: string | null;
    completedAt: string;
    turnNumber: number | null;
  }[];
}

const ACHIEVEMENT_META: Record<string, { emoji: string; title: string; desc: string }> = {
  FIRST_WIN: { emoji: '🏆', title: 'First Blood', desc: 'Win your first match.' },
  FIRST_MATCH: { emoji: '🎯', title: 'First Deployment', desc: 'Complete your first match.' },
  ACE_SLAYER: { emoji: '♠️', title: 'Ace Slayer', desc: 'Destroy an Ace in combat.' },
  CLEAN_SWEEP: { emoji: '🧹', title: 'Clean Sweep', desc: 'Win without losing a card.' },
  FULL_HOUSE: { emoji: '🃏', title: 'Full House', desc: '3+2 of same face on board at end.' },
  ROYAL_GUARD: { emoji: '👑', title: 'Royal Guard', desc: 'Fill your back rank with face cards.' },
  DOUBLE_DOWN: { emoji: '2️⃣', title: 'Double Down', desc: 'Win from 1 life point.' },
  LAST_STAND: { emoji: '🛡️', title: 'Last Stand', desc: 'Survive with 1 life point remaining.' },
  IRON_WALL: { emoji: '🧱', title: 'Iron Wall', desc: 'No cards destroyed in a full match.' },
  HIGH_CARD: { emoji: '🎴', title: 'High Card', desc: 'Win with only one card on board.' },
  COMEBACK_KID: { emoji: '🔄', title: 'Comeback Kid', desc: 'Win after trailing by 10+ LP.' },
  OPENING_GAMBIT: { emoji: '⚔️', title: 'Opening Gambit', desc: 'Win in 3 turns or fewer.' },
  TEN_WINS: { emoji: '🥉', title: 'Ten Wins', desc: 'Win 10 matches.' },
  FIFTY_WINS: { emoji: '🥈', title: 'Fifty Wins', desc: 'Win 50 matches.' },
  HUNDRED_WINS: { emoji: '🥇', title: 'Hundred Wins', desc: 'Win 100 matches.' },
  DEUCE_COUP: { emoji: '✌️', title: 'Deuce Coup', desc: 'Destroy two 2s in a single attack.' },
  TRIPLE_THREAT: {
    emoji: '3️⃣',
    title: 'Triple Threat',
    desc: 'Deploy three of the same rank in a row.',
  },
  DEAD_MANS_HAND: {
    emoji: '💀',
    title: "Dead Man's Hand",
    desc: 'Hold Aces & Eights in your back rank.',
  },
  RANDOM_DEPLOYMENT: {
    emoji: '🎲',
    title: 'Trust the Shuffle',
    desc: 'Complete a match after choosing Random quick deploy.',
  },
};

const ALL_ACHIEVEMENT_TYPES = Object.keys(ACHIEVEMENT_META);

export function PublicProfileView({
  profileId,
  onClose,
}: {
  profileId: string;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<PublicProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [achievements, setAchievements] = useState<EarnedAchievement[]>([]);
  const [favorites, setFavorites] = useState<FavoriteMatchSummary[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 });

  const [isEditingGamertag, setIsEditingGamertag] = useState(false);
  const [newGamertag, setNewGamertag] = useState('');
  const [editGamertagError, setEditGamertagError] = useState<string | null>(null);
  const [isSubmittingGamertag, setIsSubmittingGamertag] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/profiles/${profileId}`).then((res) => {
        if (!res.ok) throw new Error('Profile not found');
        return res.json();
      }),
      fetch(`/api/users/${profileId}/achievements`).then((res) =>
        res.ok ? res.json() : { achievements: [] },
      ),
      fetch(`/api/users/${profileId}/favorites`).then((res) => (res.ok ? res.json() : [])),
      fetch(`/api/users/${profileId}/follow-stats`).then((res) =>
        res.ok ? res.json() : { followers: 0, following: 0 },
      ),
    ])
      .then(([profilePayload, achPayload, favPayload, followPayload]) => {
        const data =
          (profilePayload as { profile?: PublicProfileSummary }).profile ??
          (profilePayload as PublicProfileSummary);
        setProfile(data);
        setAchievements((achPayload as { achievements?: EarnedAchievement[] }).achievements ?? []);
        setFavorites(favPayload as FavoriteMatchSummary[]);
        setFollowStats(followPayload as { followers: number; following: number });
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not load profile');
        setLoading(false);
      });
  }, [profileId]);

  const handleUpdateGamertag = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setEditGamertagError(null);
    setIsSubmittingGamertag(true);
    try {
      const res = await fetch('/api/auth/gamertag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ gamertag: newGamertag }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setEditGamertagError(data.error || 'Failed to update gamertag.');
      } else {
        window.location.reload();
      }
    } catch (err: unknown) {
      setEditGamertagError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsSubmittingGamertag(false);
    }
  };

  const handleFollowToggle = async () => {
    const method = isFollowing ? 'DELETE' : 'POST';
    try {
      const res = await fetch(`/api/users/${profileId}/follow`, {
        method,
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        setIsFollowing(!isFollowing);
        setFollowStats((prev) => ({
          ...prev,
          followers: prev.followers + (isFollowing ? -1 : 1),
        }));
      }
    } catch {
      // Best effort
    }
  };

  return (
    <div
      class="lobby"
      style="min-height: 80vh; justify-content: center; align-items: center; padding: 2rem;"
    >
      <div class="hud-panel" style="max-width: 600px; width: 100%;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
          <h2 class="section-label" style="margin: 0">
            OPERATIVE_PROFILE
          </h2>
          <button class="btn btn-tiny" onClick={onClose}>
            CLOSE
          </button>
        </div>

        {loading ? (
          <div class="status-card">SYNCHRONIZING_PROFILE_DATA…</div>
        ) : error ? (
          <div class="status-card" style="color: var(--neon-red)">
            {error}
          </div>
        ) : profile ? (
          <div class="status-card" style="display: flex; flex-direction: column; gap: 1rem">
            <div style="display: flex; justify-content: space-between; align-items: center">
              <div>
                {isEditingGamertag ? (
                  <form
                    onSubmit={(e) => {
                      void handleUpdateGamertag(e);
                    }}
                    style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;"
                  >
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <input
                        type="text"
                        class="form-input"
                        style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px; color: #fff; padding: 0.25rem 0.5rem; font-family: var(--font-body); font-size: 0.85rem;"
                        value={newGamertag}
                        onInput={(e) => {
                          setNewGamertag(e.currentTarget.value);
                        }}
                        placeholder="New gamertag"
                        disabled={isSubmittingGamertag}
                        maxLength={20}
                      />
                      <button
                        type="submit"
                        class="btn btn-primary btn-tiny"
                        disabled={isSubmittingGamertag}
                        style="padding: 0.25rem 0.75rem; min-width: auto; margin: 0;"
                      >
                        SAVE
                      </button>
                      <button
                        type="button"
                        class="btn btn-secondary btn-tiny"
                        onClick={() => {
                          setIsEditingGamertag(false);
                        }}
                        disabled={isSubmittingGamertag}
                        style="padding: 0.25rem 0.75rem;"
                      >
                        CANCEL
                      </button>
                    </div>
                    {editGamertagError && (
                      <span style="color: var(--neon-red); font-size: 0.65rem;">
                        {editGamertagError}
                      </span>
                    )}
                  </form>
                ) : (
                  <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
                    <h3 class="status-title" style="font-size: 1.5rem; margin: 0;">
                      {profile.displayName}
                    </h3>
                    {getState().user?.id === profileId && (
                      <button
                        class="btn-text"
                        style="font-size: 0.65rem; color: var(--text-dim); background: none; border: none; cursor: pointer; text-decoration: underline; padding: 0;"
                        onClick={() => {
                          setNewGamertag(
                            profile.gamertag || profile.displayName.split('#')[0] || '',
                          );
                          setIsEditingGamertag(true);
                        }}
                      >
                        EDIT
                      </button>
                    )}
                  </div>
                )}
                <div style="display: flex; gap: 12px; align-items: center">
                  <p class="status-val" style="margin: 0">
                    {profile.userId}
                  </p>
                  <span class="status-val" style="font-size: 0.6rem; opacity: 0.6;">
                    {followStats.followers} FOLLOWERS · {followStats.following} FOLLOWING
                  </span>
                </div>
              </div>
              <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
                <span class="meta-tag">{profile.confidenceLabel.toUpperCase()}</span>
                {getState().user?.id !== profileId && (
                  <button
                    class={`btn btn-tiny ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ minWidth: '80px', padding: '4px 12px' }}
                    onClick={() => {
                      void handleFollowToggle();
                    }}
                  >
                    {isFollowing ? 'UNFOLLOW' : 'FOLLOW'}
                  </button>
                )}
              </div>
            </div>

            <div class="engagement-grid" style="grid-template-columns: 1fr 1fr; gap: 1rem">
              <div class="engagement-section">
                <h4 class="engagement-label">ELO_RATING</h4>
                <div class="status-title" style="color: var(--gold); font-size: 2rem">
                  {profile.elo}
                </div>
              </div>
              <div class="engagement-section">
                <h4 class="engagement-label">RECORD</h4>
                <div class="status-val" style="font-size: 1.2rem">
                  {profile.record.wins}W - {profile.record.losses}L - {profile.record.draws}D
                </div>
                <div class="status-val">STREAK: {profile.streak}</div>
              </div>
            </div>

            <div class="engagement-section">
              <h4 class="engagement-label">FAVORITE_ENGAGEMENTS</h4>
              {favorites.length === 0 ? (
                <div style="font-size: 0.7rem; opacity: 0.3; font-style: italic;">
                  No favorite matches bookmarked.
                </div>
              ) : (
                <div style="display: flex; flex-direction: column; gap: 4px; max-height: 120px; overflow-y: auto">
                  {favorites.map((m) => (
                    <div
                      key={m.matchId}
                      style="display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px; font-size: 0.7rem; padding: 4px; background: rgba(0,255,136,0.05); border-left: 2px solid var(--neon-green);"
                    >
                      <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ⭐ {m.player1Name} vs {m.player2Name}
                      </span>
                      <button
                        class="btn btn-secondary btn-tiny"
                        onClick={() => {
                          openRewatch(m.matchId, 0);
                        }}
                      >
                        WATCH
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div class="engagement-section">
              <h4 class="engagement-label">RECENT_ENGAGEMENTS</h4>
              <div style="display: flex; flex-direction: column; gap: 4px; max-height: 150px; overflow-y: auto">
                {profile.recentMatches.map((m) => (
                  <div
                    key={m.matchId}
                    style="display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 8px; font-size: 0.7rem; padding: 4px; background: rgba(255,255,255,0.05)"
                  >
                    <span>
                      {m.mode.toUpperCase()} vs {m.opponentName ?? 'AI'}
                    </span>
                    <span
                      style={{
                        color: m.result === 'win' ? 'var(--neon-green)' : 'var(--neon-red)',
                      }}
                    >
                      {m.result.toUpperCase()}
                    </span>
                    <button
                      class="btn btn-secondary btn-tiny"
                      data-testid="profile-rewatch-btn"
                      onClick={() => {
                        openRewatch(m.matchId, 0);
                      }}
                    >
                      REWATCH
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div class="engagement-section">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h4 class="engagement-label" style="margin: 0">
                  ACHIEVEMENT_GALLERY
                </h4>
                <button
                  class="btn-text"
                  style="font-size: 0.6rem; color: var(--gold); cursor: pointer; background: none; border: none; font-family: var(--font-mono);"
                  onClick={openAllAchievements}
                >
                  VIEW_ALL_ACHIEVEMENTS →
                </button>
              </div>
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; margin-top: 8px;">
                {ALL_ACHIEVEMENT_TYPES.map((type) => {
                  const meta = ACHIEVEMENT_META[type];
                  const earned = achievements.find((a) => a.type === type);
                  if (!meta) return null;
                  return (
                    <div
                      key={type}
                      title={
                        earned
                          ? `${meta.title}\n${new Date(earned.awardedAt).toLocaleDateString()}`
                          : `[LOCKED] ${meta.desc}`
                      }
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '8px 4px',
                        background: earned ? 'rgba(0,255,136,0.08)' : 'rgba(255,255,255,0.03)',
                        border: earned
                          ? '1px solid var(--neon-green)'
                          : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '4px',
                        opacity: earned ? 1 : 0.35,
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        openAchievement(type);
                      }}
                    >
                      <span style="font-size: 1.5rem">{meta.emoji}</span>
                      <span style="font-size: 0.55rem; text-align: center; color: var(--neon-green); font-family: var(--font-mono); line-height: 1.2;">
                        {earned ? meta.title : '???'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
        <button class="btn btn-primary mt-4 w-full" onClick={onClose}>
          RETURN_TO_LOBBY
        </button>
      </div>
    </div>
  );
}
