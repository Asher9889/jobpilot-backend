# Job Sources API

Base URL: `/api/v1/job-sources`

Endpoints that let a user register the Telegram groups/channels jobs should be scraped from.

Authentication uses a JWT access token stored in an httpOnly `accessToken` cookie (`credentials: 'include'`).

---

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/job-sources` | Add one or more job sources |
| `GET` | `/api/v1/job-sources` | List the current user's job sources (filterable, sortable) |

> ⚠️ **Still missing:** there is no endpoint to **update** (pause/resume) or **delete** a job source. Build the list UI now, but don't wire up a delete button yet.

---

### 1. Add Job Sources

```
POST /api/v1/job-sources
```

**Auth Required:** valid `accessToken` cookie, account status `ACTIVE`

**Content-Type:** `application/json`

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sources` | array | Yes | 1 or more sources. Empty array is rejected |
| `sources[].provider` | enum | Yes | `TELEGRAM` \| `LINKEDIN` \| `NAUKRI` \| `INDEED` |
| `sources[].type` | enum | Yes | `TELEGRAM_CHANNEL` \| `TELEGRAM_GROUP` \| `LINKEDIN` \| `NAUKRI` \| `INDEED` |
| `sources[].externalSourceId` | string | Yes | Telegram chat ID, e.g. `"-1001234567890"` |

**`externalSourceId`** is the channel/group ID where jobs arrive. For `provider: "TELEGRAM"` it must match `^-?\d{5,20}$` (digits, optional leading `-`). Always a **string**, never a number.

**`type` must pair with `provider`.** Currently only these combinations are valid:

| `provider` | Valid `type` values |
|---|---|
| `TELEGRAM` | `TELEGRAM_CHANNEL`, `TELEGRAM_GROUP` |
| `LINKEDIN` | `LINKEDIN` |
| `NAUKRI` | `NAUKRI` |
| `INDEED` | `INDEED` |

**Request example:**

```json
{
  "sources": [
    { "provider": "TELEGRAM", "type": "TELEGRAM_CHANNEL", "externalSourceId": "-1003617973472" },
    { "provider": "TELEGRAM", "type": "TELEGRAM_GROUP",    "externalSourceId": "-4015775047" }
  ]
}
```

#### Success Response — `201 Created`

At least one source was inserted:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Job sources added successfully",
  "data": {
    "created": [
      {
        "id": "6ac763de0b3813debbdeaa2c",
        "provider": "TELEGRAM",
        "type": "TELEGRAM_CHANNEL",
        "externalSourceId": "-1003617973472",
        "sourceName": "Developer Hub | Jobs & Referrals",
        "sourceUsername": "merntech",
        "status": "ACTIVE",
        "createdAt": "2026-10-08T09:35:26.708Z",
        "updatedAt": "2026-10-08T09:35:26.708Z"
      }
    ],
    "skipped": []
  }
}
```

Nothing new to add (everything was already saved) — still `201`, but `created` is empty:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "No new job sources to add",
  "data": {
    "created": [],
    "skipped": [
      { "externalSourceId": "-1003617973472", "reason": "ALREADY_EXISTS" },
      { "externalSourceId": "-4015775047",    "reason": "ALREADY_EXISTS" }
    ]
  }
}
```

> **Check `data.created.length`, not the status code**, to know whether anything was actually inserted. Both outcomes return `201`.

#### `data` fields

| Field | Type | Description |
|-------|------|-------------|
| `data.created` | array | Sources that were newly inserted |
| `data.created[].id` | string | Mongo ID of the created job source |
| `data.created[].provider` | enum | Echo of the request value |
| `data.created[].type` | enum | Echo of the request value |
| `data.created[].externalSourceId` | string | Echo of the request value |
| `data.created[].sourceName` | string | **Server-resolved** channel/group title from Telegram |
| `data.created[].sourceUsername` | string \| null | **Server-resolved** `@username`, `null` if the chat has none |
| `data.created[].status` | enum | Always `ACTIVE` on creation (`ACTIVE` \| `PAUSED` \| `UNAVAILABLE`) |
| `data.created[].createdAt` | string (ISO 8601) | Creation timestamp |
| `data.created[].updatedAt` | string (ISO 8601) | Last update timestamp |
| `data.skipped` | array | Sources intentionally not inserted |
| `data.skipped[].externalSourceId` | string | The chat ID |
| `data.skipped[].reason` | enum | `ALREADY_EXISTS` \| `DUPLICATE_IN_REQUEST` |

