---
title: "Tournament Operations Runbook & Playbook"
description: "Step-by-step operational handbook for hosting, operating, monitoring, and debugging local Phalanx Duel tournaments and demonstration events."
status: active
updated: "2026-09-07"
audience: operator, agent
related:
  - AGENTS.md
  - docs/development.md
  - docs/ops/slo.md
---

# ⚔️ Phalanx Duel — Tournament Operations Runbook & Playbook

This runbook is the canonical, step-by-step operational manual for hosting local or regional Phalanx Duel tournaments and live demonstrations. It covers pre-flight network configuration, service startup, pre-game diagnostic checks, dual-screen command center monitoring, player onboarding, troubleshooting, and post-tournament teardown.

## Observability surface check

Run `bin/phx-observability-check` to list browser-facing and loopback
observability endpoints with their access class and live HTTP status.
`LOCAL_ONLY` for the private collector, OpenObserve, or Jaeger listener is
expected; those ports must remain loopback-bound. In `LAN` mode, the
reverse-proxy rows are the participant-facing checks.

---

## 1. Quick Reference Commands

### Observability mode

Enable the protected LAN observability proxy before a venue demo:

```bash
observability-mode lan
nginx-regen-certs
nginx-ctl validate
nginx-ctl reload
observability-mode status
bin/phx-demo-ctl up
```

When status reports `LAN`, `phx-demo-ctl` and SwiftBar use
`observability.lan.phalanxduel.com` for operator links. Return to
`observability-mode local` after the event. Game telemetry remains on
`/otel/` and `/rum/` at the play host; raw telemetry ports stay private.

All tournament operational scripts live under the canonical `phx-*` namespace in `bin/`:

| Command | Purpose |
|---|---|
| `bin/phx-tournament-check` | **Diagnostic Pre-Flight**: Audits host LAN IP, DNS resolution, service listeners, macOS firewall, and prints test recipes. |
| `bin/phx-tournament-ports` | **Accessibility Matrix**: Probes domains, ports, LAN binding (0.0.0.0 vs 127.0.0.1), and reachability context. |
| `bin/phx-tournament-top` | **Network & Sockets Top**: Live curses monitor for Wi-Fi RF quality, bandwidth rates, gateway RTT, and connected duelists. |
| `bin/phx-top` | **Game Runtime Top**: Live curses monitor for server health, active duels, lobby waitlist, ladder rankings, and combat stream. |
| `bin/phx-swiftbar` | **macOS Menu Bar**: Real-time ambient status pulse in the system menu bar (`~/.swiftbar/phalanxduel-pulse.30s.sh`). |
| `bin/phx-demo-ctl up` | **Start All Services**: Boots Fastify, Vite client, Cockpit, and sets up local runtime environments. |
| `bin/phx-demo-ctl down` | **Stop All Services**: Gracefully terminates all background demo and tournament processes. |
| `bin/phx-gource` | **Multi-Repo Visualization**: Launches interactive or MP4 video history across all `phalanxduel` repositories. |

---

## 2. Tournament Architecture Topology

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        VENUE LOCAL NETWORK (Wi-Fi / LAN)               │
│                                                                        │
│   [ Player Phone / Tablet ]         [ Player Laptop / Client ]         │
│               │                                   │                    │
│   DNS Query: *.lan.phalanxduel.com -> Host LAN IP (e.g. <HOST_LAN_IP>)   │
│               │                                   │                    │
│               ▼                                   ▼                    │
│   HTTPS Port 443 (TLS)                HTTP Port 80 (Redirect/Direct)   │
└───────────────┼───────────────────────────────────┼────────────────────┘
                │                                   │
┌───────────────▼───────────────────────────────────▼────────────────────┐
│                    HOST MACHINE (Tournament Director)                  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Nginx Reverse Proxy (Ports 80 & 443 with wildcard TLS cert)      │  │
│  └───────┬────────────────────────┬───────────────────────┬─────────┘  │
│          │ /play                  │ /api, /ws             │ /admin     │
│          ▼                        ▼                       ▼            │
│  ┌───────────────┐        ┌───────────────┐       ┌─────────────────┐  │
│  │  Vite Client  │        │Fastify Server │       │  Admin Cockpit  │  │
│  │  Port 5173    │        │  Port 3001    │       │  Port 5174/3333 │  │
│  └───────────────┘        └───────┬───────┘       └─────────────────┘  │
│                                   │                                    │
│                                   ▼                                    │
│                           ┌───────────────┐                            │
│                           │PostgreSQL DB  │                            │
│                           │  Port 5432    │                            │
│                           └───────────────┘                            │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Terminal Command Center:                                         │  │
│  │  • Window 1: bin/phx-tournament-top (Wi-Fi RF, Sockets, Bandwidth)│  │
│  │  • Window 2: bin/phx-top (Server Health, Match Activity, Combat) │  │
│  │  • Menu Bar: SwiftBar Phalanx Duel Pulse                         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Pre-Flight Preparation (Before Arriving at Venue)

