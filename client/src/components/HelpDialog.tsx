import { useEffect, useRef } from 'preact/hooks';

interface HelpTopic {
  id: string;
  title: string;
  intel: string;
  objective: string;
  context: string;
  cta: string;
  videoUrl?: string;
}

const TOPICS: Record<string, HelpTopic> = {
  lobby: {
    id: 'lobby',
    title: 'INITIATION_ZONE',
    intel:
      'The central hub for engagement coordination. Select SOLO_OPERATIONS for rapid AI duels or SQUAD_OPERATIONS for peer engagements.',
    objective: 'Enter your OPERATIVE_ID and choose a deployment mode.',
    context:
      'Start with the formation: establish your line, then decide where you want pressure and protection.',
    cta: 'RETURN TO LOBBY',
    videoUrl: '/tutorials/lobby_quickstart.webm',
  },
  deployment: {
    id: 'deployment',
    title: 'DEPLOYMENT_PHASE',
    intel:
      'Authorization to position Phalanx units. Front row units provide active defense and offensive reach. Back row units act as tactical reserves.',
    objective: 'Select a card from your HAND and designate a BATTLEFIELD coordinate.',
    context:
      'Deployment is the moment of proportion. Every placement changes which line protects the core.',
    cta: 'RETURN TO MATCH',
    videoUrl: '/tutorials/deployment_basics.webm',
  },
  combat: {
    id: 'combat',
    title: 'COMBAT_RESOLUTION',
    intel:
      'Kinetic engagement initiated. Target hostile units to degrade their operational capacity.',
    objective: 'Select a target unit and initiate the attack command.',
    context:
      'Combat is resolved by the engine in sequence: compare, resolve, then follow the damage path.',
    cta: 'RETURN TO MATCH',
    videoUrl: '/tutorials/attack_basics.webm',
  },
  cascade: {
    id: 'cascade',
    title: 'CASCADE_MECHANICS',
    intel:
      'Damage exceeding unit capacity flows forward. Protect your FRONT row to prevent core degradation.',
    objective: 'Monitor overflow damage and maintain unit integrity.',
    context:
      'A strong line absorbs pressure together. Watch the column, not just the card that was hit.',
    cta: 'RETURN TO MATCH',
    videoUrl: '/tutorials/combat_cascade.webm',
  },
};

export function HelpDialog({ topicId, onClose }: { topicId: string; onClose: () => void }) {
  const topic = TOPICS[topicId] ?? TOPICS.lobby!;
  const primaryActionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    primaryActionRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div class="phx-modal-overlay" onClick={onClose} role="presentation">
      <div
        class="phx-modal-content hud-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="phx-help-dialog-title"
        aria-describedby="phx-help-dialog-description"
        data-component="HelpDialog"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <header class="phx-modal-header">
          <h2 class="section-label" id="phx-help-dialog-title">
            {topic.title}
          </h2>
          <button class="btn btn-secondary btn-tiny" onClick={onClose} aria-label="Close help">
            X
          </button>
        </header>

        <div class="phx-modal-body">
          {topic.videoUrl && (
            <div class="tutorial-video-container">
              <video src={topic.videoUrl} autoPlay loop muted playsInline class="tutorial-video" />
              <div class="video-overlay-glitch" />
            </div>
          )}

          <div class="intel-block">
            <h4 class="meta-tag">INTEL_BRIEFING</h4>
            <p class="intel-text" id="phx-help-dialog-description">
              {topic.intel}
            </p>
          </div>

          <div class="intel-block intel-block-context">
            <h4 class="meta-tag" style="color: var(--bronze)">
              FIELD CONTEXT
            </h4>
            <p class="intel-text">{topic.context}</p>
          </div>

          <div class="intel-block">
            <h4 class="meta-tag" style="color: var(--gold)">
              OBJECTIVE
            </h4>
            <p class="intel-text">{topic.objective}</p>
          </div>
        </div>

        <footer class="phx-modal-footer">
          <button ref={primaryActionRef} class="btn btn-primary" onClick={onClose}>
            {topic.cta}
          </button>
        </footer>
      </div>
    </div>
  );
}