`sourceName` and `sourceUsername` are **not** sent by the client — the server fetches them from Telegram. Do not send them; they are ignored if present.

---

### 2. List Job Sources

```
GET /api/v1/job-sources
```

**Auth Required:** valid `accessToken` cookie, account status `ACTIVE`

Returns **every** job source the logged-in user has added, newest first by default. There is **no pagination** — all matching rows come back in one response.

#### Query parameters (all optional)

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | enum | — | `ACTIVE` \| `PAUSED` \| `UNAVAILABLE` |
| `type` | enum | — | `TELEGRAM_CHANNEL` \| `TELEGRAM_GROUP` \| `LINKEDIN` \| `NAUKRI` \| `INDEED` |
| `search` | string | — | Case-insensitive substring match on `sourceName`. Must not be empty (`400` if `?search=`) |
| `sortBy` | enum | `createdAt` | `createdAt` \| `sourceName` |
| `sortOrder` | enum | `desc` | `asc` \| `desc` |

**`type` filters the stored type, not the provider.** `?type=LINKEDIN` is valid and simply returns `sources: []` while no LinkedIn sources exist.

#### Examples

```
GET /api/v1/job-sources
GET /api/v1/job-sources?status=ACTIVE
GET /api/v1/job-sources?type=TELEGRAM_GROUP
GET /api/v1/job-sources?search=lucent
GET /api/v1/job-sources?sortBy=sourceName&sortOrder=asc
GET /api/v1/job-sources?status=ACTIVE&type=TELEGRAM_CHANNEL&search=ncert
```

#### Response (200)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Job sources fetched successfully",
  "data": {
    "sources": [
      {
        "id": "6ac772c79703a2c03419510b",
        "provider": "TELEGRAM",
        "type": "TELEGRAM_GROUP",
        "externalSourceId": "-4015775047",
        "sourceName": "Our Destiny",
        "sourceUsername": null,
        "status": "ACTIVE",
        "createdAt": "2026-10-08T10:39:03.825Z",
        "updatedAt": "2026-10:08T10:39:03.825Z"
      },
      {
        "id": "6ac772c79703a2c03419510d",
        "provider": "TELEGRAM",
        "type": "TELEGRAM_GROUP",
        "externalSourceId": "-1001692690473",
        "sourceName": "Maths doubt group by Aditya Ranjan Sir 🇮🇳",
        "sourceUsername": "mathsbyaditya_ranjansir01",
        "status": "ACTIVE",
        "createdAt": "2026-10-08T10:39:03.825Z",
        "updatedAt": "2026-10-08T10:39:03.825Z"
      }
    ]
  }
}
```

#### Field reference

| Field | Type | Notes |
|-------|------|-------|
| `data.sources[].id` | string | Mongo `_id` — use this as the key and for any future update/delete calls |
| `data.sources[].provider` | enum | Currently always `TELEGRAM` |
| `data.sources[].type` | enum | The stored chat kind |
| `data.sources[].externalSourceId` | string | Telegram chat ID, e.g. `-1001692690473` |
| `data.sources[].sourceName` | string | Chat title, set server-side from Telegram |
| `data.sources[].sourceUsername` | string \| null | `@username` without the `@`; `null` if the chat has none |
| `data.sources[].status` | enum | `ACTIVE` \| `PAUSED` \| `UNAVAILABLE` |
| `data.sources[].createdAt` | string (ISO 8601) | When it was added |
| `data.sources[].updatedAt` | string (ISO 8601) | Last modification |

Row shape is **identical** to `data.created[]` from `POST`, so one TypeScript interface covers both.

#### Empty state

An empty result is still `200`, with an empty array — **not** an error:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Job sources fetched successfully",
  "data": { "sources": [] }
}
```

