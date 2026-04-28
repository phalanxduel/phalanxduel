import { useState } from 'preact/hooks';

const STORAGE_KEY = 'phx_welcome_v1_seen';

const LINKS = {
  homepage: 'https://phalanxduel.com',
  github: 'https://github.com/phalanxduel/game',
  issues: 'https://github.com/phalanxduel/game/issues',
  guide: 'https://phalanxduel.com/guide',
  githubSponsor: 'https://github.com/sponsors/just3ws',
  buyMeACoffee: 'https://buymeacoffee.com/just3ws',
  staging: 'https://phalanxduel-staging.fly.dev',
  support: 'mailto:support@phalanxduel.com',
};

function canStore(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

export function useWelcomeDialog(): {
  open: boolean;
  show: () => void;
  dismiss: () => void;
} {
  const [open, setOpen] = useState(() => {
    if (!canStore()) return false;
    return !localStorage.getItem(STORAGE_KEY);
  });

  const dismiss = () => {
    if (canStore()) localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  };

  const show = () => {
    setOpen(true);
  };

  return { open, show, dismiss };
}

export function WelcomeDialog({
  onClose,
  onRegister,
}: {
  onClose: () => void;
  onRegister?: () => void;
}) {
  return (
    <div class="phx-modal-overlay welcome-overlay" onClick={onClose}>
      <div
        class="phx-modal-content hud-panel welcome-panel"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <header class="phx-modal-header">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div class="onboarding-icon-pulse" />
            <h2 class="section-label">WELCOME TO PHALANX DUEL</h2>
          </div>
          <button class="btn btn-secondary btn-tiny" onClick={onClose} aria-label="Close">
            X
          </button>
        </header>

        <div class="phx-modal-body welcome-body">
          <div class="intel-block">
            <h4 class="meta-tag">WHAT IS THIS</h4>
            <p class="intel-text">
              Phalanx Duel is a strategic card game I invented with a plain deck of playing cards
              and some friends willing to give it a try. Now it's on the web — same core concept,
              online multiplayer, and a few things a physical deck can't do.
            </p>
          </div>

          <div class="intel-block welcome-status-block">
            <h4 class="meta-tag">CURRENT STATUS</h4>
            <div class="welcome-status-grid">
              <div class="welcome-status-item welcome-status-live">
                <span class="welcome-status-dot" />
                <span>Core gameplay — stable and playable</span>
              </div>
              <div class="welcome-status-item welcome-status-live">
                <span class="welcome-status-dot" />
                <span>Spectator mode — watch and stream live matches</span>
              </div>
              <div class="welcome-status-item welcome-status-beta">
                <span class="welcome-status-dot" />
                <span>Ladder &amp; ELO ranking — live, in BETA</span>
              </div>
              <div class="welcome-status-item welcome-status-beta">
                <span class="welcome-status-dot" />
                <span>Matchmaking — nascent, being built out</span>
              </div>
              <div class="welcome-status-item welcome-status-wip">
                <span class="welcome-status-dot" />
                <span>Overall — early access, still working out kinks</span>
              </div>
            </div>
          </div>

          <div class="intel-block welcome-cta-block">
            <h4 class="meta-tag" style="color: var(--gold);">
              JOIN &amp; PLAY
            </h4>
            <p class="intel-text">
              Create a free account to track your rating on the ladder, build your match history,
              and get ranked as the game grows. Guest play is available, but registration locks in
              your progress.
            </p>
            <div class="welcome-cta-actions">
              {onRegister && (
                <button
                  class="btn btn-primary"
                  onClick={() => {
                    onClose();
                    onRegister();
                  }}
                >
                  CREATE ACCOUNT
                </button>
              )}
              <a href={LINKS.guide} target="_blank" class="btn btn-secondary">
                READ THE RULES
              </a>
            </div>
          </div>

          <div class="intel-block">
            <h4 class="meta-tag">A NOTE FROM THE CREATOR</h4>
            <p class="intel-text" style="font-style: italic; opacity: 0.9;">
              This is a labor of love. I built Phalanx Duel because I wanted to share something I
              genuinely enjoy with more people — and because building it has been its own reward.
              It's not done, but I feel good about where it is. Your feedback, patience, and
              willingness to play an unfinished game means a lot. — Mike
            </p>
          </div>

          <div class="intel-block">
            <h4 class="meta-tag" style="color: var(--warning, #f59e0b);">
              SECURITY NOTE
            </h4>
            <p class="intel-text">
              <strong>Do not reuse a password here.</strong> This is an early-access game, not a
              hardened production service. I will do my best with your data, but please use a
              throwaway password.
            </p>
          </div>

          <div class="intel-block">
            <h4 class="meta-tag">FOLLOW ALONG</h4>
            <div class="welcome-links-grid">
              <a href={LINKS.homepage} target="_blank" class="welcome-link-card">
                <span class="welcome-link-label">HOMEPAGE</span>
                <span class="welcome-link-sub">phalanxduel.com</span>
              </a>
              <a href={LINKS.github} target="_blank" class="welcome-link-card">
                <span class="welcome-link-label">GITHUB REPO</span>
                <span class="welcome-link-sub">Source &amp; development</span>
              </a>
              <a href={LINKS.issues} target="_blank" class="welcome-link-card">
                <span class="welcome-link-label">ISSUES &amp; IDEAS</span>
                <span class="welcome-link-sub">Bugs, requests, suggestions</span>
              </a>
              <a
                href={LINKS.githubSponsor}
                target="_blank"
                class="welcome-link-card welcome-link-card--sponsor"
              >
                <span class="welcome-link-label">SPONSOR ON GITHUB</span>
                <span class="welcome-link-sub">github.com/sponsors/just3ws</span>
              </a>
              <a
                href={LINKS.buyMeACoffee}
                target="_blank"
                class="welcome-link-card welcome-link-card--sponsor"
              >
                <span class="welcome-link-label">BUY ME A COFFEE</span>
                <span class="welcome-link-sub">buymeacoffee.com/just3ws</span>
              </a>
              <a href={LINKS.staging} target="_blank" class="welcome-link-card">
                <span class="welcome-link-label">STAGING PREVIEW</span>
                <span class="welcome-link-sub">Early features &amp; experiments</span>
              </a>
            </div>
          </div>

          <div class="intel-block welcome-contact-block">
            <p class="intel-text" style="font-size: 0.85rem; text-align: center;">
              Questions or issues?{' '}
              <a href={LINKS.support} class="footer-link">
                support@phalanxduel.com
              </a>
            </p>
          </div>
        </div>

        <footer class="phx-modal-footer welcome-footer">
          <span class="welcome-footer-note">
            Reopen anytime via <strong>ABOUT</strong> in the footer.
          </span>
          <button class="btn btn-primary" onClick={onClose}>
            LET'S PLAY
          </button>
        </footer>
      </div>
    </div>
  );
}
