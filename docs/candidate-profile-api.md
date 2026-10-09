# Candidate Profile API

Base URL: `/api/v1/candidate-profile`

Endpoints for the candidate's single résumé-style profile (headline, skills, experience, education, job preferences, resume).

Authentication uses a JWT access token stored in an httpOnly `accessToken` cookie (`credentials: 'include'`).

---

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/candidate-profile` | Get the current user's profile (auto-creates a blank one if missing) |
| `POST` | `/api/v1/candidate-profile` | Create the profile (`409` if one already exists) |
| `PATCH` | `/api/v1/candidate-profile` | Partially update the profile (`404` if missing) |
| `DELETE` | `/api/v1/candidate-profile` | Delete the profile (`404` if missing) |
| `GET` | `/api/v1/candidate-profile/completion` | Recompute and return profile completion (`404` if missing) |
| `POST` | `/api/v1/candidate-profile/resume` | Upload a résumé (`multipart/form-data`, `404` if profile missing) |

> **Singleton, no `:id`.** Exactly one profile per user (enforced by a unique index on `userId`). Ownership always comes from the JWT, so a user can never address — or be given — another user's profile.

> **`multipart/form-data` only on `/resume`.** Every other endpoint expects `application/json`.

---

## Key behaviours

| Behaviour | Detail |
|-----------|--------|
| **`null` means "clear it"** | `null` wipes a field. Omitting the field entirely leaves it untouched. |
| **GET never 404s** | If no profile exists, a blank one is created and returned. Call `GET` freely on app load. |
| **PATCH / DELETE / completion 404 when missing** | They do not auto-create — the client must `POST` (or `GET`) first. |
| **Completion is server-computed** | `profileCompletion` is recalculated from the stored document on every write. Sending it in the body is rejected (`400`). |
| **Unknown fields rejected** | Both `POST` and `PATCH` are strict — any unrecognised key is a `400`. |

---

## Data Model

### Response object (`data`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Mongo ObjectId of the profile |
| `userId` | string | Owner's user ID |
| `headline` | string \| null | e.g. `"Senior Backend Engineer"`, max 200 chars |
| `summary` | string \| null | Free-text bio, max 2000 chars |
| `skills` | array | `{ name, level }`, see below |
| `experience` | object | `{ totalYears, currentRole, previousRoles }` |
| `education` | array | `{ institution, degree, fieldOfStudy, graduationYear }` |
| `preferences` | object | `{ preferredRoles, preferredLocations, workModes, employmentTypes, minSalary }` |
| `resumeObjectKey` | string \| null | Storage key, written only by [POST /resume](#6-upload-résumé). Not client-settable |
| `profileCompletion` | object | `{ percentage, status }`, always recomputed server-side |
| `createdAt` | string | ISO timestamp |
| `updatedAt` | string | ISO timestamp |

### Enums

| Enum | Values |
|------|--------|
| `skills[].level` | `BEGINNER` \| `INTERMEDIATE` \| `ADVANCED` \| `EXPERT` |
| `preferences.workModes[]` | `REMOTE` \| `HYBRID` \| `ONSITE` |
| `profileCompletion.status` | `INCOMPLETE` \| `PARTIALLY_COMPLETE` \| `COMPLETE` |

---

## 1. Get Profile

```
GET /api/v1/candidate-profile
```

**Auth Required:** valid `accessToken` cookie, account status `ACTIVE`

Returns the profile, creating a blank one first if none exists. Safe to call on every page load.

**Success Response — `200 OK`** (blank profile, auto-created)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Candidate profile fetched successfully",
  "data": {
    "id": "6ac7a0000000000000000001",
    "userId": "6ac6a824f4bb4393596d36d5",
    "headline": null,
    "summary": null,
    "skills": [],
    "experience": { "totalYears": null, "currentRole": null, "previousRoles": [] },
    "education": [],
    "preferences": {
      "preferredRoles": [],
      "preferredLocations": [],
      "workModes": [],
      "employmentTypes": [],
      "minSalary": null
    },
    "resumeObjectKey": null,
    "profileCompletion": { "percentage": 0, "status": "INCOMPLETE" },
    "createdAt": "2026-10-09T12:00:00.000Z",
    "updatedAt": "2026-10-09T12:00:00.000Z"
  }
}
```

**Errors**

| Status | When |
|--------|------|
| `401` | Missing/invalid/expired token, or account not `ACTIVE` |

---

## 2. Create Profile

```
POST /api/v1/candidate-profile
```

**Auth Required:** valid `accessToken` cookie

**Content-Type:** `application/json`

