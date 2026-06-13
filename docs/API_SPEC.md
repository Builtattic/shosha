# Shosha V2 API Spec (MVP Contract)

> **Status (Day 6):** This document originated as the MVP contract. Implementation has **exceeded** this scope — notifications, claims, disputes, admin, bubbles, people, impact, events, AI, imports, payments, full user onboarding, score history/windows, feed filters/aggregates, swipe aggregate, profile follower counts, user audit, and claims S3 upload are live. For the current endpoint inventory and gaps vs V1, see **[PARITY_STATUS.md](./PARITY_STATUS.md)**.

This document defines the **original MVP API contract** for implementation.

**Originally Phase 1 only:**
- Auth
- Users
- Accounts
- Reports

**Originally deferred (now implemented in V2):**
- Notifications
- Claims
- Disputes
- Admin
- Bubbles, People, Feed, Impact, Events, AI, Imports, Payments

## Guardrails

- This is a contract document only (no routes/services/repositories/frontend code).
- **Do not create endpoints merely because a table exists.**
- Every endpoint must map to a user-facing workflow evidenced in:
  - `docs/FEATURE_INVENTORY.md`
  - `docs/REBUILD_PLAN.md`
  - Legacy behavior in `C:/Others/project/Builtattic/Shoshaaahhh`
- Prefer workflow actions over generic CRUD.

## Endpoint Budget

MVP target caps:
- Auth: <= 5 endpoints
- Users: <= 8 endpoints
- Accounts: <= 12 endpoints
- Reports: <= 15 endpoints
- Notifications: <= 5 endpoints (Phase 2)
- Claims: <= 5 endpoints (Phase 2)
- Disputes: <= 5 endpoints (Phase 2)
- Admin: <= 15 endpoints (Phase 3)

Phase 1 endpoints in this document:
- Auth: 1
- Users: 4
- Accounts: 7
- Reports: 9

## Global Conventions

