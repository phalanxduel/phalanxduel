import { useState, useEffect } from 'preact/hooks';
import { ACHIEVEMENT_METADATA } from '@phalanxduel/shared';
import type { AchievementMetadata, AchievementType } from '@phalanxduel/shared';
import { setScreen, openAchievement } from '../state.js';

const EMOJIS: Record<string, string> = {
  FIRST_WIN: '🏆',
  FIRST_MATCH: '🎯',
  ACE_SLAYER: '♠️',
  CLEAN_SWEEP: '🧹',
  FULL_HOUSE: '🃏',
  ROYAL_GUARD: '👑',
  DOUBLE_DOWN: '2️⃣',
  LAST_STAND: '🛡️',
  IRON_WALL: '🧱',
  HIGH_CARD: '🎴',
  COMEBACK_KID: '🔄',
  OPENING_GAMBIT: '⚔️',
  TEN_WINS: '🥉',
  FIFTY_WINS: '🥈',
  HUNDRED_WINS: '🥇',
  DEUCE_COUP: '✌️',
  TRIPLE_THREAT: '3️⃣',
  DEAD_MANS_HAND: '💀',
  FLAWLESS_VICTORY: '💎',
  BLITZKRIEG: '⚡',
  OVERKILL: '💥',
};

export function AchievementDetailView({ type }: { type: string }) {
  const [rarity, setRarity] = useState<number | null>(null);
  const metadata = ACHIEVEMENT_METADATA[type as AchievementType] as AchievementMetadata | undefined;

  useEffect(() => {
    fetch('/api/achievements/stats')
      .then((res) => res.json())
      .then((data: { stats: Record<string, number> }) => {
        setRarity(data.stats[type] ?? 0);
      })
      .catch(() => {
        setRarity(0);
      });
  }, [type]);

  if (!metadata) {
    return (
      <div
        class="lobby"
        style="min-height: 100vh; display: flex; align-items: center; justify-content: center;"
      >
        <div class="hud-panel" style="text-align: center;">
          <h2 class="section-label">ERROR</h2>
          <p class="status-card">ACHIEVEMENT_NOT_FOUND</p>
          <button
            class="btn btn-secondary mt-4"
            onClick={() => {
              setScreen('lobby');
            }}
          >
            RETURN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      class="lobby"
      style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem;"
    >
      <div
        class="hud-panel"
        style="max-width: 500px; width: 100%; animation: fadeUp 0.6s ease-out;"
      >
        <div style="display: flex; flex-direction: column; align-items: center; gap: 2rem; padding: 2rem 0;">
          <div
            style={{
              fontSize: '5rem',
              filter: 'drop-shadow(0 0 20px var(--gold-glow))',
              animation: 'pulse 2s infinite ease-in-out',
            }}
          >
            {EMOJIS[type] ?? '✨'}
          </div>

          <div style="text-align: center;">
            <h2 class="title" style="font-size: 2rem; letter-spacing: 0.2em; margin: 0;">
              {metadata.name}
            </h2>
            <p class="subtitle" style="margin-top: 0.5rem; color: var(--gold-dim);">
              {metadata.category.toUpperCase()}
            </p>
          </div>

          <div
            class="status-card"
            style="width: 100%; background: rgba(255,255,255,0.03); border-color: var(--gold-dim);"
          >
            <p style="font-size: 1rem; line-height: 1.6; text-align: center; margin: 0;">
              {metadata.description}
            </p>
          </div>

          <div style="display: flex; gap: 2rem; width: 100%; justify-content: center;">
            <div style="text-align: center;">
              <p class="section-label" style="margin-bottom: 0.5rem;">
                GLOBAL_RARITY
              </p>
              <p class="status-title" style="font-size: 1.5rem; color: var(--gold);">
                {rarity !== null ? `${rarity.toFixed(1)}%` : '...'}
              </p>
            </div>
          </div>

          <div class="action-row" style="width: 100%; margin-top: 1rem;">
            <button
              class="btn btn-secondary w-full"
              onClick={() => {
                setScreen('lobby');
              }}
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 10px var(--gold-glow)); }
          50% { transform: scale(1.1); filter: drop-shadow(0 0 30px var(--gold-glow)); }
        }
      `}</style>
    </div>
  );
}

export function AllAchievementsView() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/achievements/stats')
      .then((res) => res.json())
      .then((data: { stats: Record<string, number> }) => {
        setStats(data.stats);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div class="lobby" style="min-height: 100vh; padding: 3rem 2rem;">
      <div class="hud-panel" style="max-width: 1000px; margin: 0 auto; width: 100%;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem;">
          <div>
            <h1 class="title" style="font-size: 2.5rem; text-align: left; margin: 0;">
              ACHIEVEMENTS
            </h1>
            <p class="subtitle" style="text-align: left; margin-bottom: 0;">
              GLOBAL_DIRECTORY
            </p>
          </div>
          <button
            class="btn btn-secondary"
            onClick={() => {
              setScreen('lobby');
            }}
          >
            RETURN
          </button>
        </div>

        {loading ? (
          <div class="status-card">SYNCHRONIZING_DIRECTORY…</div>
        ) : (
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
            {(Object.entries(ACHIEVEMENT_METADATA) as [AchievementType, AchievementMetadata][]).map(
              ([type, achievementMeta]) => {
                return (
                  <div
                    key={type}
                    class="status-card"
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      background: 'rgba(255,255,255,0.02)',
                      borderColor: 'rgba(255,255,255,0.1)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    }}
                    onClick={() => {
                      openAchievement(type);
                    }}
                  >
                    <div style="font-size: 2rem;">{EMOJIS[type] ?? '✨'}</div>
                    <div style="flex: 1;">
                      <h3 class="status-title" style="margin: 0; font-size: 0.9rem;">
                        {achievementMeta.name}
                      </h3>
                      <p style="font-size: 0.7rem; color: var(--text-dim); margin: 4px 0;">
                        {achievementMeta.description}
                      </p>
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                        <span class="meta-tag" style="font-size: 0.5rem;">
                          {achievementMeta.category.toUpperCase()}
                        </span>
                        <span style="font-size: 0.6rem; color: var(--gold);">
                          {(stats[type] ?? 0).toFixed(1)}% PLAYERS
                        </span>
                      </div>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        )}
      </div>
    </div>
  );
}
