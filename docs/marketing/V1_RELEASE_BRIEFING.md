# ⚔️ Phalanx Duel v1.0 Release Briefing

This briefing provides curated technical capabilities, tactical hooks, and professional framing for the v1.0.0-rev.1 launch.

---

## 🚀 The Technical "Flex" (Reddit / Hacker News / Dev Communities)
*Focus: Engineering excellence, deterministic gameplay, and observability.*

- **100% Deterministic Engine**: Built on a ledger-based "Truth Gate" system. Every match is reproducible, enabling instant replay hash verification and deep-link spectator support.
- **Actor-Based Architecture**: High-concurrency `MatchActor` pattern ensures total state isolation and prevents race conditions in high-frequency tactical waves.
- **Observability-Native**: Integrated with the **Grafana LGTM stack** (Loki, Grafana, Tempo, Mimir). Real-time telemetry for every card play, deployment, and cascade event.
- **Headless QA Pipeline**: The game is "Playable by Design." Every commit passes a full browser-driven automated playthrough, verifying end-to-end game logic without human input.
- **SDK & Bot Support**: Official Go and TypeScript SDKs allow players to build their own AI operatives via WebSocket and REST APIs.
- **Deployment Stack**: Built with **Vite**, **Postgres (Neon)**, and containerized for global scaling on **Fly.io**.

---

## 🃏 Tactical Hooks (Discord / Slack / Casual Gaming)
*Focus: Mechanics, "easy to learn, hard to master," and the vibe.*

- **The Cascade Mechanic**: Damage doesn't just hit a unit—it flows. If your front line fails, the damage cascades through your reserves straight to your core. Protect the line.
- **Row-Based Strategy**: Tactical positioning matters. Front-row units are your shield; back-row units are your reach. One wrong deployment can trigger a total phalanx collapse.
- **High-Fidelity Tutorials**: Built-in "Tactical Intel" system with integrated WebM video briefings for every phase (Lobby, Deployment, Combat, Cascade).
- **Quick-Start Engagement**: Jump from the lobby into a Solo Operation (AI) or Squad Operation (Matchmaking) in seconds.
- **Glicko Matchmaking**: Competitive ladder with a robust ratings system ensuring balanced tactical engagements.

---

## 💼 Professional Framing (LinkedIn / Networking)
*Focus: Vision, scalability, and project management.*

- **Hybrid Development Model**: Balancing host-native developer velocity with containerized production parity.
- **Legal Hardening**: Launched under a dual-license strategy (**AGPLv3** for code / **CC BY-NC-SA** for assets), ensuring community openness while protecting intellectual property.
- **Operational Excellence**: Achieved a stable 1.0 release through rigorous "Playability Gates" and automated verification cycles.
- **Vision**: "Phalanx Duel" isn't just a game; it's a testbed for high-concurrency distributed state management and real-time player identity protection.

---

## 📖 How-To: Sharing & Engagement

### For Reddit (r/webdev, r/gamegen, r/IndieDev)
> "I just hit v1.0 on Phalanx Duel, a tactical card game built with Vite and Postgres. I focused on making the engine 100% deterministic and observable (LGTM stack). There's even a headless QA pipeline that plays the game to verify every commit. Check out the tutorials in-game! [Link]"

### For Discord/Slack
> "⚔️ **Phalanx Duel 1.0 is Live!** Fast-paced tactical card game with a unique 'Damage Cascade' mechanic. Super easy to jump in for a 5-minute duel. Try a Solo Op against the bot: [Link]"

### For Email/Direct
> "Hey [Name], I've finally launched the 1.0 of Phalanx Duel. It’s been a deep dive into deterministic state management and high-concurrency backend architecture. I’d love your feedback on the tactical balance—especially the Cascade damage flow. You can play it here: [Link]"

---

## 🛰️ Links & Resources
- **Live Staging**: https://phalanxduel-staging.fly.dev
- **Production**: https://play.phalanxduel.com
- **Source**: [Your Repository Link]