### Step 3.1: Verify Tooling Dependencies

Ensure all tournament and diagnostic tools are installed via Homebrew:

```bash
brew bundle
```

Key tools configured in `Brewfile`:
- `swiftbar`: Menu bar ambient monitor.
- `nmap`: Host discovery and remote port validation.
- `bandwhich`: Live process network top.
- `iperf3`: Wi-Fi throughput and jitter benchmarking.
- `websocat`: WebSocket handshake testing CLI.
- `doggo`: Modern DNS resolution inspection.
- `nginx`: Local TLS termination and reverse proxy.
- `gource`: Tournament presentation history visualization.

---

## 4. Venue Network & DNS Setup (At the Venue)

### Step 4.1: Connect to Venue Network and Determine LAN IP

Connect your host Mac to the venue Wi-Fi or wired Ethernet, then inspect your network interface:

```bash
bin/phx-tournament-check
```

Look at the top section:
```text
Active LAN IP:   <HOST_LAN_IP> (en0) [Gateway: 10.36.1.1]
```

### Step 4.2: Test for Venue Wi-Fi Client Isolation (CRITICAL)

Many hotel, conference, or coffee shop guest networks enable **AP Client Isolation**, which blocks devices on Wi-Fi from talking to each other.

To detect if client isolation is active:
1. Ping your local gateway:
   ```bash
   ping -c 2 10.36.1.1
   ```
2. Have a co-organizer or player connect to the same Wi-Fi on their phone and try opening your LAN IP:
   ```bash
   curl -sI http://<HOST_LAN_IP>:3001/health
   ```
3. **If connection times out or fails**: Client Isolation is active on the venue router.
   - **Remedy A**: Use a portable travel router (e.g. GL.iNet) connected to the venue uplink.
   - **Remedy B**: Turn on iPhone / Android Personal Hotspot and connect both the host Mac and player devices to your hotspot.
   - **Remedy C**: Connect devices to an unmanaged 5-port gigabit Ethernet switch.

### Step 4.3: Configure DNS A-Records

Update your DNS provider (e.g., Cloudflare, DNSimple, Route53, or local dnsmasq/AdGuard) to point to your current venue LAN IP with a **60-second TTL**:

| Host / Subdomain | Type | Value (Target IP) | TTL | Purpose |
|---|---|---|---|---|
| `lan.phalanxduel.com` | `A` | `<HOST_LAN_IP>` | 60 | Apex access |
| `*.lan.phalanxduel.com` | `A` | `<HOST_LAN_IP>` | 60 | Wildcard for client/server/admin |

*Tip:* You can copy the exact BIND record from `bin/phx-tournament-check`:
```bash
bin/phx-tournament-check
```

Validate resolution from another device or terminal:
```bash
doggo server.lan.phalanxduel.com @10.36.1.1
```

---

## 5. Starting the Tournament Stack

### Step 5.1: Boot the Core Game Services

Launch all host-native game processes in development/tournament mode:

```bash
bin/phx-demo-ctl up
```

Alternatively, start services individually if debugging:
```bash
pnpm dev:server               # Starts Fastify on :3001
pnpm dev:client               # Starts Vite on :5173
pnpm dev:admin                # Starts Admin UI on :5174
brew services start nginx     # Starts local Nginx reverse proxy on :80 and :443
```

### Step 5.2: Verify Ingress Binding

Verify that services intended for tournament players are listening on `0.0.0.0` or `<HOST_LAN_IP>`, NOT loopback `127.0.0.1`:

```bash
bin/phx-tournament-ports
```

Expected Accessibility Matrix:
- `Game Client (TLS)` `:443` -> `* (LAN Exposed)` | `● ACCESSIBLE (LAN)`
- `Game Server (Direct)` `:3001` -> `* (LAN Exposed)` | `● ACCESSIBLE (LAN)`
- `Vite Dev Server` `:5173` -> Upstream for Nginx or bound with `--host 0.0.0.0`.

---

## 6. Pre-Game Diagnostic Checklist (Pass / Fail Gates)

Before opening player registration, run the complete diagnostic sweep:

1. **Firewall Gate**:
   ```bash
   /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate --getblockall
   ```
   - Must show `State = 1` or `State = 0`.
   - `Block all incoming connections` must be **OFF**.
   - Node.js and Nginx must be **ALLOWED**.

2. **Loopback Gate**:
   ```bash
   curl -sI http://127.0.0.1:3001/health | head -n 1
   # Expect: HTTP/1.1 200 OK
   ```

3. **LAN Ingress Gate**:
   ```bash
   curl -sI http://<HOST_LAN_IP>:3001/health | head -n 1
   # Expect: HTTP/1.1 200 OK
   ```

4. **DNS Resolution Gate**:
   ```bash
   curl -sI https://play.lan.phalanxduel.com/ | head -n 1
   # Expect: HTTP/1.1 200 OK
   ```

