---
episode_id: ep-18-hosting-a-local-tournament
title: "Hosting & Directing a Local Tournament (Admin Portal & Runbook)"
format: "16:9"
companion_url: "https://phalanxduel.com/build-with-phalanx/"
privacy: private
pronunciation:
  Phalanx: FAY-lanks
  LP: life points
  MCTS: M C T S
---

<!-- cue:preflight-ports -->
Hosting a local Phalanx Duel tournament? Start with pnpm tournament:ports to verify your LAN IP, DNS records, and macOS firewall rules in one glance.

<!-- cue:start-services -->
Run bin/phx up to start the game server, web client, and dedicated Admin Portal. Confirm every endpoint flips to ACCESSIBLE on LAN.

<!-- cue:admin-console -->
Open the Admin Portal to monitor active matches, verify cryptographic integrity badges, assist players, or cleanly terminate stalled tables.