Every field is optional — `POST {}` is valid and yields a blank profile.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `headline` | string \| null | No | Max 200 chars, min 1 |
| `summary` | string \| null | No | Max 2000 chars |
| `skills` | array | No | Defaults to `[]`. Items: `{ name, level }` |
| `skills[].name` | string | Yes | Non-empty |
| `skills[].level` | enum \| null | No | See enums above |
| `experience` | object | No | |
| `experience.totalYears` | number \| null | No | Integer, 0–60 |
| `experience.currentRole` | string \| null | No | |
| `experience.previousRoles` | string[] | No | Defaults to `[]` |
| `education` | array | No | Defaults to `[]`. Items: `{ institution, degree, fieldOfStudy, graduationYear }` |
| `education[].graduationYear` | number \| null | No | Integer, 1950 – current year |
| `preferences` | object | No | |
| `preferences.preferredRoles` | string[] | No | Defaults to `[]` |
| `preferences.preferredLocations` | string[] | No | Defaults to `[]` |
| `preferences.workModes` | enum[] | No | Defaults to `[]` |
| `preferences.employmentTypes` | string[] | No | Defaults to `[]` |
| `preferences.minSalary` | number \| null | No | Integer ≥ 0 |
| `resumeObjectKey` | — | No | **Ignored / rejected.** Use [POST /resume](#6-upload-résumé) |

**Request example:**

```json
{
  "headline": "Senior Backend Engineer",
  "summary": "I build APIs.",
  "skills": [
    { "name": "TypeScript", "level": "EXPERT" },
    { "name": "Node.js", "level": "ADVANCED" }
  ],
  "experience": { "totalYears": 6, "currentRole": "Backend Engineer", "previousRoles": ["SDE1"] },
  "education": [
    { "institution": "IIT", "degree": "B.Tech", "fieldOfStudy": "CSE", "graduationYear": 2019 }
  ],
  "preferences": {
    "preferredRoles": ["Backend Engineer"],
    "preferredLocations": ["Remote"],
    "workModes": ["REMOTE"],
    "employmentTypes": ["FULL_TIME"],
    "minSalary": 1500000
  }
}
```

#### Success Response — `201 Created`

Same response object as [Get Profile](#1-get-profile), with the submitted values filled in and `profileCompletion` recomputed.

**Errors**

| Status | When | Message |
|--------|------|---------|
| `400` | Validation failure, or an unknown field (e.g. `profileCompletion`) | Zod issue message(s) |
| `401` | Not authenticated | — |
| `409` | A profile already exists for this user | `Candidate profile already exists for this user` |

---

## 3. Update Profile

```
PATCH /api/v1/candidate-profile
```

**Auth Required:** valid `accessToken` cookie

**Content-Type:** `application/json`

Partially merges into the stored profile. The three field groups behave differently:

| Group | Fields | Semantics |
|-------|--------|-----------|
| Scalars | `headline`, `summary`, `resumeObjectKey` | Omit = unchanged · `null` = clear |
| **Replace arrays** | `skills`, `education` | Omit = unchanged · send array = **full replace** |
| **Merge objects** | `experience`, `preferences` | Omit whole object = unchanged · if present, merge **per field** (omit a sub-field = keep it · `null` = clear it) |

> Sending `{ "preferences": { "minSalary": null } }` clears only `minSalary`; the four preference lists are left intact. Sending `{ "skills": [...] }` replaces the entire skills list — append/remove must be done client-side.

**Request example** (clears the headline, bumps years of experience, leaves everything else alone):

```json
{
  "headline": null,
  "experience": { "totalYears": 7 }
}
```

#### Success Response — `200 OK`

Returns the full updated profile object.

**Errors**

| Status | When | Message |
|--------|------|---------|
| `400` | Validation failure, or an unknown field | Zod issue message(s) |
| `401` | Not authenticated | — |
| `404` | No profile exists yet | `Candidate profile not found` |

---

## 4. Delete Profile

```
DELETE /api/v1/candidate-profile
```

**Auth Required:** valid `accessToken` cookie

Hard-deletes the document. The next `GET` will recreate a blank one.

#### Success Response — `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Candidate profile deleted successfully",
  "data": null
}
```

**Errors**

| Status | When | Message |
|--------|------|---------|
| `401` | Not authenticated | — |
| `404` | No profile exists | `Candidate profile not found` |

---

## 5. Get Profile Completion

```
GET /api/v1/candidate-profile/completion
```

**Auth Required:** valid `accessToken` cookie

Recomputes from the stored document and returns just the completion block.

#### Success Response — `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile completion fetched successfully",
  "data": { "percentage": 90, "status": "PARTIALLY_COMPLETE" }
}
```

**Errors**

| Status | When | Message |
|--------|------|---------|
| `401` | Not authenticated | — |
| `404` | No profile exists | `Candidate profile not found` |

---

## Profile Completion

`percentage` is the sum of the weights below (always an integer, 0–100). `status` is derived:

| `percentage` | `status` |
|---|---|
| `0` | `INCOMPLETE` |
| `1–99` | `PARTIALLY_COMPLETE` |
| `100` | `COMPLETE` |

| Section | Weight | Counts when |
|---------|--------|-------------|
| Headline | 10% | `headline` is non-empty |
| Skills | 25% | `skills` has at least one item |
| Experience | 25% | `experience.totalYears` is not `null` |
| Education | 10% | `education` has at least one item |
| Job preferences | 15% | `preferences.preferredRoles` **and** `preferences.workModes` are both non-empty |
| Résumé | 15% | `resumeObjectKey` is non-empty |
| **Total** | **100%** | |

> `preferences.minSalary` does **not** affect the score. `experience.currentRole` / `previousRoles` do not either — only `totalYears` counts for the experience section.

**Example:** clearing `headline`, `skills`, `education` and `resumeObjectKey` from a 100% profile leaves `experience` (25) + `preferences` (15) = **40%**.

---

## 6. Upload Résumé

```
POST /api/v1/candidate-profile/resume
```

**Auth Required:** valid `accessToken` cookie

**Content-Type:** `multipart/form-data`

Stores the résumé in object storage and writes `resumeObjectKey` on the profile. This is the **only** way to set that field — sending `resumeObjectKey` on `POST`/`PATCH` is a `400` (unknown key).

#### Form field

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `resume` | file | Yes | Exactly one file. The field name must be `resume` |

**Limits**

| Limit | Value |
|-------|-------|
| Max size | 5 MB |
| Accepted types | `application/pdf` · `application/msword` · `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| Files per request | 1 |

