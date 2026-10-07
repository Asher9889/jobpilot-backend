# User Module API

Base URL: `/api/v1/users`

All endpoints require **authentication** via JWT (access token in httpOnly cookie).

> **Note:** Every endpoint is restricted to the `SUPER_ADMIN` role only. Admins cannot access these endpoints.

---

## Data Model

### User Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | MongoDB ObjectId |
| `email` | string | Unique email address (stored lowercase) |
| `role` | enum | `SUPER_ADMIN` \| `ADMIN` |
| `accountStatus` | enum | `ACTIVE` \| `INACTIVE` |
| `createdAt` | string | ISO timestamp |
| `updatedAt` | string | ISO timestamp |

> The `password` field is never returned in any API response.

---

## 1. Get All Users

```
GET /api/v1/users
```

Returns a **paginated, filterable, and sortable** list of users. The role filter defaults to `ADMIN`, so calling the endpoint without any query params lists all admin accounts.

**Auth Required:** SUPER_ADMIN

**Query Parameters:**

| Param | Type | Default | Required | Description |
|-------|------|---------|----------|-------------|
| `role` | enum | `ADMIN` | No | Filter by role: `ADMIN` \| `SUPER_ADMIN` |
| `search` | string | — | No | Case-insensitive search on email |
| `accountStatus` | enum | — | No | Filter by status: `ACTIVE` \| `INACTIVE` |
| `page` | number | `1` | No | Page number (min 1) |
| `limit` | number | `20` | No | Items per page (min 1, max 50) |
| `sortBy` | enum | `createdAt` | No | Sort field: `createdAt` \| `email` |
| `sortOrder` | enum | `desc` | No | Sort direction: `asc` \| `desc` |

**Example Requests:**

```
GET /api/v1/users
GET /api/v1/users?role=ADMIN
GET /api/v1/users?role=SUPER_ADMIN
GET /api/v1/users?search=admin
GET /api/v1/users?accountStatus=ACTIVE
GET /api/v1/users?page=1&limit=10&search=admin&role=ADMIN&accountStatus=ACTIVE&sortBy=email&sortOrder=asc
```

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Users fetched successfully",
  "data": {
    "users": [
      {
        "id": "664f1a2b3c4d5e6f7a8b9c0d",
        "email": "admin@example.com",
        "role": "ADMIN",
        "accountStatus": "ACTIVE",
        "createdAt": "2025-06-01T10:30:00.000Z",
        "updatedAt": "2025-06-15T14:20:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

**Error (400) — invalid query parameter:**

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Please provide valid data",
  "errors": [
    {
      "field": "role",
      "message": "Valid values are: SUPER_ADMIN, ADMIN"
    }
  ]
}
```

**Frontend Usage:**
- "Admin Users" table with search box, role/status filters, and pagination.
- Default list (`GET /api/v1/users`) should show all admins.

---

## 2. Create User

```
POST /api/v1/users
```

Creates a new admin or super admin account.

**Auth Required:** SUPER_ADMIN

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | **Yes** | Valid email address |
| `password` | string | **Yes** | Min 6, max 20 characters |
| `role` | enum | **Yes** | `SUPER_ADMIN` \| `ADMIN` |
| `accountStatus` | enum | No | Defaults to `ACTIVE` |

**Example Payload:**

```json
{
  "email": "newadmin@example.com",
  "password": "Admin@123",
  "role": "ADMIN",
  "accountStatus": "ACTIVE"
}
```

**Response (201):**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "User created successfully",
  "data": {
    "id": "664f1a2b3c4d5e6f7a8b9c0e",
    "email": "newadmin@example.com",
    "role": "ADMIN",
    "accountStatus": "ACTIVE",
    "createdAt": "2025-06-15T14:20:00.000Z",
    "updatedAt": "2025-06-15T14:20:00.000Z"
  }
}
```

> On successful creation, a welcome email is sent to the user (queued via the email worker).

**Error (400) — account already exists:**

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Account already exists.",
  "errors": []
}
```

**Error (400) — validation failure:**

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Password must be at least 6 characters long",
  "errors": [
    {
      "field": "password",
      "message": "Password must be at least 6 characters long"
    }
  ]
}
```

---

## 3. Edit Admin Account

```
PATCH /api/v1/users/:id
```

Updates an **admin** account's email, password, and/or account status. Super admin accounts cannot be edited. At least one field is required.

**Auth Required:** SUPER_ADMIN

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | MongoDB ObjectId of the user |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | No | New email address (must be unique) |
| `password` | string | No | New password, min 6 / max 20 characters (hashed with argon2 via the model hook) |
| `accountStatus` | enum | No | New status: `ACTIVE` \| `INACTIVE` |

**Example Payload:**

```json
{
  "email": "admin.updated@example.com",
  "password": "NewPass@456"
}
```

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Admin account updated successfully",
  "data": {
    "id": "664f1a2b3c4d5e6f7a8b9c0d",
    "email": "admin.updated@example.com",
    "role": "ADMIN",
    "accountStatus": "ACTIVE",
    "createdAt": "2025-06-01T10:30:00.000Z",
    "updatedAt": "2025-06-16T10:00:00.000Z"
  }
}
```

**Error (400) — empty payload / no fields provided:**

```json
{
  "success": false,
  "statusCode": 400,
  "message": "At least one of email, password, or accountStatus is required for update",
  "errors": []
}
```

**Error (400) — email already in use:**

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Account with this email already exists.",
  "errors": []
}
```

