# Phalanx Duel — Development Tools
# Usage: brew bundle

# --- Security & Hardening ---

# Gitleaks: Scans git history and staged changes for secrets (API keys, tokens).
# Used in pre-commit hooks to prevent accidental credential leakage.
brew "gitleaks"

# Trufflehog: High-fidelity secret scanner that searches for 
# secrets across git repositories and filesystems.
brew "trufflehog"

# --- Infrastructure & Deployment ---

# K6: Load testing tool for HTTP and WebSockets.
# Used for 'tests/load/phalanxduel-load.js' to verify performance SLOs.
brew "k6"

# Docker CLI: Required for local compose workflows and OTEL collector helpers.
# Used by 'pnpm docker:*', 'bin/maint/run-otel-collector.sh', and related scripts.
brew "docker"

# Colima: Local container runtime used for the centralized local LGTM stack.
# Required for the documented Colima-backed observability workflow in AGENTS.md.
brew "colima"

# Act: Runs GitHub Actions workflows locally for pre-CI validation.
# Used via the documented 'act' commands in AGENTS.md.
brew "act"

# Flyctl: CLI for managing Fly.io applications (deployments, secrets, logs).
# Required for 'pnpm deploy:run:*' and 'scripts/release/deploy-fly.sh'.
brew "flyctl"

# Mise: Polyglot tool manager (successor to asdf).
# Manages Node.js, PNPM, and other runtime versions via 'mise.toml'.
brew "mise"

# Dashing: Builds the Dash.app docset from the generated API and curated system docs.
# Required for 'pnpm docs:dash'.
brew "dashing"

# --- Tournament Networking, Diagnostics & Monitoring ---

# SwiftBar: macOS menu bar utility for custom monitoring scripts.
# Displays real-time tournament network health, Wi-Fi RF quality, top bandwidth,
# and connected duelist socket state directly in the macOS menu bar.
# Tip: Symlink the project's tournament monitor into your SwiftBar plugins folder:
#   ln -sf $(pwd)/bin/phx-swiftbar ~/Library/Application\ Support/SwiftBar/Plugins/
cask "swiftbar"

# Nmap: Network exploration, port scanner, and host discovery tool.
# Essential for verifying venue firewall rules, subnet topography, and player device reachability.
# Tip: Scan tournament subnet for active player devices:
#   nmap -sn 10.36.1.0/24
# Tip: Verify game ports are open from another laptop on the venue Wi-Fi:
#   nmap -p 80,443,3001,3334 <LAN_IP>
brew "nmap"

# Bandwhich: Displays live network utilization by process, connection, and remote IP.
# Terminal top for network bandwidth — immediately pinpoints processes hogging tournament pipe.
# Tip: Run live bandwidth monitor during matches:
#   sudo bandwhich --interface en0
brew "bandwhich"

# iPerf3: Active bandwidth and jitter benchmark tool.
# Pre-flight test venue Wi-Fi throughput and packet jitter before tournament play begins.
# Tip (Host): Start benchmark listener:
#   iperf3 -s
# Tip (Player device): Benchmark against host:
#   iperf3 -c <LAN_IP> -t 10
brew "iperf3"

# Websocat: Command-line WebSocket client (netcat for WebSockets).
# Tests game WebSocket handshakes (/ws), ping/pong heartbeats, and frame integrity.
# Tip: Test local WebSocket endpoint:
#   websocat ws://127.0.0.1:3001/ws
# Tip: Test LAN WebSocket over TLS:
#   websocat wss://server.lan.phalanxduel.com/ws
brew "websocat"

# Doggo: Human-friendly DNS client with color output, DoH/DoT, and routing details.
# Validates tournament DNS A-records against local gateway vs upstream resolvers.
# Tip: Query tournament apex via local resolver:
#   doggo lan.phalanxduel.com
# Tip: Query via venue gateway to detect caching/poisoning:
#   doggo server.lan.phalanxduel.com @10.36.1.1
brew "doggo"

# MTR: Combines traceroute and ping into a continuous diagnostic tool.
# Investigates upstream packet loss, hop latency, and venue WAN stability.
# Tip: Monitor hop stability to staging or cloud backends:
#   mtr --curses phalanxduel-staging.fly.dev
brew "mtr"

# Arp-scan: Layer 2 ARP scanner that discovers all active IPv4 devices on the ethernet/Wi-Fi subnet.
# Discovers connected player devices even when their host firewalls drop ICMP ping.
# Tip: Detect all connected tournament devices:
#   sudo arp-scan --localnet --interface=en0
brew "arp-scan"

# Socat: Multipurpose bidirectional relay (SOcket CAT).
# Used for quick port-forwarding, tunnel inspection, or bridging loopback-only services to LAN.
# Tip: Bridge 127.0.0.1:5173 to LAN 0.0.0.0:5173 without restarting Vite:
#   socat TCP-LISTEN:5173,fork,bind=0.0.0.0,reuseaddr TCP:127.0.0.1:5173
brew "socat"

# Nginx: High-performance HTTP server, reverse proxy, and TLS termination engine.
# Terminates local HTTPS (port 443) and routes traffic to Vite, Fastify, and Cockpit with local certificates.
# Tip: Start local reverse proxy:
#   brew services start nginx
# Tip: Test reverse proxy config:
#   nginx -t
brew "nginx"

