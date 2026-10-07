# Auth & Password Reset API

Base URL: `/api/v1/auth`

Authentication endpoints use JWT access/refresh tokens stored in httpOnly cookies.

---

## Endpoints

### 1. Login

```
POST /api/v1/auth/login
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email address |
| `password` | string | Yes | 6–20 characters |

**Response:** `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": []
}
```

Sets `accessToken` and `refreshToken` cookies.

---

### 2. Refresh Token

```
POST /api/v1/auth/refresh
```

**Auth Required:** Valid `accessToken` cookie

**Response:** `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Both tokens updated successfully",
  "data": []
}
```

---

### 3. Get Current User

```
GET /api/v1/auth/me
```

**Auth Required:** Valid `accessToken` cookie

**Response:** `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User fetched successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "admin@example.com",
    "role": "ADMIN",
    "accountStatus": "ACTIVE"
  }
}
```

---

### 4. Logout

```
POST /api/v1/auth/logout
```

**Response:** `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Logged out successfully",
  "data": []
}
```

Clears `accessToken` and `refreshToken` cookies.

---

## Forgot Password / Reset Password

Two unauthenticated endpoints for requesting and completing a password reset.

---

### 5. Forgot Password

```
POST /api/v1/auth/forgot-password
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Email address of the account to reset |

**Response (always identical, regardless of whether the email exists):** `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "If an account exists for this email, a password reset link has been sent.",
  "data": []
}
```

**What happens server-side (when the email exists):**
1. All unused, non-expired reset tokens for that user are deleted.
2. A cryptographically random 64-character hex token is generated (`crypto.randomBytes(32).toString("hex")`).
3. Only the SHA-256 hash of the token is stored in the `passwordresettokens` collection.
4. A `PASSWORD_RESET_REQUESTED` event is emitted; the email listener queues a BullMQ job, which sends the reset email.
5. The email contains a link: `<FRONTEND_URL>/reset-password?token=<raw-token>`.
6. The token expires in 10 minutes (`PASSWORD_RESET_TOKEN_TTL_MS`, default 600000ms).

**When the email does not exist:** the exact same generic response is returned; no token is created and no email is sent.

**Validation errors:** `400 BAD_REQUEST`

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Invalid email address",
  "errors": [{ "field": "email", "message": "Invalid email address" }]
}
```

---

### 6. Reset Password

```
POST /api/v1/auth/reset-password
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | Yes | Raw token from the reset email URL query string |
| `password` | string | Yes | New password, 6–20 characters |

**Response:** `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Password reset successfully",
  "data": { "message": "Password reset successfully" }
}
```

**Errors:** a single uniform 400 response is returned in all failure cases to prevent token/account enumeration:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Invalid or expired password reset token",
  "errors": []
}
```

Returned when the token is invalid, expired, already used, or the user no longer exists.

---

## Password Reset Data Model

### `passwordresettokens` collection

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Document identifier |
| `userId` | ObjectId (ref `User`) | The user who requested the reset |
| `tokenHash` | string | SHA-256 hash of the raw reset token |
| `expiresAt` | Date | 10 minutes after creation; TTL index auto-deletes expired documents |
| `usedAt` | Date \| null | Set to the current timestamp when the token is consumed; null until used |
| `createdAt` | Date | Auto-generated timestamp |
| `updatedAt` | Date | Auto-generated timestamp |

**Indexes:**

| Fields | Purpose |
|--------|---------|
| `{ tokenHash: 1 }` | Unique-ish lookup during reset |
| `{ userId: 1, usedAt: 1 }` | Invalidating active tokens before issuing a new one |
| `{ expiresAt: 1 }, expireAfterSeconds: 0` | MongoDB TTL index — auto-purges expired tokens |

---

## Security Notes

- Raw reset tokens are **never stored, logged, or returned** in any response.
- Generic 400/200 responses in all failure/success paths prevent email/account/token enumeration.
- Each token is **single-use**: once consumed, `usedAt` is set and the token is permanently rejected.
- Old unused tokens are deleted before issuing a new one, so only the most recent reset request is active.
- New passwords are hashed with **argon2** by the existing `UserModel` pre-save hook — the plaintext password is never written to disk.
- Existing JWT sessions are **not invalidated** on reset. The auth architecture is stateless (stateless JWTs in httpOnly cookies with no revocation store), so users remain logged in until their access/refresh tokens expire. Add a revocation layer (e.g., Redis-backed token blacklist) to force re-login after reset.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTEND_URL` | Yes | — | Base URL of the frontend app (e.g. `http://localhost:5173`); used to construct the reset link |
| `PASSWORD_RESET_TOKEN_TTL_MS` | No | `600000` (10 min) | Token lifetime in milliseconds |
| `SMTP_HOST` | Yes | — | Already required by the email module |
| `SMTP_PORT` | Yes | — | Already required by the email module |
| `SMTP_USER` | Yes | — | Already required by the email module |
| `SMTP_PASS` | Yes | — | Already required by the email module |
| `SMTP_SECURE` | Yes | — | Already required by the email module |

---

## Tests

Run all tests:

```bash
npm test
```

Password reset tests cover:

1. `forgotPassword` with an existing email — token created, old tokens invalidated, event emitted, raw token not persisted
2. `forgotPassword` with a non-existing email — identical generic response, nothing created, no event emitted
3. `resetPassword` with a valid token — password re-hashed via the argon2 model hook, token marked used
4. `resetPassword` with an expired token — 400 generic error
5. `resetPassword` with a non-existent token — 400 generic error
6. `resetPassword` with an already-used token — 400 generic error
7. `resetPassword` when the user has been deleted — 400 generic error
8. Token reuse prevention — successful reset marks token used; second attempt with the same token fails
9. Stateless architecture — reset does not attempt any session/refresh-token revocation