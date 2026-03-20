import { getState } from './state';
import { el } from './renderer';

export const HELP_CONTENT: Record<string, { title: string; body: string }> = {
  lp: {
    title: 'Life Points (LP)',
    body: 'Your total health. Reach 0 and you lose. Damage from columns overflows to LP if no cards are left in that column. Each player starts with 20 LP.',
  },
  battlefield: {
    title: 'The Battlefield',
    body: '4 columns, each with a Front and Back row. Front row cards protect the back row. Cards in a column protect your LP from overflow damage.',
  },
  hand: {
    title: 'Your Hand',
    body: 'Cards available to play. During deployment, you place cards to fill your columns. During reinforcement, you add one card to a specific column to increase its health.',
  },
  stats: {
    title: 'Tactical Stats',
    body: 'Monitor Deck size, Discard Pile (GY), and Hand counts. Knowing how many cards are left helps predict your opponent\u2019s options.',
  },
  log: {
    title: 'Battle Log',
    body: 'A tactical history of all attacks. Use this to track suit power triggers (like Diamond Shields or Spade double-damage) that happened during the turn.',
  },
};

export function renderHelpMarker(key: string, container: HTMLElement): void {
  const content = HELP_CONTENT[key];
  if (!getState().showHelp || !content) return;

  const marker = el('button', 'help-marker');
  marker.textContent = '?';
  marker.setAttribute('aria-label', `Help for ${content.title}`);
  marker.addEventListener('click', (e) => {
    e.stopPropagation();
    renderHelpOverlay(key);
  });
  container.appendChild(marker);
}

export function renderHelpOverlay(key: string): void {
  const content = HELP_CONTENT[key];
  if (!content) return;

  const overlay = el('div', 'help-overlay');
  const modal = el('div', 'help-modal');

  const title = el('h3', 'help-title');
  title.textContent = content.title;

  const body = el('p', 'help-body');
  body.textContent = content.body;

  const closeBtn = el('button', 'btn btn-primary close-help');
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', () => {
    overlay.remove();
  });

  modal.appendChild(title);
  modal.appendChild(body);
  modal.appendChild(closeBtn);
  overlay.appendChild(modal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
}
