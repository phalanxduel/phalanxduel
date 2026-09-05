const GLOSSARY = [
  {
    term: 'Phalanx · φάλαγξ',
    meaning:
      'An ordered battle line. In Phalanx Duel, your 2×4 grid is the line you must keep intact.',
  },
  {
    term: 'Syntagma · σύνταγμα',
    meaning:
      'Coordination through ordered parts. It is the spirit of the formation, not an extra rule to memorize.',
  },
  {
    term: 'Front row · vanguard',
    meaning: 'The first line of each column. It attacks first and receives the first impact.',
  },
  {
    term: 'Back row · reserve',
    meaning: 'The second line. It receives carryover damage and can be reinforced after combat.',
  },
  {
    term: 'Cascade · carryover',
    meaning: 'Damage that exceeds one card’s value and continues backward through the column.',
  },
  {
    term: 'Core · life points (LP)',
    meaning: 'Your final line of defense. When your LP reaches 0, the match ends.',
  },
  {
    term: 'Boundary effect · suit power',
    meaning: 'A suit effect that triggers when damage crosses a card, row, or core boundary.',
  },
  {
    term: 'Reinforcement',
    meaning: 'A post-attack placement into an empty back-row slot to restore or reshape a column.',
  },
] as const;

export function PlayerGlossary() {
  return (
    <section class="intel-block glossary-block" data-component="PlayerGlossary">
      <div class="glossary-heading">
        <div>
          <h4 class="meta-tag" style="color: var(--gold)">
            FIELD GLOSSARY · ΛΕΞΙΚΟ
          </h4>
          <p class="glossary-intro">The language of the line, translated for play.</p>
        </div>
        <span class="glossary-mark" aria-hidden="true">
          ΦΑΛΑΓΞ
        </span>
      </div>
      <dl class="glossary-grid">
        {GLOSSARY.map(({ term, meaning }) => (
          <div class="glossary-entry" key={term}>
            <dt>{term}</dt>
            <dd>{meaning}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