> **The declared `Content-Type` is not trusted.** The real type is read from the file's magic bytes (`%PDF`, `PK\x03\x04`, `D0 CF 11 E0 …`). A `.txt` renamed to `resume.pdf` is rejected with `415`, and a real `.docx` uploaded as `application/pdf` is accepted and stored with a `.docx` key.

**Object key** is generated server-side as `resumes/{userId}/{uuid}{ext}`, where the extension is derived from the **sniffed content**, never from the client filename. Two uploads never collide, and the original filename never reaches storage.

**Example** (`curl`):

```bash
curl -X POST https://api.example.com/api/v1/candidate-profile/resume \
  -H "Cookie: accessToken=<jwt>" \
  -F "resume=@./resume.pdf;type=application/pdf"
```

#### Success Response — `200 OK`

Returns the full profile object, with `resumeObjectKey` set and `profileCompletion` recomputed (+15 for the résumé section).

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Resume uploaded successfully",
  "data": {
    "id": "6ac947ed23ab37f3cc45a8c4",
    "userId": "6ac6a824f4bb4393596d36d5",
    "headline": "Senior Backend Engineer",
    "summary": null,
    "skills": [],
    "experience": { "totalYears": null, "currentRole": null, "previousRoles": [] },
    "education": [],
    "preferences": {
      "preferredRoles": [],
      "preferredLocations": [],
      "workModes": [],
      "employmentTypes": [],
      "minSalary": null
    },
    "resumeObjectKey": "resumes/6ac6a824f4bb4393596d36d5/3f1a9c2e-8b4d-4e6a-9c1f-2d5e7a8b9c0d.pdf",
    "profileCompletion": { "percentage": 25, "status": "PARTIALLY_COMPLETE" },
    "createdAt": "2026-10-10T02:00:00.000Z",
    "updatedAt": "2026-10-10T02:05:00.000Z"
  }
}
```

**Re-uploading** replaces the stored object: a new key is generated, and the previous object is deleted from storage on a best-effort basis (a failed cleanup is logged, not surfaced).

#### Errors

| Status | When | Message |
|--------|------|---------|
| `400` | No file, wrong form field name, or file > 5 MB | `Resume file is required` / `Resume must be at most 5MB` |
| `401` | Not authenticated | — |
| `404` | No profile exists yet | `Candidate profile not found` |
| `415` | Declared MIME type not in the allowlist, **or** magic bytes don't match a known résumé type | `Resume must be a PDF, DOC or DOCX file` |
| `500` | Object-storage upload failed | `Failed to upload file to storage` |

> The size check runs in multer **before** the file is buffered, so an oversized upload is rejected without ever being fully read into memory.

---

## Error shape

All errors follow the same envelope:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Invalid input: expected number, received string, Unrecognized key: \"bogus\"",
  "errors": [
    { "field": "experience", "message": "Invalid input: expected number, received string" },
    { "message": "Unrecognized key: \"bogus\"" }
  ]
}
```

| Status | Body |
|--------|------|
| `400` | One `errors` entry per Zod issue |
| `401` / `404` / `409` | `"errors": []` |

> **`errors[].field` is the top-level path only** (`experience`, not `experience.previousRoles`). It is **omitted entirely** for unrecognized-key errors, which only carry a `message`.
