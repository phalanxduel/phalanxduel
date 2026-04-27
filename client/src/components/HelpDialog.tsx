interface HelpTopic {
  id: string;
  title: string;
  intel: string;
  objective: string;
  videoUrl?: string;
}

const TOPICS: Record<string, HelpTopic> = {
  lobby: {
    id: 'lobby',
    title: 'INITIATION_ZONE',
    intel:
      'The central hub for engagement coordination. Select SOLO_OPERATIONS for rapid AI duels or SQUAD_OPERATIONS for peer engagements.',
    objective: 'Enter your OPERATIVE_ID and choose a deployment mode.',
    videoUrl: '/tutorials/lobby_quickstart.webm',
  },
  deployment: {
    id: 'deployment',
    title: 'DEPLOYMENT_PHASE',
    intel:
      'Authorization to position Phalanx units. Front row units provide active defense and offensive reach. Back row units act as tactical reserves.',
    objective: 'Select a card from your HAND and designate a BATTLEFIELD coordinate.',
    videoUrl: '/tutorials/deployment_basics.webm',
  },
  combat: {
    id: 'combat',
    title: 'COMBAT_RESOLUTION',
    intel:
      'Kinetic engagement initiated. Target hostile units to degrade their operational capacity.',
    objective: 'Select a target unit and initiate the attack command.',
    videoUrl: '/tutorials/attack_basics.webm',
  },
  cascade: {
    id: 'cascade',
    title: 'CASCADE_MECHANICS',
    intel:
      'Damage exceeding unit capacity flows forward. Protect your FRONT row to prevent core degradation.',
    objective: 'Monitor overflow damage and maintain unit integrity.',
    videoUrl: '/tutorials/combat_cascade.webm',
  },
};

export function HelpDialog({ topicId, onClose }: { topicId: string; onClose: () => void }) {
  const topic = TOPICS[topicId] ?? TOPICS.lobby!;

  return (
    <div class="phx-modal-overlay" onClick={onClose}>
      <div
        class="phx-modal-content hud-panel"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <header class="phx-modal-header">
          <h2 class="section-label">{topic.title}</h2>
          <button class="btn btn-secondary btn-tiny" onClick={onClose}>
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
            <p class="intel-text">{topic.intel}</p>
          </div>

          <div class="intel-block">
            <h4 class="meta-tag" style="color: var(--gold)">
              OBJECTIVE
            </h4>
            <p class="intel-text">{topic.objective}</p>
          </div>
        </div>

        <footer class="phx-modal-footer">
          <button class="btn btn-primary" onClick={onClose}>
            ACKNOWLEDGE
          </button>
        </footer>
      </div>
    </div>
  );
}
