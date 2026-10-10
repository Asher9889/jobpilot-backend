# Job Matches API

Base URL: `/api/v1/job-matches`

The user's AI-scored job matches. Two endpoints with deliberately different payloads: a **lean list** for the feed, and a **full detail** for a single job.

Authentication uses a JWT access token stored in an httpOnly `accessToken` cookie (`credentials: 'include'`).

---

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/job-matches` | Paginated **list** — lean rows, highest score first |
| `GET` | `/api/v1/job-matches/:id` | **Detail** — full match rationale plus the complete job, including the raw post |

> **Read-only and self-scoped.** Results are always filtered to the authenticated user. A match belonging to someone else returns `404`, not `403`, so ids cannot be probed.

`:id` is the **match** id (`matches[].id`), not the job id. The rationale belongs to the match, not the job.

---

## 1. Get Job Matches (list)

```
GET /api/v1/job-matches
```

**Auth Required:** valid `accessToken` cookie, account status `ACTIVE`

**Query Parameters:**

| Param | Type | Default | Required | Description |
|-------|------|---------|----------|-------------|
| `page` | number | `1` | No | Page number, min 1 |
| `limit` | number | `20` | No | Items per page, min 1, max 50 |

**Example Requests:**

```
GET /api/v1/job-matches
GET /api/v1/job-matches?page=1&limit=10
GET /api/v1/job-matches?page=3&limit=5
```

### Ordering

Rows are sorted by, in priority order:

1. `score` descending — best match first
2. `createdAt` descending — among equal scores, the more recent match wins
3. `_id` descending — final tiebreak so pagination is stable and rows never repeat across pages

The backing index is `{ userId: 1, score: -1, createdAt: -1 }`.

### Success Response — `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Job matches fetched successfully",
  "data": {
    "matches": [
      {
        "id": "6aca7b408842967b5554a75f",
        "jobId": "6aca7b398842967b5554a75e",
        "score": 75,
        "company": "DevTrust",
        "roles": ["MERN Stack Developer"],
        "matchedSkills": ["React.js", "Node.js"],
        "reasonExcerpt": "The candidate has strong skills in React.js and Node.js, which are key requirements for the MERN Stack Developer role.…",
        "source": {
          "provider": "TELEGRAM",
          "sourceName": "Our Destiny",
          "sourceUsername": null,
          "sourceType": "TELEGRAM_GROUP",
          "messageId": 19453,
          "messageDate": "2026-10-10T17:51:53.996Z"
        },
        "application": {
          "email": "hr@devtrust.biz",
          "phone": null,
          "applyUrl": null,
          "companyWebsite": null
        }
      }
    ],
    "pagination": { "page": 1, "limit": 1, "total": 4, "totalPages": 4 }
  }
}
```

### `data.matches[]` fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Mongo ObjectId of the **match** — pass this to [the detail endpoint](#2-get-job-match-detail) |
| `jobId` | string | Mongo ObjectId of the job document |
| `score` | number | 0–100. Higher is a better match |
| `company` | string \| null | Hiring company — primary list label |
| `roles` | string[] | Job titles. **Kept as an array** because a posting can list several (e.g. `["Full Stack Developer", "React.js Developer"]`). Render `roles.join(" • ")` for a single line |
| `matchedSkills` | string[] | Skills present in both the job and the candidate profile |
| `reasonExcerpt` | string | First ~120 chars of the full `reason`, cut at a word boundary, ending in `…` when truncated |
| `source` | object \| null | Trimmed source info — see below. `null` if the job was deleted |
| `application` | object | How to reach the employer — see below. All channels are `null` if the job was deleted |

### `data.matches[].source` — mini source

A subset of the detail's `job.source`, using the **same field names** so one frontend type covers both.

| Field | Type | Description |
|-------|------|-------------|
| `provider` | enum | `TELEGRAM` \| `LINKEDIN` \| `NAUKRI` \| `INDEED` |
| `sourceName` | string \| null | Channel or group title, e.g. `"Our Destiny"` |
| `sourceUsername` | string \| null | Channel `@username`, `null` if none |
| `sourceType` | string \| null | `TELEGRAM_CHANNEL` \| `TELEGRAM_GROUP` — use for the icon |
| `messageId` | number | Telegram message id — needed to deep-link to the original post |
| `messageDate` | string \| null | ISO timestamp of the original message |

### `data.matches[].application` — contact channels

Identical in shape and field names to the detail's `job.application` — one type covers both.

| Field | Type | Description |
|-------|------|-------------|
| `email` | string \| null | Application email — render as a `mailto:` link |
| `phone` | string \| null | Contact number — render as a `tel:` link |
| `applyUrl` | string \| null | Direct application URL, `null` if none |
| `companyWebsite` | string \| null | Company site, `null` if none |

All four are `null` when the posting carried no contact info, so drive the CTA off whichever is non-null (or hide it).

**Omitted from the list:** `externalSourceId` (the raw chat id — never rendered), and the rest of the job — `location`, `experience`, `skills`, `rawMessage`, `createdAt` — plus `reason`, `missingSkills`, `concerns` and `jobMatchingStatus`. All of that lives on the detail endpoint.

### `data.pagination`

| Field | Type | Description |
|-------|------|-------------|
| `page` | number | Echo of the requested page |
| `limit` | number | Echo of the requested limit |
| `total` | number | Total matches for this user, across all pages |
| `totalPages` | number | `ceil(total / limit)`. `0` when `total` is `0` |

---

## 2. Get Job Match (detail)

```
GET /api/v1/job-matches/:id
```

**Auth Required:** valid `accessToken` cookie, account status `ACTIVE`

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | The match id — `matches[].id` from the list endpoint. Must be a valid ObjectId |

Full match rationale plus the complete job, **including `rawMessage`** (the raw scraped post).

### Success Response — `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Job match fetched successfully",
  "data": {
    "id": "6aca7b408842967b5554a75f",
    "jobId": "6aca7b398842967b5554a75e",
    "score": 75,
    "reason": "The candidate has strong skills in React.js and Node.js, which are key requirements for the MERN Stack Developer role. However, the candidate's experience is slightly less than the job's minimum requirement, and the job also requires knowledge of Express.js, MongoDB, and API integration, which the candidate has not explicitly mentioned.",
    "matchedSkills": ["React.js", "Node.js"],
    "missingSkills": ["Express.js", "MongoDB", "API integration"],
    "concerns": [
      "The candidate's experience is slightly less than the job's minimum requirement.",
      "The candidate's location preference does not match the job's requirement for on-site work in Lucknow.",
      "The candidate's salary expectations are higher than the job's typical range."
    ],
    "jobMatchingStatus": "COMPLETED",
    "createdAt": "2026-10-10T17:52:00.211Z",
    "job": {
      "id": "6aca7b398842967b5554a75e",
      "company": "DevTrust",
      "roles": ["MERN Stack Developer"],
      "experience": { "minYears": 2, "maxYears": 4 },
      "location": { "city": "Lucknow", "state": null, "country": null },
      "skills": [
        "Strong knowledge of JavaScript and TypeScript",
        "Experience with React.js, Node.js, Express.js, and MongoDB",
        "Knowledge of Redux and API integration"
      ],
      "application": {
        "email": "hr@devtrust.biz",
        "phone": null,
        "applyUrl": null,
        "companyWebsite": null
      },
      "source": {
        "provider": "TELEGRAM",
        "externalSourceId": "-4015775047",
        "messageId": 19453,
        "sourceName": "Our Destiny",
        "sourceUsername": null,
        "sourceType": "TELEGRAM_GROUP",
        "messageDate": "2026-10-10T17:51:53.996Z"
      },
      "rawMessage": "🏢 Company: DevTrust\n📍 Location: Lucknow\n💼 Experience: 2-4 Years\n…",
      "createdAt": "2026-10-10T17:51:54.007Z"
    }
  }
}
```

### `data` fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Match id |
| `jobId` | string \| null | Job id. `null` if the job document was deleted |
| `score` | number | 0–100 |
| `reason` | string | The model's full free-text justification (the list only carries a ~120-char excerpt) |
| `matchedSkills` | string[] | Skills in both the job and the profile |
| `missingSkills` | string[] | Skills the job asks for that the candidate lacks |
| `concerns` | string[] | Specific objections — experience gap, location, salary, … |
| `jobMatchingStatus` | enum | `PENDING` \| `FAILED` \| `COMPLETED` |
| `createdAt` | string | ISO timestamp of when the match was scored |
| `job` | object \| null | Full job details — see below |

### `data.job`

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Job id |
| `company` | string \| null | Hiring company |
| `roles` | string[] | Job titles |
| `experience` | object | `{ minYears, maxYears }`, either may be `null` |
| `location` | object | `{ city, state, country }`, any may be `null` |
| `skills` | string[] | Raw skill/bullet strings extracted from the posting |
| `application` | object | `{ email, phone, applyUrl, companyWebsite }`, any may be `null` |
| `source` | object | Full source info — same shape as the list's mini source **plus `externalSourceId`** |
| `rawMessage` | string | The complete raw scraped post. This is the only place it is returned |
| `createdAt` | string | ISO timestamp of when the job was stored |

---

## Notes for the frontend

- **Two shapes, pick by screen.** The list row is exactly 9 fields; the detail response is the full model. `source` and `application` use identical field names in both, so one frontend type covers each — the full `source` just adds `externalSourceId`.
- **Contact CTAs are ready to use.** `application` is on the list so a row can offer `mailto:` / `tel:` / apply-without-opening-detail, without a second request.
- **`job` can be `null`** on both endpoints if the job document was deleted. The score and rationale survive; render the job as unavailable rather than dropping the row.
- **`reasonExcerpt` is guaranteed to be a prefix of `reason`.** It is cut at a word boundary and ends with `…` only when truncated, so it is safe to swap in the full text after fetching the detail without a visible reflow.
- **`roles` is plural on purpose.** Collapsing it loses multi-title postings.
- **`total === 0` is valid** — `matches: []` with `totalPages: 0`, not an error. A user with no scored jobs yet gets this.
- **A page beyond the range** (`?page=9999`) returns `200` with an empty `matches` array, not a `404`.
- **Matches are produced asynchronously** after a Telegram message is classified as a job. A post from moments ago may not have a match yet — refresh rather than assuming it's missing.

---

## Errors

| Status | When | Message |
|--------|------|---------|
| `400` | Invalid query parameter (`page=0`, `limit=51`, …) or an invalid `:id` | `Please provide valid data` |
| `401` | Missing, invalid or expired token; account not `ACTIVE` | `Unauthorized: …` |
| `404` | Detail: no such match, **or** it belongs to another user | `Job match not found` |

**List error example:**

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Please provide valid data",
  "errors": [{ "field": "limit", "message": "limit must be at most 50" }]
}
```

**Detail error examples:**

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Please provide valid data",
  "errors": [{ "field": "id", "message": "Please provide a valid ID" }]
}
```

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Job match not found",
  "errors": []
}
```

`errors[].field` is the offending query parameter or path parameter name.