Branch your UI on `data.sources.length === 0`, not on the status code.

#### Invalid query (400)

Query validation collects **all** bad params in one response:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Please provide valid data",
  "errors": [
    { "field": "status", "message": "Invalid status" },
    { "field": "sortBy", "message": "sortBy must be createdAt or sourceName" }
  ]
}
```

> Note the envelope differs from `POST`: query errors use the top-level `message: "Please provide valid data"` with details in `errors[]` (shape A), rather than a descriptive top-level message.

---

## Error Responses

All errors use the same envelope:

```json
{
  "success": false,
  "statusCode": <code>,
  "message": "<human readable summary>",
  "errors": []
}
```

### ⚠️ `errors` has two different shapes

This matters for rendering field-level errors:

**Shape A — request/schema problems** (`errors[].field`):

```json
"errors": [{ "field": "sources", "message": "At least one source is required" }]
```

**Shape B — Telegram validation problems** (`errors[].externalSourceId`, no `field`):

```json
"errors": [{ "externalSourceId": "-1009999999999", "message": "Not found among your Telegram groups or channels. …" }]
```

Safe rendering: check `error.field` first, fall back to `error.externalSourceId`, and always display `error.message`.

### Error table

| Status | `message` | `errors` shape | Cause |
|--------|-----------|----------------|-------|
| `400` | `At least one source is required` | A | `sources` is an empty array |
| `400` | `Invalid input: expected array, received undefined` | A | `sources` missing |
| `400` | `Invalid externalSourceId: expected a Telegram chat id such as "-1001234567890"` | A | ID doesn't match `^-?\d{5,20}$` |
| `400` | `Invalid provider` | A | `provider` not in the enum |
| `400` | `Invalid type` | A | `type` not in the enum |
| `400` | `Type "TELEGRAM_CHANNEL" is not valid for provider "LINKEDIN"` | A | `provider`/`type` pair mismatch |
| `400` | `Only the "TELEGRAM" provider is supported right now. Unsupported provider(s): LINKEDIN` | A (`field: "provider"`) | Non-TELEGRAM provider |
| `400` | `Telegram account is not connected (status: EXPIRED)` | `[]` | Telegram account row exists but status isn't `CONNECTED` |
| `400` | `1 source(s) could not be validated` | B | One or more IDs failed Telegram checks (see below) |
| `401` | `Unauthorized: Access token is required` | `[]` | Missing `accessToken` cookie |
| `401` | `Access token has expired` | `[]` | Expired `accessToken` — refresh via `POST /api/v1/auth/refresh` |
| `401` | `Unauthorized: Invalid access token` | `[]` | Malformed/forged token |
| `401` | `Unauthorized: User not found` | `[]` | Token valid but user no longer exists |
| `401` | `Unauthorized: Account is inactive` | `[]` | `accountStatus` is not `ACTIVE` |
| `404` | `Telegram account not connected` | `[]` | No Telegram account linked to this user |
| `409` | `Telegram session is missing, please reconnect Telegram and try again` | `[]` | Account `CONNECTED` but session string absent |
| `409` | `Some of these sources were added by another request, please try again` | `[]` | Concurrent duplicate insert — **retry safely** |
| `500` | `Unable to fetch your Telegram chats: <reason>` | `[]` | MTProto failure (network, revoked session) |
| `400` | `Please provide valid data` | A | **GET only:** invalid query param — `field` is the param name (`status`, `type`, `search`, `sortBy`, `sortOrder`) |

> **After `DELETE /api/v1/telegram`** (see [`telegram.md`](./telegram.md)) the account becomes `DISCONNECTED`, so `POST /job-sources` starts returning `400 Telegram account is not connected (status: DISCONNECTED)`. Your existing job sources are **untouched** — `GET /job-sources` still returns `200` with all of them, and nothing needs restoring on reconnect. Only adding *new* ones is blocked, because resolving `sourceName` requires Telegram.

### Shape B detail — per-source Telegram validation

When any source fails, **the whole request fails** (nothing is inserted — all-or-nothing). Each entry in `errors` names the offending source:

| `message` | Meaning |
|---|---|
| `Not found among your Telegram groups or channels. List them first with GET /api/v1/telegram/sources/available.` | The ID isn't a dialog the connected account has joined |
| `externalSourceId must point to a group or a channel, not a private chat` | The ID resolves to a DM/user |
| `Declared type "TELEGRAM_GROUP" but this is a "TELEGRAM_CHANNEL"` | `type` doesn't match the actual chat kind |

**Note the all-or-nothing rule:** if you send 3 sources and 1 fails validation, you get `400` and **zero** rows are created — even the 2 valid ones. Fix and resubmit.

---

## Dedupe Rules

Duplicates are **skipped, not errors**. Request is processed in two passes:

**1. Within the payload** — keyed on `externalSourceId` alone. First occurrence wins; later repeats are dropped.

```json
"skipped": [{ "externalSourceId": "-1001234", "reason": "DUPLICATE_IN_REQUEST" }]
```

**2. Against the database** — a source this user already added (and hasn't deleted):

```json
"skipped": [{ "externalSourceId": "-1003617973472", "reason": "ALREADY_EXISTS" }]
```

Both are reported in `data.skipped` and the response is still `201`. Resubmitting an existing source is **idempotent and safe** — the client can retry freely.

If every source is skipped, the server **does not call Telegram at all**, so that response is fast.

> Ordering caveat: because in-payload dedupe runs before Telegram validation, if the *same* ID appears twice with *different* `type` values, only the first is type-checked. The second is dropped silently as `DUPLICATE_IN_REQUEST`. Send one entry per ID.

---

## Typical Frontend Flow

**Step 1 — discover available chats and their real types:**

```
GET /api/v1/telegram/sources/available
```

Returns the account's groups/channels with `id`, `name`, `isGroup`, `isChannel`, and **`isMonitored`**. See [`telegram.md`](./telegram.md) for the full response.

**Use `isMonitored` to skip chats the user already added:**

```ts
const selectable = dialogs.filter((d) => !d.isMonitored); // render the rest
```

`isMonitored: true` means a `job_sources` row already exists for that chat ID — show it as **"Added"** rather than offering it again. Sending one anyway is harmless (it comes back as `skipped: [{ reason: "ALREADY_EXISTS" }]`), so filtering is a UX nicety, not a correctness requirement.

> `isMonitored` ignores `status`, so a `PAUSED` source still reports `true`. If your UI distinguishes active from paused, cross-check `GET /api/v1/job-sources`.

**Step 2 — derive `type` from the flags.** This mapping must match the server's:

| Dialog | `isGroup` | `isChannel` | Send as `type` |
|---|---|---|---|
| Private user / DM | ✗ | ✗ | *(not selectable)* |
| Basic group | ✓ | ✗ | `TELEGRAM_GROUP` |
| Broadcast channel | ✗ | ✓ | `TELEGRAM_CHANNEL` |
| Supergroup / megagroup | ✓ | ✓ | **`TELEGRAM_GROUP`** |

> 🔑 **Megagroups report both flags as `true`** (e.g. `isGroup: true, isChannel: true`) but must be sent as `TELEGRAM_GROUP`. Deriving `type` from `isChannel` alone will cause `400`. The safe rule: **if `isGroup` is true → `TELEGRAM_GROUP`, else → `TELEGRAM_CHANNEL`.**

**Step 3 — POST the selection:**

```bash
curl -X POST http://localhost:4512/api/v1/job-sources \
  -H "Content-Type: application/json" \
  -b "accessToken=<jwt>" \
  -d '{
    "sources": [
      { "provider": "TELEGRAM", "type": "TELEGRAM_CHANNEL", "externalSourceId": "-1003617973472" }
    ]
  }'
