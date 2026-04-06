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
  'target-chain': {
    title: 'Damage Chain',
    body: 'Attacker hits the Front row card first. Overflow passes to the Back row card, then to the player\u2019s LP. Suit boundary effects trigger at each transition. \u2192 shows the carryover in the battle log.',
  },
  suits: {
    title: 'Suit Effects (Boundaries)',
    body: '\u2666 Diamond (front card destroyed): absorbs overflow \u2014 remaining = max(remaining \u2212 cardValue, 0). \u2663 Club (attacker): first overflow to back card is doubled (\u00d72). \u2665 Heart (last card destroyed before LP): absorbs LP damage \u2014 remaining = max(remaining \u2212 cardValue, 0). \u2660 Spade (attacker): direct LP damage is doubled (\u00d72).',
  },
  aces: {
    title: 'Ace Invulnerability',
    body: 'An Ace absorbs 1 damage and cannot be destroyed \u2014 unless the attacker is also an Ace. Ace-vs-Ace resolves normally. Overflow continues past a surviving Ace.',
  },
  'face-cards': {
    title: 'Face Card Hierarchy',
    body: 'In Classic mode, face cards can only destroy cards of equal or lower rank. Jack destroys: Jack. Queen destroys: Jack, Queen. King destroys: Jack, Queen, King. An ineligible face card takes damage but blocks overflow and cannot be destroyed.',
  },
  'pass-forfeit': {
    title: 'Pass & Forfeit',
    body: 'Pass if you cannot or choose not to attack. Automatic forfeit triggers at 3 consecutive passes or 5 total passes. The Pass counter (e.g. 1/2) shows consecutive/total.',
  },
  reinforce: {
    title: 'Reinforcement',
    body: 'After each attack, you may deploy one card from your hand to any empty Back row slot. This replenishes defense or sets up a double-column. Skip reinforcement by choosing not to place a card.',
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
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'help-dialog-title');

  const modal = el('div', 'help-modal');

  const title = el('h3', 'help-title');
  title.id = 'help-dialog-title';
  title.textContent = content.title;

  const body = el('p', 'help-body');
  body.textContent = content.body;

  const closeBtn = el('button', 'btn btn-primary close-help');
  closeBtn.textContent = 'Close';
  const dismiss = (): void => {
    overlay.remove();
  };
  closeBtn.addEventListener('click', dismiss);

  modal.appendChild(title);
  modal.appendChild(body);
  modal.appendChild(closeBtn);
  overlay.appendChild(modal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) dismiss();
  });

  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') dismiss();
  });

  document.body.appendChild(overlay);
  closeBtn.focus();
}