5. **WebSocket Gate**:
   ```bash
   websocat -t ws://127.0.0.1:3001/ws
   # Type a test frame; should establish connection without ECONNREFUSED
   ```

---

## 7. Command Center: Dual-Screen Live Monitoring

During the tournament, keep two terminal windows open side-by-side:

### Terminal 1: Network & Infrastructure (`phx-tournament-top`)
```bash
bin/phx-tournament-top
```
- **Focus**: Wi-Fi RF RSSI / Noise, Uplink/Downlink bandwidth spikes, latency to default gateway and cloud, and active player TCP socket connections.
- **Hotkeys**:
  - `[r]`: Force immediate probe refresh.
  - `[q]`: Quit.

### Terminal 2: Game Runtime & Combat Analytics (`phx-top`)
```bash
bin/phx-top
```
- **Focus**: Fastify heap memory, active match count, lobby matchmaking queue, ranked ladder standings, and live combat action stream (`DEPLOY`, `ATTACK`, `PASS`, combat resolution tags).
- **Hotkeys**:
  - `[m]`: Cycle environment (`local` <-> `staging` <-> `production`).
  - `[r]`: Force immediate refresh.
  - `[c]`: Clear transaction event log.
  - `[q]`: Quit.

### Menu Bar: SwiftBar Integration
Ensure `~/.swiftbar/phalanxduel-pulse.30s.sh` is active.
- Green: All services healthy and DNS matches LAN IP.
- Blue (`⚔️ N Duelists Live`): Remote tournament duelists are actively playing.
- Yellow (`⚠️ DNS Mismatch`): The host changed Wi-Fi networks and DNS A-records must be updated.
- Red: Critical game service down.

---

## 8. Player Onboarding Flow

1. **Player Connection**:
   - Instruct players to join the tournament Wi-Fi network.
   - Instruct players to navigate in Safari or Chrome to:
     ```text
     https://play.lan.phalanxduel.com
     ```
     *(Or fallback direct URL: `http://<HOST_LAN_IP>:5173` if TLS reverse proxy is bypassed).*

2. **Self-Signed TLS Certificate Prompt**:
   - If using local tournament TLS, tell players to tap **Advanced** -> **Proceed to play.lan.phalanxduel.com (unsafe)** once on first connection.

3. **Lobby & Match Creation**:
   - Players create a match in the lobby or enter an invite code.
   - Tournament directors can view open lobby seats in `bin/phx-top` under Section `[3] MATCHMAKING LOBBY WAITLIST`.

4. **Spectator Mode**:
   - Project the spectator battle HUD onto venue monitors / projector:
     ```text
     https://play.lan.phalanxduel.com/?spectate=true
     ```

---

## 9. Troubleshooting & Incident Response

### Issue 1: "Players can connect to Wi-Fi but cannot open the game URL"
- **Cause**: Venue Wi-Fi Access Point Client Isolation is blocking peer-to-peer traffic.
- **Diagnosis**: Run `ping -c 2 <PLAYER_PHONE_IP>`. If 100% packet loss occurs, isolation is active.
- **Fix**: Switch the tournament to a mobile hotspot or hardware travel router.

### Issue 2: Live Probe says `REFUSED (Local)` in `phx-tournament-ports`
- **Cause**: The service was started without `--host 0.0.0.0` and is bound strictly to `127.0.0.1`.
- **Fix**: Restart the service specifying the host bind:
  ```bash
  pnpm dev:client --host 0.0.0.0
  ```

### Issue 3: Live Probe says `FW DROP (Host)`
- **Cause**: macOS Application Firewall is dropping incoming connections to the Node.js or Nginx binary.
- **Fix**: Allow the binaries in the firewall:
  ```bash
  sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add $(which node) --unblockapp $(which node)
  sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add $(which nginx) --unblockapp $(which nginx)
  ```
  Or temporarily set bypass mode for the tournament:
  ```bash
  sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off
  ```

### Issue 4: "DNS Mismatch / UNRESOLVED"
- **Cause**: Stale DNS cache on the client device or forgot to update A-records after switching networks.
- **Fix**:
  - Update A-record to the new LAN IP.
  - Flush macOS DNS cache:
    ```bash
    sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
    ```
  - Mobile devices: Toggle **Airplane Mode** ON for 5 seconds, then back OFF to force DNS resolver reload.

---

## 10. Post-Tournament Teardown & Archival

1. **Stop Tournament Services**:
   ```bash
   bin/phx-demo-ctl down
   ```
2. **Reclaim Storage & Clean Up Artifacts**:
   ```bash
   pnpm maint:clean-disk
   ```
3. **Generate Tournament Historical Visuals**:
   ```bash
   bin/phx-gource --export output/tournament-history.mp4
   ```
4. **Restore macOS Firewall to Global Protection** (if bypassed):
   ```bash
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on
   ```