```

In the browser use `fetch(..., { credentials: "include" })`.

**Step 4 — branch on the result:**

```ts
const res  = await fetch("/api/v1/job-sources", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sources }),
});
const json = await res.json();

if (!json.success) {
  // shape A or B — always safe to show json.message
  return showError(json.message, json.errors);
}
// 201: check data.created.length to know if anything actually changed
return showResult({ added: json.data.created.length, skipped: json.data.skipped });
```

**Step 5 — load the list on mount:**

```ts
const load = async (params: URLSearchParams = new URLSearchParams()) => {
  const res = await fetch(`/api/v1/job-sources?${params}`, { credentials: "include" });
  const json = await res.json();
  if (!json.success) return showError(json.message, json.errors);
  return json.data.sources; // JobSource[]
};

await load();                                                  // everything, newest first
await load(new URLSearchParams({ status: "ACTIVE" }));         // filter
await load(new URLSearchParams({ type: "TELEGRAM_GROUP" }));   // filter
await load(new URLSearchParams({ search: "lucent" }));         // search box
```

Nothing to unwrap: there is no pagination object, so `json.data.sources` is the array.

---

## Server-Side Behaviour (for context)

Order of operations in `addJobSource` (`src/modules/job-source/job-source.service.ts`):

1. Reject non-`TELEGRAM` providers → `400`
2. Load `TelegramAccount` → `404` if absent, `400` if not `CONNECTED`, `409` if session missing
3. Dedupe within payload (`DUPLICATE_IN_REQUEST`)
4. Query already-stored sources (`ALREADY_EXISTS`)
5. **If nothing new → return immediately** (no Telegram call)
6. One `getDialogs()` round trip to resolve `sourceName` / `sourceUsername` and validate every remaining source
7. Insert inside a MongoDB transaction, re-checking duplicates within the transaction

Guarantees:

- **All-or-nothing** on validation — a single invalid source aborts the whole batch
- **Idempotent** — safe to retry or double-submit
- **Race-safe** — a unique partial index on `(userId, provider, externalSourceId)` where `deletedAt: null` backs up the in-transaction duplicate check

`getJobSources` is simpler:

1. Scope the query to `userId: <logged-in user>` and `deletedAt: null` — a user can never see another user's sources
2. Apply `status` / `type` / `search` (the search string is regex-escaped, so `(`, `*`, `[` etc. are harmless)
3. Sort and return every matching row (no `skip`/`limit`)

---

## Data Model

### `job_sources` collection

| Field | Type | Description |
|-------|------|-------------|
| `id` | ObjectId | Document identifier |
| `userId` | ObjectId (ref `User`) | Owner of the source |
| `provider` | enum | `TELEGRAM` \| `LINKEDIN` \| `NAUKRI` \| `INDEED` |
| `type` | enum | `TELEGRAM_CHANNEL` \| `TELEGRAM_GROUP` \| `LINKEDIN` \| `NAUKRI` \| `INDEED` |
| `providerConnectionId` | ObjectId | The `TelegramAccount` backing this source (populated server-side) |
| `externalSourceId` | string | Telegram chat ID |
| `sourceName` | string | Chat title, resolved from Telegram |
| `sourceUsername` | string \| null | Chat `@username`, if any |
| `status` | enum | `ACTIVE` \| `PAUSED` \| `UNAVAILABLE` (default `ACTIVE`) |
| `deletedAt` | Date \| null | Soft-delete marker (default `null`) |
| `createdAt` | Date | Auto-generated timestamp |
| `updatedAt` | Date | Auto-generated timestamp |

**Indexes:**

| Fields | Purpose |
|--------|---------|
| `{ userId: 1, provider: 1, externalSourceId: 1 }` unique, partial on `deletedAt: null` | One active row per user/source; soft-deleted rows drop out so a source can be re-added |
| `{ userId: 1 }` | Owner lookups |
| `{ providerConnectionId: 1 }` | Connection lookups |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URL` | Yes | Must point at a **replica set** — inserts run inside a transaction |
| `TELEGRAM_API_ID` | Yes | From <https://my.telegram.org> |
| `TELEGRAM_API_HASH` | Yes | From <https://my.telegram.org> |
| `TELEGRAM_SESSION_ENCRYPTION_KEY` | Yes | base64, 32 bytes — decrypts stored session strings |
| `JWT_ACCESS_TOKEN_SECRET` | Yes | Verifies the `accessToken` cookie |
