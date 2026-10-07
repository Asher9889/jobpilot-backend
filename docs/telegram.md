# Telegram Module

MTProto client module for linking a user's Telegram account to JobPilot via QR-code authentication. It uses the [`teleproto`](https://www.npmjs.com/package/teleproto) library (MTProto client, alternative to gramjs) — it is **not** a bot: there are no bot tokens, webhooks, or command handlers.

## Table of Contents

- [Directory structure](#directory-structure)
- [Configuration](#configuration)
- [Initialization & wiring](#initialization--wiring)
- [HTTP API](#http-api)
  - [GET /api/v1/telegram/auth/qr](#get-apiv1telegramauthqr)
- [Architecture](#architecture)
  - [TelegramClientService](#telegramclientservice)
  - [TelegramService](#telegramservice)
  - [TelegramController](#telegramcontroller)
  - [Telegram module (composition root)](#telegram-module-composition-root)
- [CLI login tool](#cli-login-tool)
- [Session storage](#session-storage)
- [QR login flow](#qr-login-flow)
- [Known limitations](#known-limitations)

## Directory structure

```
src/modules/telegram/
├── index.ts                    # Re-exports telegramRoutes
├── telegram.module.ts          # Composition root — creates & wires singletons
├── telegram.routes.ts          # Express route definitions
├── telegram.controller.ts      # HTTP handlers (SSE)
├── telegram.service.ts         # Business logic (QR auth, auth stubs)
├── telegram-client.service.ts  # Low-level teleproto client wrapper
└── login.ts                    # Standalone interactive CLI login tool
```

Supporting files:

| File | Purpose |
|---|---|
| `src/config/envConfig.ts` | Reads `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` from env |
| `src/routes/v1/index.ts` | Mounts routes at `/telegram` |
| `src/routes/index.ts` | Mounts v1 routes at `/v1` |
| `src/server.ts` | Mounts API routes at `/api` |
| `telegram-session/` | Persisted MTProto session (created at runtime) |
| `agent-session/` | Session store used only by `login.ts` CLI |

## Configuration

Environment variables (loaded from `.env` via `tsx --env-file=.env`):

| Variable | Type | Required | Description |
|---|---|---|---|
| `TELEGRAM_API_ID` | integer | yes | Telegram API ID from <https://my.telegram.org> |
| `TELEGRAM_API_HASH` | string | yes | Telegram API hash from <https://my.telegram.org> |
| `PORT` | integer | yes | Server port (used by `server.ts`) |

Defined in `src/config/envConfig.ts`:

```ts
const envConfig = {
  port: process.env.PORT,
  telegram: {
    apiId: Number(process.env.TELEGRAM_API_ID)!,
    apiHash: process.env.TELEGRAM_API_HASH!,
  },
};
```

> **Note:** No validation is performed — missing values become `NaN`/`undefined` at runtime.

## Initialization & wiring

The module creates singletons **at import time** (side effect):

1. `telegram.module.ts` constructs `TelegramClientService` and immediately calls `connect()` — the MTProto connection is established when the app starts.
2. `TelegramService` and `TelegramController` are constructed from that client.
3. `telegram.routes.ts` imports `telegramController` from the module, so importing the routes pulls in the module.

Route mounting chain:

```
server.ts        app.use("/api", apiRoutes)
  └─ routes/index.ts     router.use("/v1", v1Routes)
       └─ routes/v1/index.ts   router.use("/telegram", telegramRoutes)
            └─ modules/telegram/telegram.routes.ts   router.get("/auth/qr", ...)
```

Full endpoint base path: **`/api/v1/telegram`**

## HTTP API

### GET /api/v1/telegram/auth/qr

Starts a QR-code authentication flow and streams progress via **Server-Sent Events** until the user scans the QR code (or the connection closes / the code expires).

- **Method:** `GET`
- **Path:** `/api/v1/telegram/auth/qr`
- **Auth:** none (no middleware applied)
- **Request body / query params:** none

**Response headers:**

```
Content-Type: text/event-stream
Cache-Control: no-cache, no-transform
Connection: keep-alive
```

**SSE events:**

| Event | Data | Description |
|---|---|---|
| `qr` | `{ url: string, expires: number }` | QR token generated. `url` is `tg://login?token=<base64url>`; `expires` is the token lifetime (seconds) from Telegram. Emitted again if the token is refreshed before scan. |
| `done` | `{ id: number, user: string }` | Authentication succeeded. `id` is the Telegram user id; `user` is the Telethon/teleproto API class name (e.g. `User`). |
| `error` | `{ message: string }` | Authentication failed (e.g. QR expired, network error). Stream ends after this event. |

**Example stream:**

```
event: qr
data: {"url":"tg://login?token=AbCdEf...","expires":30}

event: qr
data: {"url":"tg://login?token=XyZ123...","expires":30}

event: done
data: {"id":123456789,"user":"User"}
```

**Behavior:**

- An `AbortController` is created per request; it aborts the underlying MTProto sign-in when the client disconnects (`req.on("close")`).
- The stream is closed (`res.end()`) after `done` or `error`.
- Implementation: `telegram.controller.ts` → `TelegramService.startQrAuth()` → `telegramClient.signInUserWithQrCode()`.

## Architecture

### TelegramClientService

`telegram-client.service.ts` — thin wrapper around the `teleproto` `TelegramClient`.

```ts
new TelegramClientService(apiId, apiHash)
```

| Member | Description |
|---|---|
| `initClient()` (private) | Creates `new TelegramClient(new StoreSession("telegram-session"), apiId, apiHash, { connectionRetries: 5 })` |
| `getClient()` | Returns the underlying `TelegramClient` (throws if not initialized) |
| `connect()` | `client.connect()` — establishes the MTProto connection |
| `getMe()` | `client.getMe()` — returns the authenticated `Api.User` |

### TelegramService

`telegram.service.ts` — business logic for authentication flows.

| Method | Status | Description |
|---|---|---|
| `startQrAuth(onQrCode, signal)` | ✅ implemented | Calls `telegramClient.signInUserWithQrCode({ apiId, apiHash }, { qrCode, onError, abortSignal })`. The `qrCode` callback builds `tg://login?token=<base64url>` from the token and invokes `onQrCode(url, expires)`. Returns the authenticated user. |
| `startAuth(userId, phone)` | 🚧 stub | Phone/OTP flow — not implemented. |
| `verifyCode(userId, code)` | 🚧 stub | OTP verification — not implemented. |
| `verifyPassword(userId, password)` | 🚧 stub | 2FA password verification — not implemented. |
| `isAuthenticated(userId)` | 🚧 stub | Session check — not implemented. |
| `getCurrentUser(userId)` | 🚧 stub | — |
| `getSession(userId)` | 🚧 stub | — |
| `logout(userId)` | 🚧 stub | — |

### TelegramController

`telegram.controller.ts` — HTTP layer.

| Handler | Route | Description |
|---|---|---|
| `startQrAuth(req, res)` | `GET /auth/qr` | Sets SSE headers, wires `AbortController` to request close, streams `qr` / `done` / `error` events, ends response. |

### Telegram module (composition root)

`telegram.module.ts`:

```ts
const { apiId, apiHash } = envConfig.telegram;
const telegramClient = new TelegramClientService(apiId, apiHash);
telegramClient.connect(); // connects on import
const telegramService = new TelegramService(telegramClient.getClient(), apiId, apiHash);
const telegramController = new TelegramController(telegramService);

export { telegramClient, telegramController };
```

Exports: `telegramClient`, `telegramController` (routes import the controller from here).

## CLI login tool

`src/modules/telegram/login.ts` — standalone interactive script (not part of the HTTP API).

```bash
npx tsx src/modules/telegram/login.ts
```

Prompts for:

1. Phone number
2. 2FA password (if enabled)
3. Login code

Then prints the authenticated user and the saved session string. Uses a **separate** session store (`agent-session/`) from the HTTP module (`telegram-session/`).

## Session storage

| Store | Used by | Location |
|---|---|---|
| `telegram-session` | HTTP module (`TelegramClientService`) | `./telegram-session/` |
| `agent-session` | CLI tool (`login.ts`) | `./agent-session/` |

`StoreSession` persists MTProto auth keys to disk (files such as `telegram-session:authKey`, `telegram-session:dcAuthKeys`, `telegram-session:serverAddress`, etc.), so the client does not need to re-authenticate on restart.

> ⚠️ These are **user sessions** (MTProto auth keys), not bot tokens. Treat the session directory as a secret.

## QR login flow

```
                    YOUR APPLICATION
                         │
                   User clicks
                 "Connect Telegram"
                         │
                         ▼
                 Express Backend
                         │
                         │ auth.exportLoginToken
                         ▼
                  Telegram MTProto
                         │
                         │ loginToken
                         ▼
               tg://login?token=...
                         │
                         ▼
                  Generate QR
                         │
                         ▼
                  React Frontend
                         │
                         │ QR displayed
                         ▼
              ┌─────────────────────┐
              │ Telegram Mobile App │
              │                     │
              │ Scan QR             │
              │ Confirm Login       │
              └──────────┬──────────┘
                         │
                         │ auth.acceptLoginToken
                         ▼
                  Telegram servers
                         │
                         │ updateLoginToken
                         ▼
                 Your MTProto client
                         │
                         │ auth.exportLoginToken
                         ▼
              auth.loginTokenSuccess
                         │
                         ▼
                Telegram Session
                         │
                         ▼
                 Save session for
                 your application user
```

Internally the `qr` SSE event is emitted each time the `qrCode` callback fires (initial token + refreshes) until the user confirms the login or the signal aborts.

## Known limitations

- Only the QR auth flow is implemented; phone/OTP, 2FA, logout, and session introspection are stubs.
- The endpoint has no authentication/authorization — anyone who can reach it can start a login flow.
- The module connects to Telegram eagerly at import time (no lazy/delayed connection or graceful shutdown handling).
- `envConfig` does not validate the Telegram credentials.
- Only one global session store exists (`telegram-session/`) — multi-user sessions are not yet supported despite `userId`-based stub methods.
