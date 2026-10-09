# Telegram Module

MTProto client module for linking a user's Telegram account to JobPilot via QR-code authentication. It uses the [`teleproto`](https://www.npmjs.com/package/teleproto) library (MTProto client, alternative to gramjs) — it is **not** a bot: there are no bot tokens, webhooks, or command handlers.

## Table of Contents

- [Directory structure](#directory-structure)
- [Configuration](#configuration)
- [Initialization & wiring](#initialization--wiring)
- [HTTP API](#http-api)
  - [GET /api/v1/telegram/auth/qr](#get-apiv1telegramauthqr)
  - [GET /api/v1/telegram/sources/available](#get-apiv1telegramsourcesavailable)
  - [DELETE /api/v1/telegram](#delete-apiv1telegram)
- [Architecture](#architecture)
  - [TelegramClientService](#telegramclientservice)
  - [TelegramService](#telegramservice)
  - [TelegramController](#telegramcontroller)
  - [Telegram module (composition root)](#telegram-module-composition-root)
- [Data model](#data-model)
- [Session storage](#session-storage)
- [QR login flow](#qr-login-flow)
- [Known limitations](#known-limitations)

## Directory structure

```
src/modules/telegram/
├── index.ts                    # Re-exports telegramRoutes
├── telegram.module.ts          # Composition root — creates & wires singletons
├── telegram.routes.ts          # Express route definitions
├── telegram.controller.ts      # HTTP handlers (SSE + JSON)
├── telegram.service.ts         # Business logic (QR auth, dialog listing)
├── telegram-client.service.ts  # Low-level teleproto client wrapper
├── telegram.model.ts           # Mongoose schema for `telegram_accounts`
├── telegram.constants.ts       # TELEGRAM_ACCOUNT_STATUS enum
└── telegram.types.ts           # TTelegramAccountStatus
```

Supporting files:

| File | Purpose |
|---|---|
| `src/config/envConfig.ts` | Reads `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` / `TELEGRAM_SESSION_ENCRYPTION_KEY` from env |
| `src/utils/crypto.ts` | AES-256-GCM `encrypt()` / `decrypt()` for session strings |
| `src/modules/user/user.model.ts` | `User.telegram` ObjectId ref → `TelegramAccount` |
| `src/routes/v1/index.ts` | Mounts routes at `/telegram` |
| `src/routes/index.ts` | Mounts v1 routes at `/v1` |
| `src/server.ts` | Mounts API routes at `/api` |

## Configuration

Environment variables (loaded from `.env` via `tsx --env-file=.env`):

| Variable | Type | Required | Description |
|---|---|---|---|
| `TELEGRAM_API_ID` | integer | yes | Telegram API ID from <https://my.telegram.org> |
| `TELEGRAM_API_HASH` | string | yes | Telegram API hash from <https://my.telegram.org> |
| `TELEGRAM_SESSION_ENCRYPTION_KEY` | base64, 32 bytes | yes | AES-256-GCM key used to encrypt stored session strings |
| `PORT` | integer | yes | Server port (used by `server.ts`) |

Defined in `src/config/envConfig.ts`:

```ts
const envConfig = {
  port: Number(process.env.PORT),
  telegram: {
    apiId: Number(process.env.TELEGRAM_API_ID)!,
    apiHash: process.env.TELEGRAM_API_HASH!,
    sessionEncryptionKey: process.env.TELEGRAM_SESSION_ENCRYPTION_KEY!,
  },
};
```

> **Note:** `src/utils/crypto.ts` reads `TELEGRAM_SESSION_ENCRYPTION_KEY` directly from `process.env` and throws `TELEGRAM_SESSION_ENCRYPTION_KEY must be 32 bytes` at import time if the decoded key is the wrong length. Generate one with `openssl rand -base64 32`.

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
            └─ modules/telegram/telegram.routes.ts
                 ├─ router.get("/auth/qr",         authenticate, ...)
                 └─ router.get("/sources/available", authenticate, ...)
```

Full endpoint base path: **`/api/v1/telegram`**

## HTTP API

Both endpoints require the `authenticate` middleware: a valid `accessToken` cookie must be present, and the user's account status must be `ACTIVE`. `req.validatedUser` is populated with the user document.

### GET /api/v1/telegram/auth/qr

Starts a QR-code authentication flow and streams progress via **Server-Sent Events** until the user scans the QR code (or the connection closes / the code expires).

- **Method:** `GET`
- **Path:** `/api/v1/telegram/auth/qr`
- **Auth:** required (`authenticate`)
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
| `done` | `{ id: string, user: ProfileSummary }` | Authentication succeeded. `id` is the Telegram user id (string). `user` is the profile summary object — see shape below. |
| `error` | `{ message: string }` | Authentication failed (e.g. QR expired, network error). Stream ends after this event. |

`ProfileSummary` shape (from `TelegramService.getProfileSummary`):

```ts
{
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  username: string | null;
  phone: string | null;
  photo: {
    photoId: string;
    dcId: number;
    hasVideo: boolean;
    thumbBase64: string | null;   // data:image/jpeg;base64,...
    avatarBase64: string | null;  // data:image/jpeg;base64,...
  } | null;
  isPremium: boolean;
  isVerified: boolean;
  isSelf: boolean;
}
```

**Example stream:**

```
event: qr
data: {"url":"tg://login?token=AbCdEf...","expires":30}

event: qr
data: {"url":"tg://login?token=XyZ123...","expires":30}

event: done
data: {"id":"123456789","user":{"id":"123456789","firstName":"Ada", ...}}
```

**Behavior:**

- An `AbortController` is created per request; it aborts the underlying MTProto sign-in when the client disconnects (`req.on("close")`).
- The stream is closed (`res.end()`) after `done` or `error`.
- On success the service persists the account (see [Data model](#data-model)) and sets `User.telegram`.
- On failure it upserts a `TelegramAccount` row with `status: "ERROR"` and `lastError` set, then rethrows.
- Implementation: `telegram.controller.ts` → `TelegramService.startQrAuth()` → `telegramClient.signInUserWithQrCode()`.

### GET /api/v1/telegram/sources/available

Returns the connected account's **groups and channels** (dialogs), serialized to plain JSON.

- **Method:** `GET`
- **Path:** `/api/v1/telegram/sources/available`
- **Auth:** required (`authenticate`)
- **Request body / query params:** none

**Success response:**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Available sources fetched successfully",
  "data": [
    {
      "id": "-1001234567890",
      "name": "Job Postings",
      "title": "Job Postings",
      "isUser": false,
      "isGroup": false,
      "isChannel": true,
      "isCommunity": false,
      "pinned": false,
      "archived": false,
      "folderId": null,
      "unreadCount": 4,
      "unreadMentionsCount": 0,
      "lastMessageText": "Hiring: Backend Engineer",
      "lastMessageDate": 1728000000,
      "isMonitored": true
    }
  ]
}
```

**Field reference:**

| Field | Type | Notes |
|---|---|---|
| `id` | string \| null | Telegram chat ID, e.g. `"-1001234567890"` — this is what you send as `externalSourceId` |
| `name` | string \| null | Dialog display name |
| `title` | string \| null | Channel/group title (mirrors `name` for channels) |
| `isUser` | boolean | Always `false` here — DMs are filtered out |
| `isGroup` | boolean | See the filter semantics table below |
| `isChannel` | boolean | See the filter semantics table below |
| `isCommunity` | boolean | Always `false` — communities are excluded by default |
| `pinned` | boolean | Dialog is pinned |
| `archived` | boolean | Dialog is archived |
| `folderId` | number \| null | Telegram folder ID, `null` if unfiled |
| `unreadCount` | number | Unread message count |
| `unreadMentionsCount` | number | Unread mention count |
| `lastMessageText` | string \| null | Text of the most recent message, `null` if none/unsupported |
| `lastMessageDate` | number \| null | Unix timestamp (seconds) of the most recent message |
| `isMonitored` | boolean | **`true` if you have already added this chat as a job source** — see below |

#### `isMonitored`

```json
"isMonitored": true
```

`true` when a `job_sources` row exists for this user whose `externalSourceId` equals the dialog's `id`. Use it to render **"Added"** instead of an "Add" button, and to pre-tick already-selected chats.

Matched by string equality on the chat ID only. It deliberately ignores:

- **`status`** — a `PAUSED` or `UNAVAILABLE` source still reports `true` (it exists; it just isn't active). Cross-check with `GET /api/v1/job-sources` if you need the status.
- **`provider`** — any provider's row counts, not just `TELEGRAM`.

> ⚠️ It also ignores **`deletedAt`**, so a *soft-deleted* source would still report `true`. Harmless today because no delete endpoint exists yet, but this must be fixed alongside one — see [Known limitations](#known-limitations).

**Errors:**

| Status | Cause |
|---|---|
| `401` | Missing/expired `accessToken` cookie, inactive account |
| `404` | No `TelegramAccount` linked to this user (`"Telegram account not connected"`) |
| `500` | MTProto failure (network, revoked session, `AuthKeyUnregisteredError`, …) |

**Behavior:**

1. Loads the user's `TelegramAccount`; 404 if absent.
2. Decrypts the stored session string and builds a **fresh** `TelegramClient` from it (not the module-level client).
3. Connects and fetches `getDialogs({})`.
4. Loads the user's `job_sources` (projection: `externalSourceId` only) to compute `isMonitored`.
5. **Filters to `isGroup || isChannel`** — private chats/DMs are dropped.
6. Maps each `Dialog` to a plain object, tagging it with `isMonitored`, and **disconnects in `finally`**.

> ⚠️ Dialogs must never be returned raw. `teleproto`'s `Dialog` class holds a `_client` back-reference (`TelegramClient` → `updateManager` → `client`), so `JSON.stringify` throws `Converting circular structure to JSON`. The `.map()` to a plain object is what makes this endpoint serializable.

Filter semantics (from `teleproto/tl/custom/dialog.js`):

| Dialog type | `isGroup` | `isChannel` | Returned |
|---|---|---|---|
| Private user / DM | ✗ | ✗ | no |
| Basic group (`Api.Chat`) | ✓ | ✗ | yes |
| Broadcast channel (`Api.Channel`) | ✗ | ✓ | yes |
| Supergroup / megagroup | ✓ | ✓ | yes |

`IterDialogsParams` has no server-side type filter, so all dialogs are fetched and filtered locally. Communities are excluded because `includeCommunities` defaults to `false`.

---

### DELETE /api/v1/telegram

Unlinks the connected Telegram account.

- **Method:** `DELETE`
- **Path:** `/api/v1/telegram`
- **Auth:** required (`authenticate`) — no `authorize`, any logged-in user
- **Request body / query params:** none

**What it does, in order:**

1. Loads the `TelegramAccount`. If it is absent **or** `status !== CONNECTED`, it short-circuits to the already-disconnected response (still clearing `User.telegram` so no stale pointer survives).
2. Best-effort **remote revocation**: builds a client from the stored session and calls `client.logOut()` → `auth.logOut`, which makes Telegram invalidate the auth key server-side.
3. Stops the in-memory event listener for this user (`stopListeningForUser` → `client.disconnect()`).
4. In a **transaction**: sets `status: DISCONNECTED`, `userSessionString: null`, `lastError: null`, and `User.telegram: null`.

**Success (200) — was connected:**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Telegram disconnected successfully",
  "data": {
    "status": "DISCONNECTED",
    "revokedRemotely": true,
    "alreadyDisconnected": false
  }
}
```

**Success (200) — idempotent no-op:**

Returned when the account was never connected, or was already `DISCONNECTED` / `EXPIRED` / `REVOKED` / `ERROR`. Disconnecting twice is **not** an error.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Telegram is already disconnected",
  "data": {
    "status": "DISCONNECTED",
    "revokedRemotely": false,
    "alreadyDisconnected": true
  }
}
```

**Errors:**

| Status | Cause |
|---|---|
| `401` | Missing/expired `accessToken` cookie, invalid token, inactive account |

No `404`/`409` for "not connected" — by design the endpoint never fails for an already-clean state.

#### `revokedRemotely`

`client.logOut()` returns a **boolean**, not a throw: `true` means Telegram accepted the logout, `false` means the call failed (network, unauthorized key). **The local session is wiped either way**, so `revokedRemotely: false` still leaves the account properly disconnected — it just means the auth key may still be technically valid on Telegram's side. The failure is logged and never surfaced as an HTTP error.

#### What happens to job sources

Nothing. `job_sources` rows are **not** touched — they stay `ACTIVE` and remain listable via `GET /api/v1/job-sources`. Only *adding new* ones is blocked (`POST /job-sources` → `400 Telegram account is not connected (status: DISCONNECTED)`), because resolving names requires Telegram.

Reconnecting via `GET /api/v1/telegram/auth/qr` resumes everything without any restore step.

**Behavior after disconnect:**

| Endpoint | Result |
|---|---|
| `GET /telegram/auth/qr` | ✅ works — the reconnect path |
| `GET /telegram/sources/available` | `400 Telegram account is not connected (status: DISCONNECTED)` |
| `POST /job-sources` | `400 Telegram account is not connected (status: DISCONNECTED)` |
| `GET /job-sources` | ✅ `200` unchanged — no Telegram call involved |
| `getCurrentUser` (auth) | `telegram` omitted (`User.telegram` is `null`) |

## Architecture

### TelegramClientService

`telegram-client.service.ts` — thin wrapper around the `teleproto` `TelegramClient`.

```ts
new TelegramClientService(apiId, apiHash)
```

| Member | Description |
|---|---|
| `initClient()` | Creates `new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 })` — an **empty** session used only for the QR sign-in. Public so `TelegramService` can build the QR client. |
| `createClientUsingSessionString(s)` | Builds a throwaway `TelegramClient` from a decrypted session string |
| `getSessionString(userId)` | Loads `userSessionString` from Mongo and `decrypt()`s it. Throws `"Telegram account not connected"` if the row is absent, `"Telegram session is missing"` if `userSessionString` is null — the second guard is what keeps a disconnected account from reaching `decrypt(null)`. |
| `getClient(userId)` | `async` — loads the session string and returns a ready client |
| `connect()` | `client.connect()` — establishes the MTProto connection on the module-level client |
| `getMe()` | `client.getMe()` — returns the authenticated `Api.User` |

### TelegramListenerService

`telegram-event-listener.service.ts` — one long-lived client + handler per user.

| Member | Description |
|---|---|
| `startListeningForUser(userId)` | Creates a client for the user, registers a `NewMessage` handler, and **stores it in `clients: Map<string, TelegramClient>`**. No-ops if already listening. |
| `stopListeningForUser(userId)` | Looks up the stored client, `await client.disconnect()`, deletes it from the map. No-ops (with a log) if nothing was listening. Called by `DELETE /telegram`. |

### TelegramService

`telegram.service.ts` — business logic.

| Method | Status | Description |
|---|---|---|
| `startQrAuth(onQrCode, signal, loggedInUser)` | ✅ implemented | Calls `telegramClient.signInUserWithQrCode({ apiId, apiHash }, { qrCode, onError, abortSignal })`. On success: derives a profile summary, encrypts the session string, upserts `TelegramAccount` (status `CONNECTED`), sets `User.telegram`, returns the profile. On failure: writes an `ERROR` row and rethrows. |
| `getAvailableSources(loggedInUser)` | ✅ implemented | Returns groups/channels for the linked account as plain objects. Uses a per-request client that is always disconnected in `finally`. |
| `disconnectTelegram(loggedInUser)` | ✅ implemented | Idempotent unlink: short-circuits if not `CONNECTED`, otherwise `revokeSessionRemotely` → `stopListeningForUser` → transactional wipe of `userSessionString` + `status` + `User.telegram`. |
| `requireConnectedAccount(userId)` (private) | ✅ implemented | Shared precondition used by `getAvailableSources`: `404` no row → `400` status ≠ `CONNECTED` → `409` session missing. |
| `revokeSessionRemotely(account)` (private) | ✅ implemented | `decrypt` → `createClientUsingSessionString` → `connect()` → `logOut()`. Returns `false` instead of throwing on any failure; always `disconnect()`s in `finally`. |
| `getProfileSummary(user)` (private) | ✅ implemented | Projects an `Api.User` into a JSON-safe profile (name, phone, base64 avatar, flags). |

Removed stubs (`startAuth`, `verifyCode`, `verifyPassword`, `isAuthenticated`, `getCurrentUser`, `getSession`, `logout`) are no longer part of the class.

### TelegramController

`telegram.controller.ts` — HTTP layer.

| Handler | Route | Description |
|---|---|---|
| `startQrAuth(req, res)` | `GET /auth/qr` | Sets SSE headers, wires `AbortController` to request close, streams `qr` / `done` / `error` events, ends response. |
| `getAvailableSources(req, res, next)` | `GET /sources/available` | Delegates to the service and returns `ApiResponse.success`. Errors go to `next(error)` → `globalErrorHandler`. |
| `disconnectTelegram(req, res, next)` | `DELETE /` | Delegates to the service; picks `"Telegram disconnected successfully"` vs `"Telegram is already disconnected"` off `result.alreadyDisconnected`. Always `200`. |

### Telegram module (composition root)

`telegram.module.ts`:

```ts
const { apiId, apiHash } = envConfig.telegram;
const telegramClient = new TelegramClientService(apiId, apiHash);
telegramClient.connect(); // connects on import
const telegramService = new TelegramService(apiId, apiHash, telegramClient);
const telegramController = new TelegramController(telegramService);

export { telegramClient, telegramController };
```

Exports: `telegramClient`, `telegramController` (routes import the controller from here).

## Data model

Collection **`telegram_accounts`** (`telegram.model.ts`), one document per linked user (`userId` is unique):

| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId → `User` | unique |
| `telegramUserId` | string | Telegram numeric id as string |
| `username` / `firstName` / `lastName` | string \| null | |
| `avatarBase64` | string \| null | `data:image/jpeg;base64,...` |
| `status` | enum | `CONNECTED` \| `DISCONNECTED` \| `EXPIRED` \| `REVOKED` \| `ERROR` |
| `userSessionString` | string | **AES-256-GCM encrypted** session string |
| `lastConnectedAt` | Date | |
| `lastError` | string \| null | populated when `status: "ERROR"` |

`User.telegram` (`user.model.ts`) is an ObjectId ref back to this collection, written by `startQrAuth`.

`GET /api/v1/auth/me` joins the two and returns `telegram: { id, username, status, ... }` with `userSessionString`, `createdAt`, `updatedAt`, `userId` stripped.

## Session storage

Sessions live in **MongoDB**, not on disk.

| Layer | Detail |
|---|---|
| Source of truth | `telegram_accounts.userSessionString` |
| Format | `StringSession` string produced by `this.telegramClient.session.save()` |
| Protection | Encrypted with AES-256-GCM via `src/utils/crypto.ts` (`iv.authTag.ciphertext`, all base64, `.`-separated) |
| Key | `TELEGRAM_SESSION_ENCRYPTION_KEY` (base64, decodes to exactly 32 bytes) |
| Reads | `TelegramClientService.getSessionString()` → `decrypt()` |

On QR success the flow is:

```
signInUserWithQrCode
  → telegramClient.session.save()          // plaintext StringSession
  → encrypt(sessionString)                 // AES-256-GCM
  → TelegramAccount.userSessionString      // stored
  → User.telegram = account._id
```

Requests that need a live client (e.g. `getAvailableSources`) reverse it:

```
decrypt(userSessionString)
  → createClientUsingSessionString(...)
  → connect → use → disconnect (finally)
```

> ⚠️ These are **user sessions** (MTProto auth keys), not bot tokens. Anyone with the DB row *and* the env key can impersonate the account. Never log the decrypted session string.

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
                encrypt() + upsert
                telegram_accounts
                         │
                         ▼
                link User.telegram
```

Internally the `qr` SSE event is emitted each time the `qrCode` callback fires (initial token + refreshes) until the user confirms the login or the signal aborts.

## Known limitations

- Only the QR auth flow is implemented; phone/OTP and 2FA are not wired (the `password` resolver in `startQrAuth` is commented out, so accounts with 2FA enabled will fail).
- The module connects to Telegram eagerly at import time (no lazy/delayed connection or graceful shutdown handling).
- `getAvailableSources` creates a new `TelegramClient` per request and fetches **all** dialogs before filtering locally — expensive for accounts with many chats.
- `isMonitored` in `getAvailableSources` queries `job_sources` **without a `deletedAt: null` filter**, unlike `getJobSources`. Once a soft-delete endpoint exists, a deleted source would still report `isMonitored: true`. Add `deletedAt: null` to that `find()` when implementing deletion.
- `envConfig` does not validate the Telegram credentials beyond the key-length check in `crypto.ts`.
- The module-level client used for QR sign-in is a single shared instance; concurrent QR logins from different users would collide on the same session.
- The `catch` block in `startQrAuth` unconditionally inserts an `ERROR` row, overwriting any previously `CONNECTED` record — a transient network error during a re-auth will clobber a good session.
- `revokeSessionRemotely` swallows all failures by design: when Telegram is unreachable the account still disconnects locally, but the auth key stays valid server-side (reported as `revokedRemotely: false`).
- `stopListeningForUser` calls `client.disconnect()` but does not call `removeEventHandler` — it needs the `EventBuilder` reference, which `startListeningForUser` does not currently retain. `disconnect()` stops the handlers anyway, so this is cosmetic until the listener can restart without recreating the client.

# Listener
```javascript
User A
  │
  └── TelegramClient A
          │
          └── Listener A
                  ├── Source A1
                  ├── Source A2
                  └── Source A3


User B
  │
  └── TelegramClient B
          │
          └── Listener B
                  ├── Source B1
                  └── Source B2


User C
  │
  └── TelegramClient C
          │
          └── Listener C
                  ├── Source C1
                  ├── Source C2
                  └── Source C3

1 Telegram account/session → 1 Telegram client → 1 message listener
```