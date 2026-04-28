import { useState } from 'preact/hooks';
import type { GamePhase, GameState } from '@phalanxduel/shared';

interface OnboardingBriefingProps {
  phase: GamePhase;
  gameState: GameState;
  onClose: () => void;
}

const ONBOARDING_KEYS = {
  DeploymentPhase: 'phx_onboarding_deploy_seen',
  AttackPhase: 'phx_onboarding_combat_seen',
};

export function OnboardingBriefing({ phase, gameState, onClose }: OnboardingBriefingProps) {
  const [visible, setVisible] = useState(() => {
    const key = ONBOARDING_KEYS[phase as keyof typeof ONBOARDING_KEYS];
    if (!key) return false;
    if (
      typeof window === 'undefined' ||
      !window.localStorage ||
      typeof window.localStorage.getItem !== 'function'
    )
      return false;
    return (
      !window.localStorage.getItem(key) && gameState?.players?.[0]?.player?.name !== 'Spectator'
    );
  });

  if (!visible) return null;

  const handleAcknowledge = () => {
    const key = ONBOARDING_KEYS[phase as keyof typeof ONBOARDING_KEYS];
    if (key) localStorage.setItem(key, 'true');
    setVisible(false);
    onClose();
  };

  const isDeployment = phase === 'DeploymentPhase';
  const isCumulative = gameState.params.modeDamagePersistence === 'cumulative';

  return (
    <div class="phx-modal-overlay onboarding-overlay" onClick={handleAcknowledge}>
      <div
        class="phx-modal-content hud-panel onboarding-panel"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <header class="phx-modal-header">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div class="onboarding-icon-pulse" />
            <h2 class="section-label">
              {isDeployment ? 'TACTICAL_BRIEFING: DEPLOYMENT' : 'TACTICAL_BRIEFING: COMBAT'}
            </h2>
          </div>
          <button class="btn btn-secondary btn-tiny" onClick={handleAcknowledge}>
            X
          </button>
        </header>

        <div class="phx-modal-body">
          <div class="tutorial-video-container onboarding-video-container">
            <video
              src={
                isDeployment ? '/tutorials/deployment_basics.webm' : '/tutorials/attack_basics.webm'
              }
              autoPlay
              loop
              muted
              playsInline
              class="tutorial-video"
            />
            {isDeployment && (
              <div class="ghost-hand-animation">
                <div class="ghost-cursor" />
              </div>
            )}
          </div>

          <div class="intel-block">
            <h4 class="meta-tag">MISSION_PARAMETERS</h4>
            <p class="intel-text">
              {isDeployment ? (
                <>
                  Establish your perimeter. The <strong>PHALANX_HAND</strong> at the bottom contains
                  your available units. Drag or select a unit, then designate a position on the{' '}
                  <strong>BATTLEFIELD GRID</strong>. Front-line units provide active defense, while
                  the back-line serves as tactical reserves.
                </>
              ) : (
                <>
                  Hostile contact confirmed. Engage enemy units to degrade their operational
                  capacity.
                  {isCumulative ? (
                    <>
                      <strong>CUMULATIVE_MODE:</strong> Units retain damage across engagements.
                      Focused fire will eventually breach any defense.
                    </>
                  ) : (
                    <>
                      <strong>CLASSIC_MODE:</strong> To destroy a unit, your{' '}
                      <strong>ATTACK_POWER</strong>
                      must meet or exceed the target's <strong>DEFENSE_RATING</strong>.
                    </>
                  )}
                </>
              )}
            </p>
          </div>

          <div class="intel-block">
            <h4 class="meta-tag" style="color: var(--gold)">
              OPERATIVE_DIRECTIVES
            </h4>
            <ul class="intel-list">
              {isDeployment ? (
                <>
                  <li>Fill all front-row slots to transition to combat.</li>
                  <li>Higher rank units provide stronger line-of-defense.</li>
                  <li>Click units in your hand to see their stats.</li>
                </>
              ) : (
                <>
                  <li>Select an active unit, then choose a hostile target.</li>
                  <li>Damage exceeding a unit's capacity flows to the unit behind it.</li>
                  <li>Pass turn when your tactical options are exhausted.</li>
                </>
              )}
            </ul>
          </div>

          <div class="intel-block">
            <h4 class="meta-tag" style="color: var(--neon-blue)">
              COMMUNICATIONS_NOTICE
            </h4>
            <p class="intel-text" style="font-size: 0.8rem; font-style: italic;">
              Operational Note: Tactical Ranking (Ladder) and Matchmaking modules are currently in{' '}
              <strong>BETA_EVALUATION</strong>. Combat telemetry is being monitored for
              optimization.
            </p>
          </div>

          <div class="onboarding-links">
            <a href="https://phalanxduel.com/guide" target="_blank" class="footer-link">
              ACCESS_PLAYER_GUIDE_INTERNAL_LINK [EXTERNAL]
            </a>
          </div>
        </div>

        <footer class="phx-modal-footer">
          <button class="btn btn-primary" onClick={handleAcknowledge}>
            INITIALIZE_ENGAGEMENT
          </button>
        </footer>
      </div>
    </div>
  );
}
