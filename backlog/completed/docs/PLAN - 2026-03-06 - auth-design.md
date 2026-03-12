# Auth Feature Design

## Date

2026-03-06

## Overview

Optional authentication for persistent ELO and match history. Guests play
freely; signing in tracks stats. Auth is an invitation, never a gate.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth requirement | Optional | Zero friction to play; auth adds persistence |
| UI pattern | Modal dialog | Best a11y (focus trap, Escape, `role="dialog"`) |
| Token transport (WS) | First message (`authenticate`) | No CSRF surface, cross-origin friendly, future client flexibility |
| Token storage | Memory (module variable) | XSS-resistant; refresh via HttpOnly cookie + `/api/auth/me` |
| Email verification | Deferred | Design allows adding verification status to `users` table without breaking existing accounts. No email provider dependency yet. |
| Password reset | Deferred | Auth routes use bcrypt; reset flow adds an endpoint + token table later. No schema changes needed now. |
| Rate limiting | Use existing global | Fastify rate-limit (100/min) covers auth endpoints. Per-endpoint limits can be layered on without changes. |

## Authentication Flows

### Flow 1: Register (happy path)

1. User clicks "Sign in" button in lobby header
2. Modal opens with focus trapped, `role="dialog"`, `aria-modal="true"`
3. User clicks "Don't have an account? Register" to switch to register form
4. User fills: name, email, password (min 8 chars)
5. User submits form
6. Client POSTs to `/api/auth/register` with `{ name, email, password }`
7. Server validates input (Zod), hashes password (bcrypt cost 10)
8. Server inserts user, returns `{ token, user: { id, name, email, elo } }`
9. Server sets HttpOnly refresh cookie
10. Client stores token in memory, calls `setUser(user)`
11. Modal closes, focus returns to trigger button
12. Lobby header updates: shows username + ELO, "Sign in" becomes "Sign out"
13. If WebSocket is connected, client sends `{ type: "authenticate", token }`

### Flow 2: Register with existing email

1. Steps 1-6 same as Flow 1
2. Server finds existing email, returns `409 { error: "Email already registered" }`
3. Client displays error inline in modal: "Email already registered"
4. Modal stays open, form retains entered values (email field focused)
5. User can correct email or switch to login form
6. Server logs duplicate registration attempt (email hash, timestamp) for abuse detection

### Flow 3: Register with invalid input

1. Steps 1-5 same as Flow 1
2. Client-side validation catches: empty name, invalid email format, password < 8 chars
3. Submit button stays disabled until all fields valid (progressive validation on blur)
4. If client validation is bypassed, server returns `400 { error: "Invalid input", details }`
5. Client displays first validation error inline

### Flow 4: Login (happy path)

1. User clicks "Sign in" button in lobby header
2. Modal opens (login form is default view)
3. User fills: email, password
4. User submits form
5. Client POSTs to `/api/auth/login` with `{ email, password }`
6. Server validates input, finds user by email, compares bcrypt hash
7. Server returns `{ token, user: { id, name, email, elo } }`
8. Server sets HttpOnly refresh cookie
9. Client stores token in memory, calls `setUser(user)`
10. Modal closes, focus returns to trigger button
11. Lobby header updates with username + ELO
12. If WebSocket is connected, client sends `{ type: "authenticate", token }`

### Flow 5: Login with wrong credentials

1. Steps 1-5 same as Flow 4
2. Server returns `401 { error: "Invalid credentials" }` (same message for wrong email OR wrong password)
3. Client displays error inline: "Invalid credentials"
4. Modal stays open, password field cleared and focused
5. Server logs failed login attempt (email hash, timestamp, IP) for brute-force detection

### Flow 6: Login with nonexistent email

1. Identical to Flow 5: same `401` response, same error message
2. No way for attacker to distinguish "no account" from "wrong password"

### Flow 7: Session restore on page refresh

1. Page loads, client calls `GET /api/auth/me` (HttpOnly cookie sent automatically)
2. If valid: server returns `{ id, name, email, elo }`, client calls `setUser(user)`, requests fresh token
3. If expired/missing: server returns `401`, client stays in guest mode (no error shown)
4. If restored and WebSocket connects afterward, client sends `authenticate` message

### Flow 8: WebSocket authentication

1. WebSocket connects (always succeeds: guest by default)
2. If token exists in memory, client sends `{ type: "authenticate", token }` as first message
3. Server verifies JWT, updates `PlayerConnection.userId` and `playerName`
4. Server responds `{ type: "authenticated", user: { id, name, elo } }`
5. If invalid token: server responds `{ type: "auth_error", error: "Invalid token" }`, connection stays as guest
6. If no authenticate message: player remains guest, all game functions still work

### Flow 9: Logout

1. User clicks "Sign out" in lobby header
2. Client clears token from memory, calls `setUser(null)`
3. Client POSTs to `/api/auth/logout` (clears HttpOnly cookie)
4. Lobby header reverts to "Sign in" button
5. WebSocket connection continues as guest (no disconnect)

### Flow 10: Network error during auth

1. Any auth request fails with network error
2. Client displays "Network error" inline in modal (or as toast if outside modal)
3. No state changes: user stays in previous state (guest or authenticated)
4. Modal stays open for retry

## Components

### Server

- Auth routes (existing): add HttpOnly cookie set on login/register, `/api/auth/logout` endpoint
- New WebSocket message type: `authenticate` with JWT token
- New WebSocket response types: `authenticated`, `auth_error`

### Client

- "Sign in" / "Sign out" button in lobby header
- Auth modal with focus trap, Escape to close, `role="dialog"`
- AuthPanel (existing): add client-side validation, error display
- Token stored in module-level variable in `state.ts`
- Auto-restore via `/api/auth/me` on page load

### Database

- Generate and apply Drizzle migrations for existing schema
- `users` table: id, name, email, passwordHash, elo, createdAt, updatedAt

## Testing Strategy

- Server unit tests: each flow's server-side behavior (register, duplicate, login, wrong creds, me, logout, WebSocket authenticate)
- Client unit tests: AuthPanel render, form validation, submit states, error display, modal a11y (focus trap, Escape, aria)
- Integration: WebSocket authenticate message round-trip
