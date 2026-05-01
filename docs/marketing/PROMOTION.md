# Phalanx Duel — Promotion Materials

## Reddit Post (r/playmygame / r/WebGames)

### Post Title Options

- **I made a free tactical card game for two players using a standard deck — play in your browser**
- **Built a 1v1 card strategy game where suit determines role (shields vs weapons) — free, no account needed to try**
- **Phalanx Duel — deterministic 1v1 card combat in your browser, built with a standard 52-card deck**

### Post Body

> I've spent the last year building a two-player tactical card game that runs in your browser.
> You play with a standard 52-card deck. Red suits (Hearts ♥ and Diamonds ♦) act as shields — they
> absorb and deflect damage. Black suits (Spades ♠ and Clubs ♣) act as weapons — Spades double
> damage that reaches the opponent's life points, Clubs double overflow damage when they destroy a
> card. You deploy cards face-down into a 2-row battlefield, then attack by column. Face cards
> (Jack, Queen, King) have a hierarchy — a Jack can't destroy a Queen. Aces are nearly invincible
> unless hit by another Ace.
>
> The game has bot opponents if you want to practice solo, a ranked matchmaking system (Glicko-2),
> spectator mode, a full battle log, and reconnect support so dropped connections don't lose your
> game. It runs on desktop and mobile.
>
> **Play free:** https://play.phalanxduel.com
>
> No account required to play against a bot. Create a free account to track your rating and play
> ranked matches.
>
> [gameplay GIF here]
>
> Source is open under AGPLv3 on GitHub. Would love to hear what you think about the suit mechanics
> — the balance between shield placement and weapon positioning is where most of the strategy lives.

---

## Prepared FAQ Responses

### "What is this exactly?"

> It's a 1v1 strategy card game built for the browser. You use a standard 52-card deck split
> between two players. Each suit has a role: Hearts and Diamonds defend, Spades and Clubs attack.
> You deploy cards into a 4-column battlefield (two rows deep) and take turns attacking by column.
> Damage flows through columns — front card → back card → opponent's life points. The tactical
> layer comes from knowing which suits to put where and reading your opponent's field.

### "How long does a game take?"

> Casual games typically run 15–25 minutes. Quick games with low life points (the "Quick Duel"
> setting) can finish in 5–10 minutes. There's no time limit, so you can play slowly and think
> through positioning.

### "Does it work on mobile?"

> Yes, it's fully playable on mobile. The UI is responsive. Matches continue across devices — you
> can start on desktop and finish on mobile with the same account.

### "Is it free? Is there a catch?"

> Free to play, no ads, no paywalls, no microtransactions. The entire project is open source
> (AGPLv3). I built it because I wanted a browser-native card game with real strategic depth, not
> a slot machine.

### "How do I report a bug?"

> File an issue on GitHub: https://github.com/phalanxduel/phalanxduel/issues — there's a bug
> report template. Include the board state if you can (the battle log records every action and
> there's a copy button).

### "Can I play solo?"

> Yes. There are bot opponents at two difficulty levels (random and heuristic). Ranked matchmaking
> also has an ELO-style system so you'll be matched with players near your skill level once rated.

### "Is there a tutorial?"

> There's a Quick Start Guide in the lobby that walks through the rules, and in-game tooltips on
> every card's suit role. The rules are also on the site at https://phalanxduel.com/guide — it's a
> short read.

### "What makes the strategy non-trivial?"

> A few things interact: (1) Cards are deployed face-down so you don't know your opponent's
> formation until attacks reveal them. (2) Suit interactions create trade-offs — a high-value Club
> attacker is powerful but telegraphs intent. (3) Face card hierarchy means a Jack in your
> front row can't be removed by another Jack, only a Queen or King. (4) Ace invulnerability means
> one well-placed Ace blocks nearly any non-Ace attacker indefinitely. The layers compound.

---

## Key Links

- **Play:** https://play.phalanxduel.com
- **Site:** https://phalanxduel.com
- **Rules:** https://phalanxduel.com/guide
- **Source:** https://github.com/phalanxduel/phalanxduel
- **Issues:** https://github.com/phalanxduel/phalanxduel/issues
