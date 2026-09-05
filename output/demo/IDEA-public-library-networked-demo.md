# Idea: public-library networked demo

Status: idea only — not part of the default rehearsal path.

## Goal

Let people on a public-library Wi-Fi network play against the local demo
without requiring inbound router access, local DNS, or a shared LAN certificate.

## Proposed public surface

Use one public hostname:

```text
https://play-demo.phalanxduel.com/
```

Keep the admin UI and cockpit private. Players only need the browser client.

## Proposed topology

```text
Player browsers
    │
    │ https://play-demo.phalanxduel.com
    ▼
Cloudflare Tunnel
    │ outbound connection from the demo Mac
    ▼
127.0.0.1:5173 (Vite client)
    │ /api and /ws proxy
    ▼
127.0.0.1:3001 (game server)
```

Cloudflare Tunnel is a good fit for this setting because the demo machine
opens the outbound tunnel; the library router does not need port forwarding.
The public hostname can be a custom domain and WebSockets are supported.

## Tailscale alternative

Tailscale is useful when every player can install and authenticate the client:
use MagicDNS/Serve and a `*.ts.net` hostname. The Personal plan currently
allows six free users in one tailnet. This is less convenient for a public
demo because guests must join the tailnet.

Tailscale Funnel can serve players without Tailscale, but it uses a Tailscale
`*.ts.net` hostname rather than `phalanxduel.com`, so it is better as a
technical fallback than the polished demo URL.

## Repo work needed before enabling it

- Add `play-demo.phalanxduel.com` to Vite `allowedHosts`.
- Add `https://play-demo.phalanxduel.com` to the server WebSocket origin policy.
- Configure the tunnel to forward to `http://127.0.0.1:5173`.
- Add a demo command/mode that prints the public URL and tunnel health.
- Keep admin and cockpit on localhost or Tailscale-only access.
- Prepare a phone-hotspot and recorded-video fallback for captive portals,
  filtering, or unstable library Wi-Fi.

## Rehearsal safety

This should be treated as a temporary demo exposure. Use a dedicated demo
hostname, avoid exposing operator surfaces, and stop the tunnel after the
event. Do not use the production hostname or production credentials.