**Error (400) — target is not an admin:**

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Only admin accounts can be edited.",
  "errors": []
}
```

**Error (404) — user not found:**

```json
{
  "success": false,
  "statusCode": 404,
  "message": "User not found.",
  "errors": []
}
```

---

## 4. Update Account Status

```
PATCH /api/v1/users/:id/status
```

Enables or disables an **admin** account. Super admin accounts cannot be toggled.

**Auth Required:** SUPER_ADMIN

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | MongoDB ObjectId of the user |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `accountStatus` | enum | **Yes** | New status: `ACTIVE` \| `INACTIVE` |

**Example Payload:**

```json
{
  "accountStatus": "INACTIVE"
}
```

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Admin account status updated successfully",
  "data": {
    "id": "664f1a2b3c4d5e6f7a8b9c0d",
    "email": "admin@example.com",
    "role": "ADMIN",
    "accountStatus": "INACTIVE",
    "createdAt": "2025-06-01T10:30:00.000Z",
    "updatedAt": "2025-06-16T09:00:00.000Z"
  }
}
```

**Error (404) — user not found:**

```json
{
  "success": false,
  "statusCode": 404,
  "message": "User not found.",
  "errors": []
}
```

**Error (400) — target is not an admin:**

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Only admin accounts can be enabled or disabled.",
  "errors": []
}
```

**Error (400) — status already applied:**

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Admin account is already inactive.",
  "errors": []
}
```

---

## Error Response Format

All errors follow this structure:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error description here",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email address"
    }
  ]
}
```

| Status | Meaning |
|--------|---------|
| `400` | Validation error or business rule violation |
| `401` | Unauthenticated (missing/invalid token) |
| `403` | Forbidden (authenticated but not SUPER_ADMIN) |
| `404` | Resource not found |
| `500` | Internal server error |

---

## Quick Reference

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| `GET` | `/api/v1/users` | ✅ | SUPER_ADMIN | Paginated, filterable, sortable user list |
| `POST` | `/api/v1/users` | ✅ | SUPER_ADMIN | Create a new admin / super admin |
| `PATCH` | `/api/v1/users/:id/status` | ✅ | SUPER_ADMIN | Enable / disable an admin account |

---

## Frontend Integration Notes

### Pagination

- Use `pagination.page`, `pagination.totalPages`, and `pagination.total` to render pagination controls.
- `page` and `limit` are 1-indexed.
- Keep `page`, `sortBy`, `sortOrder`, and active filters in the query string so the state survives refreshes.

### Search

- `search` does a case-insensitive match on the email field.
- Debounce the search input (e.g. 300ms) before calling the API to avoid excessive requests.

### Role Filtering

- The endpoint defaults `role` to `ADMIN`. To list super admins, explicitly pass `?role=SUPER_ADMIN`.

### Status Styling

| accountStatus | Suggested Color |
|----------------|----------------|
| `ACTIVE` | Green |
| `INACTIVE` | Red / Gray |

### Frontend Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    Admin Users Table                         │
│                                                              │
│  Each row has a ⋮ menu with actions:                         │
│                                                              │
│  • Deactivate / Activate ──→ PATCH /:id/status              │
│                                                              │
│  "Add Admin" button ───→ POST /users → Create Dialog          │
│                                                              │
│  Filters: search, role, accountStatus, sort                  │
│  Pagination from pagination object                           │
└──────────────────────────────────────────────────────────────┘
```