### Base and versioning
- Base URL: `/api/v1`
- Content type: `application/json`
- Timestamps: ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ssZ`)
- IDs: UUID strings

### Authentication
- Protected endpoints require `Authorization: Bearer <firebase_id_token>`.
- Token is verified via Firebase Admin SDK.
- On first authenticated interaction, backend creates/updates local `users` record by `firebase_uid`.

### Standard success response
```json
{
  "ok": true,
  "data": {}
}
```

### Standard error response
```json
{
  "ok": false,
  "error": {
    "code": "validation_error",
    "message": "Human readable message",
    "details": {}
  }
}
```

`details` is optional and used for field-level validation feedback.

### Canonical error codes
- `unauthorized` -> 401
- `forbidden` -> 403
- `not_found` -> 404
- `conflict` -> 409
- `validation_error` -> 422
- `rate_limited` -> 429
- `internal_error` -> 500

### Pagination (list endpoints)
- Query params: `limit` (default 20, max 100), `cursor` (opaque string)
- Response shape:
```json
{
  "ok": true,
  "data": {
    "items": [],
    "next_cursor": "opaque-or-null"
  }
}
```

## Shared Validation Rules

- `firebase_uid` is immutable after user creation.
- `accounts` uniqueness: `(platform, handle)` must be unique.
- `report_votes` uniqueness: one vote per user per report.
- `reports.reviewed_by` and `reports.reviewed_at` are required whenever report status leaves `PENDING`.
- Enum values must match model enums exactly.
- String limits follow current model definitions.

## Canonical Enums

### UserRole
- `USER`
- `MODERATOR`
- `ADMIN`
- `SUPER_ADMIN`

### AccountStatus
- `ACTIVE`
- `UNDER_REVIEW`
- `DISPUTED`
- `REMOVED`

### ReportStatus
- `PENDING`
- `APPROVED`
- `REJECTED`
- `REMOVED`

### VoteType
- `ALIGN`
- `OPPOSE`

## Report Status Transitions

Allowed transitions:
- `PENDING` -> `APPROVED`, `REJECTED`, `REMOVED`
- `APPROVED` -> `REMOVED`
- `REJECTED` -> `APPROVED`
- `REMOVED` -> no further transitions in MVP

---

## 1) Auth

### 1.1 POST `/api/v1/auth/session/sync`
- **Business Purpose:** Upsert local user record from verified Firebase identity on login.
- **Authentication:** Required
- **Request Payload:**
```json
{
  "display_name": "optional string",
  "photo_url": "optional url"
}
```
- **Response Payload:**
  - `user`: user profile object
  - `is_new_user`: boolean
  - Returned inside standard success envelope:
```json
{
  "ok": true,
  "data": {
    "user": {},
    "is_new_user": false
  }
}
```
- **Validation Rules:**
  - `display_name` <= 128 chars.
  - `photo_url` <= 1024 chars (URL format if provided).
  - `firebase_uid` from token is immutable.
- **Error Responses:**
  - `401 unauthorized`
  - `422 validation_error`
  - `500 internal_error`

---

## 2) Users

### 2.1 GET `/api/v1/users/me`
- **Business Purpose:** Fetch current user profile for settings and profile pages.
- **Authentication:** Required
- **Request Payload:** None
- **Response Payload:**
  - `user`: profile object
  - Returned inside standard success envelope:
```json
{
  "ok": true,
  "data": {
    "user": {}
  }
}
```
- **Validation Rules:** Authenticated active user only.
- **Error Responses:** `401 unauthorized`, `403 forbidden`, `500 internal_error`

### 2.2 PATCH `/api/v1/users/me`
- **Business Purpose:** Update signed-in user profile fields.
- **Authentication:** Required
- **Request Payload:**
```json
{
  "username": "optional",
  "display_name": "optional",
  "photo_url": "optional"
}
```
- **Response Payload:**
  - `user`: updated profile object
  - Returned inside standard success envelope:
```json
{
  "ok": true,
  "data": {
    "user": {}
  }
}
```
- **Validation Rules:**
  - `username`: 3-64 chars, lowercase letters/digits/underscore only.
  - `display_name`: <= 128 chars.
  - `photo_url`: <= 1024 chars.
  - `username` must be unique if present.
  - `firebase_uid` cannot be modified.
- **Error Responses:**
  - `401 unauthorized`
  - `409 conflict` (username already taken)
  - `422 validation_error`
  - `500 internal_error`

### 2.3 GET `/api/v1/users/username-availability?username=tejas`
- **Business Purpose:** Validate username availability during onboarding/profile editing.
- **Authentication:** Required
- **Request Payload:** None (required query param `username`)
- **Response Payload:**
  - `username`, `available`
  - Returned inside standard success envelope:
```json
{
  "ok": true,
  "data": {
    "username": "alice_01",
    "available": true
  }
}
```
- **Validation Rules:**
  - `username` is required.
  - `username` length: 3-64 chars.
  - `username` format: lowercase letters (`a-z`), digits (`0-9`), underscore (`_`) only.
- **Error Responses:**
  - `401 unauthorized`
  - `422 validation_error`
  - `500 internal_error`

### 2.4 GET `/api/v1/users/{user_id}`
- **Business Purpose:** Fetch public user profile for trust context and report/account attribution.
- **Authentication:** Optional
- **Request Payload:** None
- **Response Payload:**
  - `user`: `{ id, username, display_name, photo_url, role, created_at }`
  - Returned inside standard success envelope:
```json
{
  "ok": true,
  "data": {
    "user": {}
  }
}
```
- **Validation Rules:**
  - `user_id` must be valid UUID.
  - Return public-safe fields only (no private identity/auth fields).
- **Error Responses:**
  - `404 not_found`
  - `422 validation_error`
  - `500 internal_error`

---

## 3) Accounts

### 3.1 POST `/api/v1/accounts`
- **Business Purpose:** Create a new dossier/account entity that can receive reports.
- **Authentication:** Required
- **Request Payload:**
```json
{
  "platform": "instagram",
  "handle": "target_handle",
  "display_name": "optional",
  "bio": "optional"
}
```
- **Response Payload:**
  - `account`: `{ id, platform, handle, display_name, bio, status, owner_user_id, created_at }`
  - Returned inside standard success envelope:
```json
{
  "ok": true,
  "data": {
    "account": {}
  }
}
```
- **Validation Rules:**
  - `platform` required, <= 32 chars.
  - `handle` required, <= 128 chars.
  - unique `(platform, handle)`.
  - `display_name` <= 256 chars.
  - `bio` <= 2000 chars.
- **Error Responses:**
  - `401 unauthorized`
  - `409 conflict` (duplicate platform+handle)
  - `422 validation_error`
  - `500 internal_error`

### 3.2 GET `/api/v1/accounts`
- **Business Purpose:** Browse dossier/accounts list for discovery and reporting entry.
- **Authentication:** Optional
- **Request Payload:** None (supports `platform`, `status`, `limit`, `cursor`)
- **Response Payload:**
  - Returned inside standard success envelope:
```json
{
  "ok": true,
  "data": {
    "items": [],
    "next_cursor": null
  }
}
```
- **Validation Rules:**
  - `status` filter limited to public-safe statuses for non-admin callers.
- **Error Responses:** `422 validation_error`, `500 internal_error`

### 3.3 GET `/api/v1/accounts/search`
- **Business Purpose:** Perform official account search flow for discovery-first MVP UX.
- **Authentication:** Optional
- **Request Payload:** None (query param `q`, optional `platform`, plus `limit`, `cursor`)
- **Response Payload:**
  - Returned inside standard success envelope:
```json
{
  "ok": true,
  "data": {
    "items": [],
    "next_cursor": null
  }
}
```
- **Validation Rules:**
  - `q` required, trimmed, 2-100 chars.
  - search matches normalized `handle` and `display_name`.
- **Error Responses:** `422 validation_error`, `429 rate_limited`, `500 internal_error`

### 3.4 GET `/api/v1/accounts/{account_id}`
- **Business Purpose:** Fetch detailed account/dossier view prior to reporting or review.
- **Authentication:** Optional
- **Request Payload:** None
- **Response Payload:**
  - `account` object including social links and aggregate report counters
  - Returned inside standard success envelope:
```json
{
  "ok": true,
  "data": {
    "account": {}
  }
}
```
- **Validation Rules:**
  - `account_id` must be valid UUID.
  - Removed/private fields filtered by caller role.
- **Error Responses:**
  - `404 not_found`
  - `422 validation_error`
  - `500 internal_error`

### 3.5 PATCH `/api/v1/accounts/{account_id}`
- **Business Purpose:** Allow owner/moderator-safe edits to mutable account profile fields.
- **Authentication:** Required
- **Request Payload:**
```json
{
  "display_name": "optional",
  "bio": "optional"
}
```
- **Response Payload:**
  - `account`: updated account object
  - Returned inside standard success envelope:
```json
{
  "ok": true,
  "data": {
    "account": {}
  }
}
```
- **Validation Rules:**
  - Caller must be owner or have role `MODERATOR`, `ADMIN`, or `SUPER_ADMIN`.
  - `display_name` <= 256 chars.
  - `bio` <= 2000 chars.
  - `platform` and `handle` immutable through this endpoint.
- **Error Responses:**
  - `401 unauthorized`
  - `403 forbidden`
  - `404 not_found`
  - `422 validation_error`
  - `500 internal_error`

### 3.6 GET `/api/v1/accounts/{account_id}/social-links`
- **Business Purpose:** Retrieve linked social profiles for credibility/context checks.
- **Authentication:** Optional
- **Request Payload:** None
- **Response Payload:**
  - `links`: array of `{ platform, url, is_verified }`
  - Returned inside standard success envelope:
```json
{
  "ok": true,
  "data": {
    "links": []
  }
}
```
- **Validation Rules:**
  - `platform` unique per account in persistence.
- **Error Responses:** `404 not_found`, `500 internal_error`

### 3.7 POST `/api/v1/accounts/{account_id}/social-links`
- **Business Purpose:** Add or update social proof links for an account.
- **Authentication:** Required
- **Request Payload:**
```json
{
  "platform": "youtube",
  "url": "https://example.com/channel/xyz",
  "is_verified": false
}
```
- **Response Payload:**
  - `link`: `{ platform, url, is_verified }`
  - Returned inside standard success envelope:
```json
{
  "ok": true,
  "data": {
    "link": {}
  }
}
```
- **Validation Rules:**
  - Caller must be owner or have role `MODERATOR`, `ADMIN`, or `SUPER_ADMIN`.
  - `platform` <= 32 chars.
  - `url` valid format, <= 1024 chars.
  - upsert semantics on `(account_id, platform)`.
- **Error Responses:**
  - `401 unauthorized`
  - `403 forbidden`
  - `404 not_found`
  - `422 validation_error`
  - `500 internal_error`

---

## 4) Reports

### 4.1 POST `/api/v1/reports`
- **Business Purpose:** Submit a new report against an account.
- **Authentication:** Required
- **Request Payload:**
```json
{
  "account_id": "uuid",
  "title": "Short summary",
  "description": "Detailed narrative",
  "media": [
    {
      "media_type": "image",
      "url": "https://example.com/evidence.jpg",
      "thumbnail_url": "optional"
    }
  ]
}
```
- **Response Payload:**
  - `report`: `{ id, account_id, reporter_user_id, status, title, description, created_at }`
  - Returned inside standard success envelope:
```json
{
  "ok": true,
  "data": {
    "report": {}
  }
}
```
- **Validation Rules:**
  - `account_id` must exist.
  - `title` required, <= 255 chars.
  - `description` required.
  - media `url` <= 1024 chars and valid URL.
  - rate limit and duplicate/cooldown checks may apply.
- **Error Responses:**
  - `401 unauthorized`
  - `404 not_found` (account not found)
  - `409 conflict` (cooldown/duplicate policy)
  - `422 validation_error`
  - `429 rate_limited`
  - `500 internal_error`

### 4.2 GET `/api/v1/reports`
- **Business Purpose:** List reports for discovery/review contexts.
- **Authentication:** Optional (restricted results for unauthenticated users)
- **Request Payload:** None (query: `account_id`, `status`, `limit`, `cursor`)
- **Response Payload:**
  - Returned inside standard success envelope:
```json
{
  "ok": true,
  "data": {
    "items": [],
    "next_cursor": null
  }
}
```
- **Validation Rules:**
  - non-admin callers can only view publicly visible statuses.
- **Error Responses:** `422 validation_error`, `500 internal_error`

### 4.3 GET `/api/v1/reports/{report_id}`
- **Business Purpose:** Fetch detailed report information for review or dispute context.
- **Authentication:** Optional
- **Request Payload:** None
- **Response Payload:**
  - `report` detail object with media and interaction aggregates
  - Returned inside standard success envelope:
```json
{
  "ok": true,
  "data": {
    "report": {}
  }
}
```
- **Validation Rules:**
  - report visibility filtered by caller role and report status.
- **Error Responses:**
  - `404 not_found`
  - `403 forbidden` (sealed/private report)
  - `422 validation_error`
  - `500 internal_error`

### 4.4 POST `/api/v1/reports/{report_id}/votes`
- **Business Purpose:** Record community alignment/opposition signal on a report.
- **Authentication:** Required
- **Request Payload:**
```json
{
  "vote_type": "ALIGN"
}
```
- **Response Payload:**
  - `vote`: `{ report_id, user_id, vote_type }`
  - `aggregates`: `{ align_count, oppose_count }`
  - Returned inside standard success envelope:
```json
{
  "ok": true,
  "data": {
    "vote": {},
    "aggregates": {}
  }
}
```
- **Validation Rules:**
  - `vote_type` in `VoteType` (`ALIGN`, `OPPOSE`).
  - exactly one vote per user per report (upsert update allowed).
- **Error Responses:**
  - `401 unauthorized`
  - `404 not_found`
  - `422 validation_error`
  - `500 internal_error`

### 4.5 POST `/api/v1/reports/{report_id}/comments`
- **Business Purpose:** Add user context and supporting narrative to a report thread.
- **Authentication:** Required
- **Request Payload:**
```json
{
  "body": "comment text"
}
```
- **Response Payload:**
  - `comment`: `{ id, report_id, user_id, body, created_at }`
  - Returned inside standard success envelope:
```json
{
  "ok": true,
  "data": {
    "comment": {}
  }
}
```
- **Validation Rules:**
  - `body` required and non-empty.
- **Error Responses:**
  - `401 unauthorized`
  - `404 not_found`
  - `422 validation_error`
  - `500 internal_error`

### 4.6 GET `/api/v1/reports/{report_id}/comments`
- **Business Purpose:** Read report discussion thread.
- **Authentication:** Optional
- **Request Payload:** None (`limit`, `cursor`)
- **Response Payload:**
  - Returned inside standard success envelope:
```json
{
  "ok": true,
  "data": {
    "items": [],
    "next_cursor": null
  }
}
```
- **Validation Rules:** UUID validation and pagination bounds.
- **Error Responses:** `404 not_found`, `422 validation_error`, `500 internal_error`

### 4.7 POST `/api/v1/reports/{report_id}/moderation-request`
- **Business Purpose:** Allow reporter/eligible actor to request moderator review escalation.
- **Authentication:** Required
- **Request Payload:**
```json
{
  "reason": "optional text",
  "evidence_url": "optional url"
}
```
- **Response Payload:**
  - `queued`: boolean
  - `report_status`: current status
  - Returned inside standard success envelope:
```json
{
  "ok": true,
  "data": {
    "queued": true,
    "report_status": "PENDING"
  }
}
```
- **Validation Rules:**
  - report must be in escalation-eligible state.
  - `evidence_url` valid URL if provided.
- **Error Responses:**
  - `401 unauthorized`
  - `403 forbidden`
  - `404 not_found`
  - `409 conflict` (invalid state transition)
  - `422 validation_error`
  - `500 internal_error`

### 4.8 POST `/api/v1/reports/{report_id}/moderate`
- **Business Purpose:** Apply moderator/admin decision to finalize report status.
- **Authentication:** Required (role: `MODERATOR|ADMIN|SUPER_ADMIN`)
- **Request Payload:**
```json
{
  "decision": "APPROVED",
  "note": "optional rationale"
}
```
- **Response Payload:**
  - `report`: updated report object
  - Returned inside standard success envelope:
```json
{
  "ok": true,
  "data": {
    "report": {}
  }
}
```
- **Validation Rules:**
  - `decision` in `ReportStatus` (`APPROVED`, `REJECTED`, `REMOVED`).
  - transition allowed only per `Report Status Transitions` section.
  - must set `reviewed_by` and `reviewed_at`.
- **Error Responses:**
  - `401 unauthorized`
  - `403 forbidden`
  - `404 not_found`
  - `409 conflict` (invalid transition)
  - `422 validation_error`
  - `500 internal_error`

### 4.9 GET `/api/v1/reports/moderation-queue`
- **Business Purpose:** Provide moderators with prioritized review queue.
- **Authentication:** Required (role: `MODERATOR`, `ADMIN`, or `SUPER_ADMIN`)
- **Request Payload:** None (query: `status`, `platform`, `sort`, `limit`, `cursor`)
- **Response Payload:**
  - Returned inside standard success envelope:
```json
{
  "ok": true,
  "data": {
    "items": [],
    "next_cursor": null
  }
}
```
- **Validation Rules:**
  - role-gated access only.
  - filters validated against allowed enum/sort values.
- **Error Responses:**
  - `401 unauthorized`
  - `403 forbidden`
  - `422 validation_error`
  - `500 internal_error`

### 4.10 POST `/api/v1/reports/{report_id}/bookmark`
- **Business Purpose:** Toggle the current user's bookmark on a report (create if absent, remove if present).
- **Authentication:** Required
- **Request Payload:** None
- **Response Payload:**
  - Returned inside standard success envelope:
```json
{
  "ok": true,
  "data": {
    "bookmarked": true
  }
}
```
  - `bookmarked` reflects the state **after** the toggle.
- **Validation Rules:**
  - idempotent per user/report pair: repeat calls alternate the bookmark state.
- **Error Responses:**
  - `401 unauthorized`
  - `500 internal_error`
- **Related:** `GET /api/v1/me/bookmarks` returns the user's bookmarked reports.

---

## Day 4 additions (cron, admin stats, momentum fields)

### Cron — weekly momentum

#### POST `/api/v1/cron/weekly-momentum`
- **Auth:** `Authorization: Bearer <CRON_TOKEN>` (non-empty) **or** Firebase admin (`ADMIN` / `SUPER_ADMIN`)
- **Response:** `{ "ok": true, "data": { "accounts_updated": N, "run_at": "<iso>" } }`
- **Behavior:** For each account, loads ledger entries, calls `sum_deltas_by_age`, persists `w1_delta`, `w2_delta`, `w3_delta`, `momentum_updated_at`. Buckets match scoring engine (W1≤7d, W2=8–30d, W3>30d).

#### GET `/api/v1/cron/weekly-momentum`
- **Auth:** Same as POST
- **Response:** `{ "ok": true, "data": { "last_run_at": "<iso>|null", "accounts_with_momentum": N, "engine": "v2" } }`

### Admin stats extensions — GET `/api/v1/admin/stats`

Additional top-level fields (existing fields unchanged):
- `filings_last_7` (integer) — reports with `created_at` in last 7 days
- `ai_agreement_rate` (float 0–1 or `null`) — not yet tracked; returns `null`

### List/deck momentum aliases

- `GET /api/v1/accounts/` — each item includes `weekly_delta` (from persisted `w1_delta`, nullable until cron runs)
- `GET /api/v1/people/deck` — each item includes `week_delta` (from persisted `w1_delta`)

### Global rank — POST `/api/v1/me/score/replay`

Each `account_results[]` entry includes `global_rank` (1 + count of active accounts with higher score).

---

## Day 6 additions (feed, profile, audit, claims)

### GET `/api/v1/me/swipe-aggregate`
- **Auth:** Required (Firebase Bearer)
- **Response:** `{ "ok": true, "data": { "score": float, "aligns": int, "opposes": int } }`
- **Behavior:** Read-only aggregate over `swipe_records` for the current user (`SUM(delta)`, counts by `SwipeDirection`).

### GET `/api/v1/feed` (extended)
- **Query params:** existing `limit`, `cursor`, `platform` plus `filter` = `all` | `following` | `near` | `top` (default `all`)
- **Auth:** Optional for `all` and `top`; **required** for `following` and `near` (401 if missing)
- **Response items:** `FeedReportOut` extends `ReportOut` with `align_count`, `oppose_count`, `comment_count`, `viewer_vote` (nullable)
- **Response envelope:** `{ items, next_cursor, empty_reason? }` — `empty_reason: "insufficient_location_data"` when `filter=near` and viewer has no `city`
- **Filter semantics:**
  - `following` — `reporter_user_id IN (SELECT following_id FROM user_follows WHERE follower_id = :me)` (user-follow → reporter; not account/dossier subscribe)
  - `near` — inner join reporter `users`; `lower(trim(reporter.city)) = lower(trim(viewer.city))`
  - `top` — order by `abs(base_score) DESC NULLS LAST`, then `created_at DESC`
- **Aggregates:** Batch GROUP BY queries per page (not N+1 per report)

### POST `/api/v1/accounts/{account_id}/audit`
- **Auth:** Required
- **Body:** `{ "reason": string }` (1–2000 chars)
- **Response:** `{ "audit_request_id": uuid, "status": "PENDING" }`
- **Behavior:** Creates `audit_requests` row; service-layer dedupe blocks open `(user_id, account_id)` pairs (409). No notification (not in BUSINESS_RULES).

### User profile counts — GET `/api/v1/users/me`, GET `/api/v1/users/{user_id}`
- **Additional fields on `UserPublic` / `UserPrivate`:** `followers_count`, `following_count` (from `user_follows`)

### Claims evidence (frontend)
- `ClaimProfileModal` uploads via `POST /api/v1/media/upload`; stores HTTPS URLs in `claim_requests.evidence_payload` JSONB (no schema change).

---

## Out of Scope for This Phase

The following modules are intentionally excluded from this document revision and will be added in later phases:
- Notifications (Phase 2)
- Claims (Phase 2)
- Disputes (Phase 2)
- Admin (Phase 3)
- Social graph workflows (`follow` / `connections`) are deferred to a later phase.
- Backend logout endpoint is excluded for MVP because Firebase sign-out is client-side without server session state.

This keeps MVP contract review tight and avoids accidental legacy feature parity.
