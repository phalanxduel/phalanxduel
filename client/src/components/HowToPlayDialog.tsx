interface HowToPlayDialogProps {
  onClose: () => void;
}

export function HowToPlayDialog({ onClose }: HowToPlayDialogProps) {
  return (
    <div class="phx-modal-overlay onboarding-overlay" onClick={onClose}>
      <div
        class="phx-modal-content hud-panel"
        style="max-width: 700px; max-height: 90vh; overflow-y: auto;"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <header
          class="phx-modal-header"
          style="position: sticky; top: 0; background: var(--bg-dark); z-index: 10;"
        >
          <h2 class="section-label">HOW TO PLAY (RULES OVERVIEW)</h2>
          <button class="btn btn-secondary btn-tiny" onClick={onClose}>
            X
          </button>
        </header>

        <div
          class="phx-modal-body"
          style="display: flex; flex-direction: column; gap: 24px; padding-top: 16px;"
        >
          {/* Mission Objective */}
          <section class="intel-block">
            <h4 class="meta-tag" style="color: var(--gold)">
              1. MISSION OBJECTIVE
            </h4>
            <p class="intel-text" style="font-size: 1rem; line-height: 1.5;">
              Engage the enemy on a tactical grid. Your goal is to breach their defenses and degrade
              their <strong>CORE LIFEPOINTS</strong> to 0. You achieve this by deploying units
              (cards) and initiating attacks.
            </p>
          </section>

          {/* Deployment Phase */}
          <section class="intel-block">
            <h4 class="meta-tag" style="color: var(--neon-blue)">
              2. DEPLOYMENT PHASE
            </h4>
            <p class="intel-text" style="font-size: 1rem; line-height: 1.5;">
              Each operative must deploy exactly one unit per turn until their 2x4 grid is filled.
              The <strong>FRONT ROW</strong> acts as the vanguard for attacking and defense. The{' '}
              <strong>BACK ROW</strong> provides tactical reserve and reinforcement.
            </p>
            <div style="display: flex; justify-content: center; gap: 8px; margin-top: 12px; flex-wrap: wrap;">
              <div style="width: 40px; height: 60px; border: 1px dashed var(--neon-blue); display: flex; align-items: center; justify-content: center; font-size: 0.6rem; color: var(--neon-blue);">
                BACK
              </div>
              <div style="width: 40px; height: 60px; border: 1px dashed var(--neon-blue); display: flex; align-items: center; justify-content: center; font-size: 0.6rem; color: var(--neon-blue);">
                BACK
              </div>
              <div style="width: 40px; height: 60px; border: 1px dashed var(--neon-blue); display: flex; align-items: center; justify-content: center; font-size: 0.6rem; color: var(--neon-blue);">
                BACK
              </div>
              <div style="width: 40px; height: 60px; border: 1px dashed var(--neon-blue); display: flex; align-items: center; justify-content: center; font-size: 0.6rem; color: var(--neon-blue);">
                BACK
              </div>
            </div>
            <div style="display: flex; justify-content: center; gap: 8px; margin-top: 4px; flex-wrap: wrap;">
              <div style="width: 40px; height: 60px; border: 1px solid var(--gold); display: flex; align-items: center; justify-content: center; font-size: 0.6rem; color: var(--gold); background: rgba(255,186,8,0.1);">
                FRONT
              </div>
              <div style="width: 40px; height: 60px; border: 1px solid var(--gold); display: flex; align-items: center; justify-content: center; font-size: 0.6rem; color: var(--gold); background: rgba(255,186,8,0.1);">
                FRONT
              </div>
              <div style="width: 40px; height: 60px; border: 1px solid var(--gold); display: flex; align-items: center; justify-content: center; font-size: 0.6rem; color: var(--gold); background: rgba(255,186,8,0.1);">
                FRONT
              </div>
              <div style="width: 40px; height: 60px; border: 1px solid var(--gold); display: flex; align-items: center; justify-content: center; font-size: 0.6rem; color: var(--gold); background: rgba(255,186,8,0.1);">
                FRONT
              </div>
            </div>
          </section>

          {/* Combat Cascade */}
          <section class="intel-block">
            <h4 class="meta-tag" style="color: var(--neon-offense)">
              3. COMBAT & CASCADE MECHANICS
            </h4>
            <p class="intel-text" style="font-size: 1rem; line-height: 1.5;">
              Attack an opposing column using your active <strong>FRONT ROW</strong> unit. If the
              attacker's value is greater than the defender's, the target is destroyed.
              <br />
              <br />
              Any remaining damage (Carryover) cascades backward to the next unit in the target
              column. Once a column is completely breached, carryover damage strikes the enemy's{' '}
              <strong>CORE LIFEPOINTS</strong>.
            </p>
          </section>

          {/* Suit Abilities */}
          <section class="intel-block">
            <h4 class="meta-tag" style="color: var(--neon-red)">
              4. SUIT ABILITIES
            </h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px;">
              <div class="status-card" style="border-left: 2px solid var(--neon-blue);">
                <div class="status-title" style="color: var(--neon-blue); font-size: 1.2rem;">
                  ♠ SPADES (Offense)
                </div>
                <div class="status-val" style="margin-top: 8px;">
                  Deals <strong>2x Damage</strong> directly to the opponent's Core Lifepoints.
                </div>
              </div>
              <div class="status-card" style="border-left: 2px solid var(--neon-blue);">
                <div class="status-title" style="color: var(--neon-blue); font-size: 1.2rem;">
                  ♣ CLUBS (Offense)
                </div>
                <div class="status-val" style="margin-top: 8px;">
                  Deals <strong>2x Damage</strong> against the very first unit it hits during an
                  attack.
                </div>
              </div>
              <div class="status-card" style="border-left: 2px solid var(--neon-red);">
                <div class="status-title" style="color: var(--neon-red); font-size: 1.2rem;">
                  ♥ HEARTS (Defense)
                </div>
                <div class="status-val" style="margin-top: 8px;">
                  When destroyed, its value is absorbed from the attack before hitting your Core
                  Lifepoints.
                </div>
              </div>
              <div class="status-card" style="border-left: 2px solid var(--neon-red);">
                <div class="status-title" style="color: var(--neon-red); font-size: 1.2rem;">
                  ♦ DIAMONDS (Defense)
                </div>
                <div class="status-val" style="margin-top: 8px;">
                  Pierces shields. Deals damage equal to its value directly, stopping any cascade or
                  carryover.
                </div>
              </div>
            </div>
          </section>

          {/* Classic Rules for Aces & Face Cards */}
          <section class="intel-block">
            <h4 class="meta-tag" style="color: #fff">
              5. FACE CARDS & ACES
            </h4>
            <ul class="intel-list" style="margin-top: 12px; font-size: 0.9rem;">
              <li>
                <strong>Jacks</strong> can only be destroyed by other Jacks, Queens, or Kings.
              </li>
              <li>
                <strong>Queens</strong> can only be destroyed by other Queens or Kings.
              </li>
              <li>
                <strong>Kings</strong> can only be destroyed by other Kings.
              </li>
              <li>
                <strong>Aces</strong> are highly evasive and can <em>only</em> be destroyed by other
                Aces.
              </li>
              <li>
                If an attack fails to meet these criteria, the target survives and halts the
                cascade.
              </li>
            </ul>
          </section>

          {/* Hiding / Fog of War */}
          <section class="intel-block">
            <h4 class="meta-tag" style="color: var(--text-muted)">
              6. FACE-DOWN DEPLOYMENT
            </h4>
            <p
              class="intel-text"
              style="font-size: 0.9rem; line-height: 1.5; color: var(--text-muted);"
            >
              Any card can be deployed face-down to hide it from your opponent. It will
              automatically be revealed when it attacks or is attacked. Use this to hide traps or
              critical offensive units.
            </p>
          </section>
        </div>

        <footer class="phx-modal-footer">
          <button class="btn btn-primary" onClick={onClose} style="width: 100%;">
            ACKNOWLEDGE RULES
          </button>
        </footer>
      </div>
    </div>
  );
}
