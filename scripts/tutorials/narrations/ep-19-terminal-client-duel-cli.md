---
episode_id: ep-19-terminal-client-duel-cli
title: "Cross-Platform Play: Browser Duel from the Go CLI"
format: "16:9"
companion_url: "https://phalanxduel.com/build-with-phalanx/"
privacy: private
pronunciation:
  Phalanx: FAY-lanks
  CLI: C L I
  LP: life points
  MCTS: M C T S
---

<!-- cue:cli-intro -->
Install the Go client with Homebrew or go install, then launch duel-cli. You can create a match, challenge Random, Heuristic, or MCTS bots, or jump straight into a table with dash name and dash join flags.

<!-- cue:cli-join -->
Enter the invite code created by the browser player. The Go client speaks the exact same authoritative WebSocket protocol, rendering live turn state, suit glyphs, and both battlefields in your terminal.

<!-- cue:cross-client -->
Pick a numbered deployment action in the terminal. The server validates the move and streams it straight to the browser player in real time — true cross-platform play across Web, Go CLI, and native clients.
