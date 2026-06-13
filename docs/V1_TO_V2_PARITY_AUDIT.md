# V1 to V2 parity audit tasks
_Exported on 6/12/2026 at 11:38:12 GMT+5:30 from Cursor (3.7.27)_

> **In-repo copy.** Canonical parity plan for Shosha V2. Live progress: [PARITY_STATUS.md](./PARITY_STATUS.md) · Day-by-day checklist: [PHASE_2_PLAN.md](./PHASE_2_PLAN.md).
>
> ### 8-day plan execution status (June 2026)
>
> | Audit day | Phase 2 | Status | Notes |
> |-----------|---------|--------|-------|
> | Day 1 — Onboarding fields | Day 20 | **Done** | 23/24 fields (`region` not in onboard UI) |
> | Day 2 — Scoring / adjudicate | Day 21–22 | **Partial** | Adjudicate + score history/windows done; `profile_multipliers_from_user()` open |
> | Day 3 — Notifications + bookmarks | Day 23 | **Done** | 15/15 triggers; bookmark toggle wired |
> | Day 4 — Cron + ranks | Day 27 | **Done** | Weekly-momentum cron; leaderboard/ranks/impact partial UI |
> | Day 5 — Admin completion | Day 28 | **Partial** | Evidence scan + data CRUD still stubbed |
> | Day 6 — Feed, people, audit, claims | Day 24–26, 28–29 | **Mostly done** | Feed filters/aggregates, swipe aggregate, follower counts, audit, claims S3; **dossier-unfollow deferred** |
> | Day 7 — Polish + cleanup | Day 30–31 | **Open** | PDF export, bubble crop, billing, orphans, proxy-image path |
> | Day 8 — Sign-off | Day 31 | **Open** | Full parity verification pass |

---

**User**

Read-only audit. No edits. No git commands. No .env reads. No alembic commands.

V2 target: C:\Others\project\Builtattic\shosha
V1 reference (read-only): C:\Others\project\Builtattic\Shoshaaahhh

---

## Context

Days 1-19 of the V1→V2 parity sprint are complete. We need a full
"distance to V1 parity" audit — a single source of truth covering
backend, frontend, admin, onboarding, and all accumulated TODO/stub
markers from previous days. Output should be a prioritized gap list,
not a narrative.

---

## Task 1 — Page-by-page parity matrix

For every route in V1 (`Shoshaaahhh/src/app/**/page.tsx` and
`Shoshaaahhh/src/app/(app)/**`), find the corresponding V2 route in
`shosha/frontend/src/routes/index.tsx`.

Report a table:

| V1 route | V1 page file | V2 route | V2 page file | Status (FULL / PARTIAL / MISSING / V2-ONLY-NEW) | Gap notes |

"PARTIAL" = page exists but is missing sections, uses placeholder data,
or has reduced functionality vs V1. Be specific about what's missing
(e.g. "no range selector", "no PDF export", "credibility formula is a proxy").

Also list any V2 routes that have NO V1 equivalent (new features:
bubbles, disputes, claims, admin queue, leaderboard, etc.) — just list
them, no gap analysis needed for these.

---

## Task 2 — TODO / FIXME / stub inventory

Search the ENTIRE `shosha/` repo (frontend + backend, excluding
node_modules, .git, dist, build) for these markers:

- `// TODO`
- `# TODO`
- `// FIXME`
- `# FIXME`
- `TODO:`
- `not implemented`
- `coming soon`
- `Coming soon`
- `placeholder`
- `Placeholder`
- `mock` / `Mock` (only where it indicates incomplete real functionality,
  not test mocks)
- `stub`

For each match, report:

| File:Line | Marker text | What it's blocking (1 sentence, infer from surrounding code) | Category (Backend / Frontend / Admin / Onboarding / Other) |

Group the final list by category at the end with counts per category.

---

## Task 3 — API endpoint parity (V1 vs V2)

### 3a — V2 endpoint inventory
Open `backend/app/api/v1/router.py` and every router file under
`backend/app/api/v1/`. List EVERY endpoint:

| Method | Path | Router file | Implemented (full body, not NotImplementedError/pass)? |

### 3b — V1 endpoint/API-route inventory
V1 is Next.js — find all API routes under
`Shoshaaahhh/src/app/api/**/route.ts` (or `.js`). For each, list:

| Method | Path | File | Purpose (1 sentence) |

### 3c — Gap analysis
Cross-reference 3a and 3b. Report:
- V1 API routes with NO V2 equivalent (feature gap)
- V2 endpoints that exist but return stub/empty data (check for
  `return []`, `return {}`, hardcoded values, or comments saying so)
- Frontend API client functions in `frontend/src/api/*.ts` that call
  endpoints NOT present in 3a (would 404 against real backend)

---

## Task 4 — Admin panel parity

V1 admin: search `Shoshaaahhh/src/app/(app)/admin/**` and any admin
components under `Shoshaaahhh/src/components/admin/**`.

V2 admin: search `shosha/frontend/src/pages/admin/**` and
`shosha/frontend/src/components/admin/**`, plus
`backend/app/api/v1/admin.py` (39 endpoints per Day 19 audit).

Report a table:

| V1 admin feature | V1 file | V2 equivalent | V2 file | Status (FULL/PARTIAL/MISSING) | Notes |

Cover at minimum: moderation queue, report review/decision, user
management, account management, claims review, dispute review,
analytics/dashboard charts, audit log / admin actions log, role
management, bubble moderation (if V1 has it), content flagging.

---

## Task 5 — Onboarding field parity

V1 onboarding: read `Shoshaaahhh/src/app/(app)/onboard/page.tsx` fully.
List EVERY field collected in the form (including credibility/profile
fields like occupationRole, education, phone, dob, country, social URLs,
etc.) — full list, not a sample.

V2: read `frontend/src/pages/Onboard.tsx` and
`backend/app/schemas/user.py` (`UserUpdateRequest`, `UserPrivate`).

For each V1 field report:

| V1 field | Collected in V2 form? | Sent to V2 backend? | Backend schema supports it? | Status |

Also check: does V1 use these fields anywhere downstream (credibility
score calculation, profile display, search/filter)? If V2 doesn't
collect/store them, what V2 features are degraded as a result
(cross-reference with Task 1's "credibility proxy formula" gap from
Day 18)?

---

## Task 6 — Auth & session parity

Compare V1 vs V2 for:
- Sign-in providers (Google only, or also email/phone? check
  `Shoshaaahhh/src/app/(auth)/**` or sign-in page)
- Session sync endpoint behavior (`/auth/session` in V2 — what does it
  set/return vs V1's equivalent)
- Logout flow
- Password reset / account deletion (V1 has these? V2?)

Report as a short table: Feature | V1 | V2 | Status

---

## Task 7 — Background jobs / cron parity

V1: search for any cron jobs, scheduled functions, or background
workers (e.g. Vercel cron, `Shoshaaahhh/src/app/api/cron/**`,
score decay jobs, weekly momentum, notification digests).

V2: search `backend/app/` for any scheduler setup, cron endpoints
(`/cron/*`), or background task definitions (Celery, APScheduler, etc.)

Report: | Job name | V1 implementation | V2 implementation | Status |

(This connects to the Day 19 stretch goal: `POST /cron/weekly-momentum`
— confirm if it exists yet.)

---

## Task 8 — Notifications trigger coverage

V1: find every place a notification is created (search for notification
creation calls across the V1 codebase — comments, replies, follows,
report status changes, claim decisions, dispute updates, bubble
invites, etc.) — list all trigger types found.

V2: search `backend/` for notification creation calls (likely a
`notification_service.create(...)` or repository insert). List all
trigger types found in V2.

Report: | Notification trigger type | In V1? | In V2? | Status |

---

## Task 9 — Score / scoring engine parity

V1: read scoring logic (likely `Shoshaaahhh/src/lib/scoring*` or
similar — search for `calcShoshaScore`, `calcProfileScores`,
window scores W1/W2/W3, decay logic).

V2: read `backend/app/` scoring service/logic and
`frontend/src/lib/scoringIndex` (referenced in Day 19 audit).

Report:
- Does V2 backend implement the W1/W2/W3 windowed scoring + decay
  formula from V1, or only a simplified/proxy version?
- Is `/accounts/{id}/score-windows` (referenced as a future endpoint
  in Day 18 TODOs) implemented?
- Is `/accounts/{id}/score-history` (referenced in Day 18 TODOs)
  implemented?
- List every place in V2 frontend with a `// TODO` related to scoring
  (cross-reference Task 2).

---

## Task 10 — Summary scorecard

Produce a final summary table:

| Area | Total items (V1 baseline) | Done in V2 | Partial | Missing | % Complete |
|------|---------------------------|------------|---------|---------|------------|
| Pages/Routes | | | | | |
| API Endpoints | | | | | |
| Admin Features | | | | | |
| Onboarding Fields | | | | | |
| Notification Triggers | | | | | |
| Background Jobs | | | | | |
| Scoring Engine Components | | | | | |

Then a final prioritized punch list (P0/P1/P2) of remaining work,
ordered by: (1) things that block core user flows, (2) things with
existing TODOs already acknowledging the gap, (3) nice-to-have V1
parity items.

---

## Output format

Be exhaustive — this is the master gap-tracking document going forward.
Use the exact table formats specified per task. If a directory/file
referenced doesn't exist, say so explicitly rather than skipping.
Do not estimate or guess line numbers — cite actual file:line from
grep/search results.

---

**Cursor**

I'll run a read-only sweep of both codebases—routes, APIs, TODOs, admin, onboarding, auth, jobs, notifications, and scoring—and compile the gap matrix from what we find.


# V1→V2 Parity Audit (Days 1–19)

Master gap-tracking document. V1 reference: `C:\Others\project\Builtattic\Shoshaaahhh`. V2 target: `C:\Others\project\Builtattic\shosha`.

---

## Task 1 — Page-by-page parity matrix

| V1 route | V1 page file | V2 route | V2 page file | Status | Gap notes |
|----------|--------------|----------|--------------|--------|-----------|
| `/` | `(public)/page.tsx` | `/` | `pages/Landing.tsx` | FULL | — |
| `/how-it-works` | `(public)/how-it-works/page.tsx` | `/how-it-works` | `pages/HowItWorks.tsx` | FULL | — |
| `/leaderboard` | `(public)/leaderboard/page.tsx` | `/leaderboard` | `pages/Leaderboard.tsx` | PARTIAL | No weekly delta from score history; V1 computes `weeklyDelta()` from `scoreHistory` |
| `/report-issue` | `(public)/report-issue/page.tsx` | `/report-issue` | `pages/ReportIssue.tsx` | FULL | — |
| `/trust-badge` | `(public)/trust-badge/page.tsx` | `/trust-badge` | `pages/TrustBadge.tsx` | FULL | — |
| `/profile/[id]` | `(public)/profile/[id]/page.tsx` | `/profile/:id` | `pages/PublicProfile.tsx` | PARTIAL | Credibility/onboarding fields not in backend; follower counts not wired |
| `/[slug]` | `(public)/[slug]/page.tsx` | `/:slug` | `pages/SlugPage.tsx` | FULL | — |
| `/sign-in` | `(auth)/sign-in/page.tsx` | `/sign-in` | `pages/SignIn.tsx` | PARTIAL | V2 adds phone/OTP; V1 is email + Google only |
| `/sign-up` | `(auth)/sign-up/page.tsx` | `/sign-up` → redirect | `routes/index.tsx` | FULL | V2 redirects to `/sign-in` |
| `/onboard` | `onboard/page.tsx` | `/onboard` | `pages/Onboard.tsx` | PARTIAL | Form collects all V1 fields; only subset sent to backend (Task 5); no live username availability API wired |
| `/dashboard` | `(app)/dashboard/page.tsx` | `/dashboard` | `pages/Dashboard.tsx` | PARTIAL | Credibility is score proxy (`Dashboard.tsx:138`); Following/Near You feeds stubbed; no `shosha:score-updated` live refresh |
| `/feed` | `(app)/feed/page.tsx` | `/feed` | `pages/Feed.tsx` | PARTIAL | Following/Near You tabs show "coming soon"; vote aggregates not enriched (`api/feed.ts:25`) |
| `/profile` | `(app)/profile/page.tsx` | `/profile` | `pages/Profile.tsx` | PARTIAL | Follower counts TODO (`Profile.tsx:147`); credibility proxy |
| `/profile/edit` | `(app)/profile/edit/page.tsx` | `/profile/edit` | `pages/EditProfile.tsx` | PARTIAL | Only basic fields; banner "More profile fields coming soon" (`EditProfile.tsx:189`) |
| `/profile/upgrade` | `(app)/profile/upgrade/page.tsx` | `/profile/upgrade` | `pages/ProfileUpgrade.tsx` | FULL | Razorpay order/verify wired |
| `/account/[id]` | `(app)/account/[id]/page.tsx` | `/accounts/:id` | `pages/AccountDetail.tsx` | PARTIAL | No `windowScores` from API; score history TODO (`AccountDetail.tsx:265`); audit action not wired; followers/credibility missing in score panel |
| `/people` | `(app)/people/page.tsx` | `/people` | `pages/People.tsx` | PARTIAL | Swipe endpoint path changed to `/people/deck/{id}/swipe`; `/me/swipe-aggregate` missing |
| `/search` | `(app)/search/page.tsx` | `/search` | `pages/Search.tsx` | FULL | — |
| `/notifications` | `(app)/notifications/page.tsx` | `/notifications` | `pages/Notifications.tsx` | FULL | — |
| `/bookmarks` | `(app)/bookmarks/page.tsx` | `/bookmarks` | `pages/Bookmarks.tsx` | PARTIAL | GET bookmarks works; toggle bookmark in feed not wired (`FeedItem.tsx:254`) |
| `/disputes` | `(app)/disputes/page.tsx` | `/disputes` | `pages/Disputes.tsx` | FULL | — |
| `/impact` | `(app)/impact/page.tsx` | `/impact` | `pages/Impact.tsx` | PARTIAL | "Global rank — coming soon" (`Impact.tsx:162`); analytics range selector TODO |
| `/ranks` | `(app)/ranks/page.tsx` | `/ranks` | `pages/Ranks.tsx` | PARTIAL | No region filter; no "Under Fire" weekly_delta (`Ranks.tsx:36,122`) |
| `/access` | `(app)/access/page.tsx` | `/access` | `pages/Access.tsx` | FULL | — |
| `/settings` | `(app)/settings/page.tsx` | `/settings` | `pages/Settings.tsx` | PARTIAL | Deletion request lacks attachment upload flow V1 has; notification prefs are localStorage-only |
| `/bubbles` | `(app)/bubbles/page.tsx` | `/bubbles` | `pages/Bubbles.tsx` | FULL | — |
| `/bubbles/[id]` | `(app)/bubbles/[id]/page.tsx` | `/bubbles/:id` | `pages/BubbleDetail.tsx` | FULL | — |
| `/bubbles/create` | `(app)/bubbles/create/page.tsx` | `/bubbles/new` | `pages/BubbleNew.tsx` | PARTIAL | Bubble image crop modal TODO (`CreateBubbleFlow.tsx:66`) |
| `/bubble` | `(app)/bubble/page.tsx` | — | redirect only in V1 | FULL | V1 redirects to `/bubbles`; no V2 route needed |
| `/post/[id]` | `(app)/post/[id]/page.tsx` | `/reports/:id` | `pages/ReportDetail.tsx` | FULL | Via `PostRedirect` in routes |
| `/legal-policies` | `(app)/legal-policies/page.tsx` | `/legal-policies` | `pages/legal/LegalHub.tsx` | FULL | — |
| `/legal-policies/legal/*` (6 pages) | `(app)/legal-policies/legal/*/page.tsx` | `/legal-policies/:section/:slug` | `pages/legal/LegalPage.tsx` | FULL | Single dynamic route covers all |
| `/legal-policies/trust-safety/*` (5 pages) | `(app)/legal-policies/trust-safety/*/page.tsx` | `/legal-policies/:section/:slug` | `pages/legal/LegalPage.tsx` | FULL | — |
| `/admin` | `(app)/admin/page.tsx` | `/admin` | `pages/admin/AdminDashboard.tsx` | PARTIAL | Charts/time-series stubbed; `filingsLast7`/`aiAgreementRate` hardcoded 0 |
| `/admin/queue` | `(app)/admin/queue/page.tsx` | `/admin/queue` | `pages/admin/AdminQueue.tsx` | PARTIAL | Admin review scoring fields not sent (`AdminReviewControls.tsx:69`) |
| `/admin/moderation` | `(app)/admin/moderation/page.tsx` | `/admin/moderation` | `pages/admin/AdminModeration.tsx` | FULL | — |
| `/admin/review/[reportId]` | `(app)/admin/review/[reportId]/page.tsx` | `/admin/review/:reportId` | `pages/admin/AdminReview.tsx` | PARTIAL | Same adjudicate/scoring-field gap as queue |
| `/admin/claims` | `(app)/admin/claims/page.tsx` | `/admin/claims` | `pages/admin/AdminClaims.tsx` | FULL | — |
| `/admin/disputes` | `(app)/admin/disputes/page.tsx` | `/admin/disputes` | `pages/admin/AdminDisputes.tsx` | FULL | — |
| `/admin/evidence` | `(app)/admin/evidence/page.tsx` | `/admin/evidence` | `pages/admin/AdminEvidence.tsx` | PARTIAL | Backend scan stubbed (`admin.py:496-507`); UI warns (`AdminEvidence.tsx:121`) |
| `/admin/audits` | `(app)/admin/audits/page.tsx` | `/admin/audits` | `pages/admin/AdminAudits.tsx` | FULL | — |
| `/admin/abuse` | `(app)/admin/abuse/page.tsx` | `/admin/abuse` | `pages/admin/AdminAbuse.tsx` | FULL | — |
| `/admin/users` | `(app)/admin/users/page.tsx` | `/admin/users` | `pages/admin/AdminUsers.tsx` | PARTIAL | Role edit UI exists; limited `UserUpdateRequest` fields (`AdminUsers.tsx:212`) |
| `/admin/accounts` | `(app)/admin/accounts/page.tsx` | `/admin/accounts` | `pages/admin/AdminAccounts.tsx` | PARTIAL | Limited account patch fields (`AdminAccounts.tsx:273`) |
| `/admin/deletion-requests` | `(app)/admin/deletion-requests/page.tsx` | `/admin/deletion-requests` | `pages/admin/AdminDeletionRequests.tsx` | FULL | — |
| `/admin/trust-badge` | `(app)/admin/trust-badge/page.tsx` | `/admin/trust-badge` | `pages/admin/AdminTrustBadge.tsx` | FULL | — |
| `/admin/issues` | `(app)/admin/issues/page.tsx` | `/admin/issues` | `pages/admin/AdminIssues.tsx` | FULL | — |
| `/admin/activity` | `(app)/admin/activity/page.tsx` | `/admin/activity` | `pages/admin/AdminActivity.tsx` | PARTIAL | Actor IDs not resolved to usernames (`AdminActivity.tsx:78`) |
| `/admin/settings` | `(app)/admin/settings/page.tsx` | `/admin/settings` | `pages/admin/AdminSettings.tsx` | FULL | — |
| `/admin/data` | `(app)/admin/data/page.tsx` | `/admin/data` | `pages/admin/AdminData.tsx` | PARTIAL | Collection browser links to dedicated pages; generic CRUD not implemented (backend returns `not_implemented`) |
| `/admin/create` | `(app)/admin/create/page.tsx` | `/admin/create` | `pages/admin/AdminCreate.tsx` | FULL | — |
| `/admin/feed` | `(app)/admin/feed/page.tsx` | `/admin/feed` | `pages/admin/AdminFeed.tsx` | FULL | — |

### V2-only routes (no V1 equivalent)

| V2 route | V2 page file |
|----------|--------------|
| `/accounts` | `pages/Accounts.tsx` |
| `/accounts/search` | `pages/AccountSearch.tsx` |
| `/accounts/new` | `pages/AccountNew.tsx` |
| `/reports/new` | `pages/ReportNew.tsx` |
| `/billing` | `pages/Billing.tsx` (placeholder stub) |
| `/account/:id` | redirect → `/accounts/:id` |
| `/subscribe` | redirect → `/profile/upgrade` |
| `/login`, `/onboarding`, `/ranking` | redirects only |

### Orphan V2 files (not routed; legacy placeholders)

| File | Note |
|------|------|
| `pages/Login.tsx:5` | "[Placeholder — coming soon]" |
| `pages/Onboarding.tsx:5` | "[Placeholder — coming soon]" |
| `pages/Subscribe.tsx:5` | "[Placeholder — coming soon]" |
| `pages/Admin.tsx` | Not in `routes/index.tsx` |

---

## Task 2 — TODO / FIXME / stub inventory

Excludes UI `placeholder=` props, avatar fallbacks, and test mock infrastructure unless indicating incomplete real functionality.

| File:Line | Marker text | What it's blocking | Category |
|-----------|-------------|-------------------|----------|
| `frontend/src/pages/Onboard.tsx:424` | `// TODO: send credibility fields (occupationRole, education, etc.)` | Onboarding credibility data never persisted; breaks downstream scoring/credibility | Onboarding |
| `frontend/src/pages/Dashboard.tsx:138` | `// TODO: restore full credibility formula when onboarding fields are in UserPrivate` | Dashboard credibility ring uses score/10000 proxy | Frontend |
| `frontend/src/pages/Dashboard.tsx:465-474` | "Following feed coming soon" / "Near You feed coming soon" | Two of three feed tabs non-functional | Frontend |
| `frontend/src/pages/Feed.tsx:175-185` | "Following feed coming soon" / "Near You feed coming soon" | Same feed tab gaps | Frontend |
| `frontend/src/lib/feed.ts:10` | `// TODO: filter by followed accounts when follow graph is available in feed` | Following feed cannot filter | Frontend |
| `frontend/src/lib/feed.ts:13` | `// TODO: filter by location when location data is available in feed` | Near You feed cannot filter | Frontend |
| `frontend/src/api/feed.ts:25` | `// TODO: enrich feed with vote aggregates when backend exposes them` | Feed cards missing vote summary enrichment | Frontend |
| `frontend/src/components/feed/FeedItem.tsx:254` | `// TODO: bookmark API when backend exposes report bookmarks` | Bookmark toggle is local-only; `report_bookmark_service` exists but no API route | Frontend |
| `frontend/src/pages/EditProfile.tsx:189` | "More profile fields coming soon." | Cannot edit credibility/social fields post-onboarding | Frontend |
| `frontend/src/pages/Profile.tsx:147` | `// TODO: wire follower counts when available` | Profile header missing follower stats | Frontend |
| `frontend/src/components/profile/LiveAccountScorePanel.tsx:85` | `// TODO: add followers + credibility when backend exposes them` | Account score panel incomplete | Frontend |
| `frontend/src/pages/AccountDetail.tsx:265` | `// TODO: wire history[] when /accounts/{id}/score-history endpoint exists` | Score history ledger empty | Frontend |
| `frontend/src/components/profile/DossierActions.tsx:43` | `// TODO: wire POST /accounts/{id}/audit when user-facing audit endpoint exists` | User-initiated account audit blocked | Frontend |
| `frontend/src/components/profile/ClaimProfileModal.tsx:71` | `// TODO: replace with uploadMedia (S3) when wiring evidence file upload` | Claim evidence uses `URL.createObjectURL` mock (`:74`) | Frontend |
| `frontend/src/components/profile/SwipeScoreBreakdownCard.tsx:31` | `// TODO: wire /me/swipe-aggregate when endpoint exists` | People swipe score breakdown empty | Frontend |
| `frontend/src/components/profile/ProfileImpactAnalytics.tsx:122` | `// TODO: add range selector (1D / 1W / 1M)` | Impact chart has no time range | Frontend |
| `frontend/src/components/profile/ShareCardModal.tsx:70` | `// TODO: add PDF export when jspdf is installed` | Share card PDF export missing | Frontend |
| `frontend/src/components/profile/AccountShareButton.tsx:52` | `// TODO: add PDF export when jspdf is installed` | Same PDF gap | Frontend |
| `frontend/src/pages/Ranks.tsx:36` | `// TODO: add region filtering when available` | Ranks page has no region filter | Frontend |
| `frontend/src/pages/Ranks.tsx:122` | `// TODO: add Under Fire when weekly_delta is available in list endpoint` | "Under Fire" section missing | Frontend |
| `frontend/src/pages/Impact.tsx:162` | "Global rank — coming soon" | Impact global rank not implemented | Frontend |
| `frontend/src/components/bubbles/CreateBubbleFlow.tsx:66` | `// TODO: add crop modal` | Bubble cover image crop missing | Frontend |
| `frontend/src/components/admin/AdminReviewControls.tsx:69` | `// TODO: send scoring fields when backend adjudicate endpoint is added` | Admin cannot send deed/baseScore/intent/circumstances on moderate | Admin |
| `frontend/src/pages/admin/AdminDashboard.tsx:53` | `// TODO: wire filingsLast7 when backend exposes it` | Admin dashboard stat hardcoded 0 | Admin |
| `frontend/src/pages/admin/AdminDashboard.tsx:96` | `// TODO: aiAgreementRate when backend exposes it` | AI agreement rate hardcoded 0% | Admin |
| `frontend/src/pages/admin/AdminDashboard.tsx:120` | `// TODO: wire real time-series data when backend exposes it` | Dashboard charts empty/stub | Admin |
| `frontend/src/pages/admin/AdminUsers.tsx:212` | `// TODO: expand when backend UserUpdateRequest supports more fields` | Admin user edit limited | Admin |
| `frontend/src/pages/admin/AdminAccounts.tsx:273` | `// TODO: expand when backend AccountUpdatePayload supports more fields` | Admin account edit limited | Admin |
| `frontend/src/pages/admin/AdminActivity.tsx:78` | `// TODO: resolve actor_user_id to username when user lookup is batched` | Activity log shows raw user IDs | Admin |
| `frontend/src/pages/admin/AdminData.tsx:95` | `// TODO: wire DataCenterPanel when backend CRUD endpoints are implemented` | Generic data browser unavailable | Admin |
| `frontend/src/pages/admin/AdminEvidence.tsx:121` | "Scan is stubbed on V2 backend" | Evidence scan returns empty proposals | Admin |
| `frontend/src/pages/Billing.tsx:5` | "[Placeholder — coming soon]" | Billing page is a stub (upgrade lives at `/profile/upgrade`) | Frontend |
| `frontend/src/pages/Login.tsx:5` | "[Placeholder — coming soon]" | Orphan file, not routed | Other |
| `frontend/src/pages/Onboarding.tsx:5` | "[Placeholder — coming soon]" | Orphan file, not routed | Other |
| `frontend/src/pages/Subscribe.tsx:5` | "[Placeholder — coming soon]" | Orphan file, not routed | Other |
| `backend/app/api/v1/admin.py:496` | `# TODO: wire scanPublicEvidence integration` | Evidence scan returns `{"proposals": []}` with `scan_stubbed` metadata | Backend |
| `backend/app/api/v1/bubbles.py:101` | `# TODO: add denormalized score/member_count to bubbles table for proper leaderboard` | Leaderboard sorts by `created_at` or member count, not bubble score | Backend |

### Grouped counts

| Category | Count |
|----------|-------|
| Backend | 2 |
| Frontend | 22 |
| Admin | 9 |
| Onboarding | 1 |
| Other | 3 |
| **Total** | **37** |

---

## Task 3 — API endpoint parity

### 3a — V2 endpoint inventory

Base path: `/api/v1` (plus `/health` and `/webhooks/razorpay` on app root).

| Method | Path | Router file | Implemented? |
|--------|------|-------------|--------------|
| POST | `/auth/session/sync` | `auth.py` | Yes |
| GET | `/users/me` | `users.py` | Yes |
| PATCH | `/users/me` | `users.py` | Yes |
| GET | `/users/username-availability` | `users.py` | Yes |
| GET | `/users/{user_id}` | `users.py` | Yes |
| GET | `/users/{user_id}/follow-status` | `social.py` | Yes |
| POST | `/users/{user_id}/follow` | `social.py` | Yes |
| DELETE | `/users/{user_id}/follow` | `social.py` | Yes |
| GET | `/users/{user_id}/connections` | `social.py` | Yes |
| GET | `/me/bookmarks` | `me.py` | Yes |
| GET | `/me/filings` | `me.py` | Yes |
| POST | `/me/deletion-request` | `me.py` | Yes |
| POST | `/me/score/replay` | `me.py` | Yes |
| POST | `/me/upgrade/order` | `payments.py` | Yes |
| POST | `/me/upgrade/verify` | `payments.py` | Yes |
| POST | `/accounts/` | `accounts.py` | Yes |
| GET | `/accounts/` | `accounts.py` | Yes |
| GET | `/accounts/search` | `accounts.py` | Yes |
| GET | `/accounts/{account_id}` | `accounts.py` | Yes |
| PATCH | `/accounts/{account_id}` | `accounts.py` | Yes |
| GET | `/accounts/{account_id}/social-links` | `accounts.py` | Yes |
| POST | `/accounts/{account_id}/social-links` | `accounts.py` | Yes |
| GET | `/reports/moderation-queue` | `reports.py` | Yes |
| POST | `/reports/` | `reports.py` | Yes |
| GET | `/reports/` | `reports.py` | Yes |
| GET | `/reports/{report_id}` | `reports.py` | Yes |
| POST | `/reports/{report_id}/votes` | `reports.py` | Yes |
| POST | `/reports/{report_id}/comments` | `reports.py` | Yes |
| GET | `/reports/{report_id}/comments` | `reports.py` | Yes |
| POST | `/reports/{report_id}/moderation-request` | `reports.py` | Yes |
| POST | `/reports/{report_id}/moderate` | `reports.py` | Yes (uses `DEFAULT_MULTIPLIERS`, no adjudicate fields) |
| GET | `/feed` | `feed.py` | Yes |
| GET | `/people/trending` | `people.py` | Yes |
| GET | `/people/deck` | `people.py` | Yes |
| POST | `/people/deck/{account_id}/swipe` | `people.py` | Yes |
| GET | `/notifications/` | `notifications.py` | Yes |
| POST | `/notifications/read-all` | `notifications.py` | Yes |
| GET | `/notifications/unread-count` | `notifications.py` | Yes |
| POST | `/notifications/{notification_id}/read` | `notifications.py` | Yes |
| POST | `/claims/` | `claims.py` | Yes |
| GET | `/claims/mine` | `claims.py` | Yes |
| GET | `/claims/pending` | `claims.py` | Yes |
| GET | `/claims/{claim_id}` | `claims.py` | Yes |
| POST | `/claims/{claim_id}/decide` | `claims.py` | Yes (no notification on decide) |
| GET | `/bubbles/` | `bubbles.py` | Yes |
| POST | `/bubbles/` | `bubbles.py` | Yes |
| GET | `/bubbles/mine` | `bubbles.py` | Yes |
| GET | `/bubbles/leaderboard` | `bubbles.py` | Partial (proxy sort, no denormalized score) |
| GET | `/bubbles/{bubble_id}` | `bubbles.py` | Yes |
| POST | `/bubbles/{bubble_id}/join` | `bubbles.py` | Yes |
| GET | `/bubbles/{bubble_id}/join-requests` | `bubbles.py` | Yes |
| POST | `/bubbles/{bubble_id}/join-requests/{target_user_id}/vote` | `bubbles.py` | Yes |
| POST | `/disputes/` | `disputes.py` | Yes |
| GET | `/disputes/mine` | `disputes.py` | Yes |
| GET | `/disputes/pending` | `disputes.py` | Yes |
| GET | `/disputes/{dispute_id}` | `disputes.py` | Yes |
| POST | `/disputes/{dispute_id}/decide` | `disputes.py` | Yes (no notification on decide) |
| POST | `/disputes/{dispute_id}/withdraw` | `disputes.py` | Yes |
| GET | `/admin/stats` | `admin.py` | Yes |
| GET | `/admin/moderation` | `admin.py` | Yes |
| POST | `/admin/moderation/{id}/decide` | `admin.py` | Yes |
| GET | `/admin/evidence` | `admin.py` | Yes |
| POST | `/admin/evidence/{id}/decide` | `admin.py` | Yes |
| POST | `/admin/accounts/{id}/evidence/scan` | `admin.py` | **Stub** (returns `proposals: []`) |
| POST | `/admin/reports` | `admin.py` | Yes |
| PATCH | `/admin/reports/{id}` | `admin.py` | Yes |
| DELETE | `/admin/reports/{id}` | `admin.py` | Yes |
| GET | `/admin/actions` | `admin.py` | Yes |
| GET | `/admin/users` | `admin.py` | Yes |
| GET | `/admin/users/{id}` | `admin.py` | Yes |
| PATCH | `/admin/users/{id}` | `admin.py` | Yes |
| DELETE | `/admin/users/{id}` | `admin.py` | Yes |
| GET | `/admin/accounts` | `admin.py` | Yes |
| POST | `/admin/accounts` | `admin.py` | Yes |
| GET | `/admin/accounts/{id}` | `admin.py` | Yes |
| PATCH | `/admin/accounts/{id}` | `admin.py` | Yes |
| DELETE | `/admin/accounts/{id}` | `admin.py` | Yes |
| GET | `/admin/settings` | `admin.py` | Yes |
| PATCH | `/admin/settings` | `admin.py` | Yes |
| POST | `/admin/ownership` | `admin.py` | Yes |
| DELETE | `/admin/ownership` | `admin.py` | Yes |
| POST | `/admin/score/replay` | `admin.py` | Yes |
| GET | `/admin/audits` | `admin.py` | Yes |
| POST | `/admin/audits/{id}/run` | `admin.py` | Yes |
| POST | `/admin/audits/{id}/decide` | `admin.py` | Yes |
| GET | `/admin/abuse` | `admin.py` | Yes |
| POST | `/admin/abuse/{id}/dismiss` | `admin.py` | Yes |
| GET | `/admin/trust-badge` | `admin.py` | Yes |
| POST | `/admin/trust-badge/{id}/decide` | `admin.py` | Yes |
| GET | `/admin/deletion-requests` | `admin.py` | Yes |
| POST | `/admin/deletion-requests/{id}/decide` | `admin.py` | Yes |
| GET | `/admin/issues` | `admin.py` | Yes |
| POST | `/admin/issues/{id}/status` | `admin.py` | Yes |
| GET | `/admin/data` | `admin.py` | Yes (collection list only) |
| GET | `/admin/data/{collection}/{record_id}` | `admin.py` | **Not implemented** (`not_implemented` error) |
| PATCH | `/admin/data/{collection}/{record_id}` | `admin.py` | **Not implemented** |
| DELETE | `/admin/data/{collection}/{record_id}` | `admin.py` | **Not implemented** |
| POST | `/media/upload` | `media.py` | Yes |
| GET | `/stats` | `discovery.py` | Yes |
| GET | `/search/reports` | `discovery.py` | Yes |
| GET | `/impact` | `impact.py` | Yes |
| GET | `/impact/rising-makers` | `impact.py` | Yes |
| GET | `/events` | `events.py` | Yes |
| POST | `/events` | `events.py` | Yes |
| POST | `/report-issue` | `misc.py` | Yes |
| GET | `/proxy-image` | `misc.py` | Yes |
| POST | `/notifications/token` | `misc.py` | Yes |
| DELETE | `/notifications/token` | `misc.py` | Yes |
| POST | `/imports/contacts` | `imports.py` | Yes |
| POST | `/imports/links` | `imports.py` | Yes |
| POST | `/ai/analyze` | `ai.py` | Yes |
| POST | `/ai/classify` | `ai.py` | Yes |
| POST | `/webhooks/razorpay` | `webhooks.py` (root) | Yes (no notifications on payment events) |
| GET | `/health` | `main.py` (root) | Yes |

**V2 total: 108 route handlers** (39 admin + 69 non-admin).

### 3b — V1 API route inventory (84 `route.ts` files)

| Method | Path | File | Purpose |
|--------|------|------|---------|
| GET | `/api/health` | `api/health/route.ts` | Health check |
| GET/PATCH | `/api/me` | `api/me/route.ts` | Current user profile read/update |
| GET | `/api/me/username-check` | `api/me/username-check/route.ts` | Username availability |
| POST | `/api/me/upgrade` | `api/me/upgrade/route.ts` | Legacy upgrade trigger |
| POST | `/api/me/upgrade/order` | `api/me/upgrade/order/route.ts` | Create Razorpay order |
| POST | `/api/me/upgrade/verify` | `/api/me/upgrade/verify/route.ts` | Verify Razorpay payment |
| POST | `/api/me/deletion-request` | `api/me/deletion-request/route.ts` | Submit account deletion request |
| GET | `/api/me/bookmarks` | `api/me/bookmarks/route.ts` | List user bookmarks |
| GET | `/api/me/filings` | `api/me/filings/route.ts` | List user's filed reports |
| POST | `/api/me/score/replay` | `api/me/score/replay/route.ts` | Replay user score from ledger |
| GET/POST | `/api/accounts` | `api/accounts/route.ts` | List/create accounts |
| GET/PATCH | `/api/accounts/[id]` | `api/accounts/[id]/route.ts` | Get/update account |
| GET | `/api/accounts/search` | `api/accounts/search/route.ts` | Search accounts |
| POST | `/api/accounts/[id]/claim` | `api/accounts/[id]/claim/route.ts` | Submit profile claim |
| POST | `/api/accounts/[id]/swipe` | `api/accounts/[id]/swipe/route.ts` | People deck swipe |
| POST | `/api/accounts/[id]/audit` | `api/accounts/[id]/audit/route.ts` | User-request account audit |
| DELETE | `/api/accounts/[id]/dossier-unfollow` | `api/accounts/[id]/dossier-unfollow/route.ts` | Unfollow dossier |
| GET/POST | `/api/reports` | `api/reports/route.ts` | List/create reports |
| GET | `/api/reports/[id]` | `api/reports/[id]/route.ts` | Get report detail |
| GET | `/api/reports/queue` | `api/reports/queue/route.ts` | Moderation queue |
| GET/POST | `/api/reports/[id]/interactions` | `api/reports/[id]/interactions/route.ts` | Votes, comments, bookmarks, share |
| GET | `/api/reports/[id]/comments` | `api/reports/[id]/comments/route.ts` | List comments |
| POST | `/api/reports/[id]/moderation` | `api/reports/[id]/moderation/route.ts` | Request moderation |
| POST | `/api/reports/[id]/adjudicate` | `api/reports/[id]/adjudicate/route.ts` | Admin adjudicate with full scoring fields |
| GET | `/api/feed` | `api/feed/route.ts` | Feed with tabs |
| GET | `/api/search/reports` | `api/search/reports/route.ts` | Search reports |
| GET | `/api/stats` | `api/stats/route.ts` | Platform stats |
| GET | `/api/impact` | `api/impact/route.ts` | User impact analytics |
| GET | `/api/impact/rising-makers` | `api/impact/rising-makers/route.ts` | Rising makers list |
| GET/POST | `/api/events` | `api/events/route.ts` | Account events ledger |
| GET/POST | `/api/bubbles` | `api/bubbles/route.ts` | List/create bubbles |
| GET | `/api/bubbles/leaderboard` | `api/bubbles/leaderboard/route.ts` | Bubble leaderboard |
| POST | `/api/bubbles/[id]/join` | `api/bubbles/[id]/join/route.ts` | Join bubble |
| GET/POST | `/api/disputes` | `api/disputes/route.ts` | List/file disputes |
| POST | `/api/disputes/[id]/withdraw` | `api/disputes/[id]/withdraw/route.ts` | Withdraw dispute |
| GET/POST | `/api/notifications` | `api/notifications/route.ts` | List notifications |
| POST | `/api/notifications/read-all` | `api/notifications/read-all/route.ts` | Mark all read |
| POST | `/api/notifications/[id]/read` | `api/notifications/[id]/read/route.ts` | Mark one read |
| POST/DELETE | `/api/notifications/token` | `api/notifications/token/route.ts` | FCM token register/remove |
| POST/DELETE | `/api/users/[id]/follow` | `api/users/[id]/follow/route.ts` | Follow/unfollow user |
| GET | `/api/users/[id]/connections` | `api/users/[id]/connections/route.ts` | User connections |
| GET | `/api/people/trending` | `api/people/trending/route.ts` | Trending people |
| GET | `/api/people/deck` | `api/people/deck/route.ts` | Swipe deck |
| POST | `/api/media/upload` | `api/media/upload/route.ts` | Media upload |
| POST | `/api/imports/contacts` | `api/imports/contacts/route.ts` | Import contacts |
| POST | `/api/imports/links` | `api/imports/links/route.ts` | Import social links |
| POST | `/api/ai/analyze` | `api/ai/analyze/route.ts` | AI report analysis |
| POST | `/api/ai/classify` | `api/ai/classify/route.ts` | AI intent/pattern classify |
| POST | `/api/report-issue` | `api/report-issue/route.ts` | Bug/issue report |
| GET | `/api/proxy-image` | `api/proxy-image/route.ts` | Image proxy |
| POST | `/api/webhooks/razorpay` | `api/webhooks/razorpay/route.ts` | Razorpay webhook + notifications |
| POST/GET | `/api/cron/weekly-momentum` | `api/cron/weekly-momentum/route.ts` | Weekly momentum score job |
| GET | `/api/admin/stats` | `api/admin/stats/route.ts` | Admin dashboard stats |
| GET/POST | `/api/admin/reports` | `api/admin/reports/route.ts` | Admin create report |
| PATCH/DELETE | `/api/admin/reports/[id]` | `api/admin/reports/[id]/route.ts` | Admin update/delete report |
| GET | `/api/admin/queue` (via reports/queue) | — | Covered by reports queue |
| GET | `/api/admin/moderation` | `api/admin/moderation/route.ts` | List moderation requests |
| POST | `/api/admin/moderation/[id]/decide` | `api/admin/moderation/[id]/decide/route.ts` | Decide moderation |
| GET | `/api/admin/evidence` | `api/admin/evidence/route.ts` | Evidence queue |
| POST | `/api/admin/evidence/[id]/decide` | `api/admin/evidence/[id]/decide/route.ts` | Decide evidence |
| POST | `/api/admin/accounts/[id]/evidence/scan` | `api/admin/accounts/[id]/evidence/scan/route.ts` | Scan public evidence |
| GET/POST | `/api/admin/accounts` | `api/admin/accounts/route.ts` | Admin account list/create |
| PATCH/DELETE | `/api/admin/accounts/[id]` | `api/admin/accounts/[id]/route.ts` | Admin account edit/delete |
| GET | `/api/admin/users` | `api/admin/users/route.ts` | Admin user list |
| PATCH/DELETE | `/api/admin/users/[id]` | `api/admin/users/[id]/route.ts` | Admin user edit/delete |
| GET | `/api/admin/claims` | `api/admin/claims/route.ts` | Pending claims |
| POST | `/api/admin/claims/[id]/decide` | `api/admin/claims/[id]/decide/route.ts` | Decide claim |
| GET | `/api/admin/disputes` | `api/admin/disputes/route.ts` | Pending disputes |
| POST | `/api/admin/disputes/[id]/decide` | `api/admin/disputes/[id]/decide/route.ts` | Decide dispute |
| GET | `/api/admin/audits` | `api/admin/audits/route.ts` | Audit queue |
| POST | `/api/admin/audits/[id]/run` | `api/admin/audits/[id]/run/route.ts` | Run audit |
| POST | `/api/admin/audits/[id]/decide` | `api/admin/audits/[id]/decide/route.ts` | Decide audit |
| GET | `/api/admin/abuse` | `api/admin/abuse/route.ts` | Abuse reports |
| POST | `/api/admin/abuse/[id]/dismiss` | `api/admin/abuse/[id]/dismiss/route.ts` | Dismiss abuse |
| GET | `/api/admin/trust-badge` | `api/admin/trust-badge/route.ts` | Trust badge queue |
| POST | `/api/admin/trust-badge/[id]/decide` | `api/admin/trust-badge/[id]/decide/route.ts` | Decide trust badge |
| GET | `/api/admin/deletion-requests` | (via decide route) | Deletion queue |
| POST | `/api/admin/deletion-requests/[id]/decide` | `api/admin/deletion-requests/[id]/decide/route.ts` | Decide deletion |
| POST | `/api/admin/issues/[id]/status` | `api/admin/issues/[id]/status/route.ts` | Update issue status |
| GET/PATCH | `/api/admin/settings` | `api/admin/settings/route.ts` | Site settings |
| GET | `/api/admin/actions` | `api/admin/actions/route.ts` | Admin actions log |
| POST/DELETE | `/api/admin/ownership` | `api/admin/ownership/route.ts` | Assign/revoke ownership |
| POST | `/api/admin/score/replay` | `api/admin/score/replay/route.ts` | Admin score replay |
| GET | `/api/admin/data` | `api/admin/data/route.ts` | Data collections list |
| GET/POST | `/api/admin/data/[collection]` | `api/admin/data/[collection]/route.ts` | Collection browse/create |
| GET/PATCH/DELETE | `/api/admin/data/[collection]/[id]` | `api/admin/data/[collection]/[id]/route.ts` | Record CRUD |

V1 also has `/api/og/route.tsx` (OG image generation) — no V2 equivalent.

### 3c — Gap analysis

**V1 API routes with NO V2 equivalent (feature gap)**

| V1 route | Gap |
|----------|-----|
| `POST /api/accounts/[id]/audit` | User-facing audit request — no V2 route |
| `DELETE /api/accounts/[id]/dossier-unfollow` | Dossier unfollow — no V2 route |
| `POST /api/reports/[id]/adjudicate` | Replaced by `/reports/{id}/moderate` but **without** scoring-field payload (category, deed, baseScore, intent, circumstances, repetitionPattern) |
| `GET/POST /api/reports/[id]/interactions` (bookmark) | Votes/comments split out; **bookmark toggle API missing** despite `report_bookmark_service.py` |
| `GET /api/me/username-check` | Renamed to `/users/username-availability` (parity, path change) |
| `POST /api/accounts/[id]/swipe` | Moved to `POST /people/deck/{account_id}/swipe` |
| `POST /api/accounts/[id]/claim` | Moved to `POST /claims/` |
| `POST /api/me/upgrade` | Split into order/verify only |
| `POST/GET /api/cron/weekly-momentum` | **Missing entirely in V2** |
| `GET /api/og` | OG image generation — **missing** |
| `POST /api/admin/data/[collection]` | Collection record create — **missing** |
| `GET /me/swipe-aggregate` | Referenced in frontend TODO — **missing** |
| `GET /accounts/{id}/score-history` | Referenced in frontend TODO — **missing** |
| `GET /accounts/{id}/score-windows` | Referenced in `ScoreLedgerPanel.tsx:83` — **missing** |

**V2 endpoints that are stub/empty/partial**

| Endpoint | Issue |
|----------|-------|
| `POST /admin/accounts/{id}/evidence/scan` | Returns `proposals: []`, `scan_stubbed` |
| `GET/PATCH/DELETE /admin/data/{collection}/{record_id}` | Raises `not_implemented` |
| `GET /bubbles/leaderboard` | Sorts by `created_at`/member count, not real bubble score |
| `POST /reports/{id}/moderate` | Applies `DEFAULT_MULTIPLIERS` only; no admin scoring overrides |
| `POST /webhooks/razorpay` | Updates subscription status only; no user notifications |

**Frontend API clients calling endpoints NOT in 3a (would 404)**

| Client call | File | Missing endpoint |
|-------------|------|------------------|
| `/me/swipe-aggregate` | `SwipeScoreBreakdownCard.tsx:31` (referenced) | Not in backend |
| `/accounts/{id}/audit` | `DossierActions.tsx:43` (referenced) | Not in backend |
| `/accounts/{id}/score-history` | `AccountDetail.tsx:265` (referenced) | Not in backend |
| Bookmark toggle | `FeedItem.tsx:254` | No POST/DELETE bookmark route (service exists, no router) |
| `/api/proxy-image` | `FeedShareCard.tsx:44` | Uses `/api/proxy-image` but V2 backend is `/api/v1/proxy-image` — **path mismatch risk** |

---

## Task 4 — Admin panel parity

| V1 admin feature | V1 file | V2 equivalent | V2 file | Status | Notes |
|------------------|---------|---------------|---------|--------|-------|
| Dashboard / stats | `admin/page.tsx` | Admin dashboard | `pages/admin/AdminDashboard.tsx` | PARTIAL | Time-series charts, `filingsLast7`, `aiAgreementRate` stubbed |
| Moderation queue | `admin/queue/page.tsx` | Report queue | `pages/admin/AdminQueue.tsx` | PARTIAL | Scoring fields on adjudicate not sent |
| Report review/decision | `admin/review/[reportId]/page.tsx` | Admin review | `pages/admin/AdminReview.tsx` | PARTIAL | Uses `moderateReport` without adjudicate payload |
| Moderation requests | `admin/moderation/page.tsx` | Admin moderation | `pages/admin/AdminModeration.tsx` | FULL | — |
| Claims review | `admin/claims/page.tsx` | Admin claims | `pages/admin/AdminClaims.tsx` | FULL | Backend decide sends no notification (V1 does) |
| Dispute review | `admin/disputes/page.tsx` | Admin disputes | `pages/admin/AdminDisputes.tsx` | FULL | Backend decide sends no notification (V1 does) |
| Evidence queue | `admin/evidence/page.tsx` | Admin evidence | `pages/admin/AdminEvidence.tsx` | PARTIAL | Scan stubbed on backend |
| Audit queue | `admin/audits/page.tsx` | Admin audits | `pages/admin/AdminAudits.tsx` | FULL | — |
| Abuse / flagging | `admin/abuse/page.tsx` | Admin abuse | `pages/admin/AdminAbuse.tsx` | FULL | — |
| User management | `admin/users/page.tsx` | Admin users | `pages/admin/AdminUsers.tsx` | PARTIAL | Limited patch schema |
| Account management | `admin/accounts/page.tsx` | Admin accounts | `pages/admin/AdminAccounts.tsx` | PARTIAL | Limited patch schema |
| Trust badge queue | `admin/trust-badge/page.tsx` | Admin trust badge | `pages/admin/AdminTrustBadge.tsx` | FULL | — |
| Deletion requests | `admin/deletion-requests/page.tsx` | Admin deletion | `pages/admin/AdminDeletionRequests.tsx` | FULL | — |
| Issue reports | `admin/issues/page.tsx` | Admin issues | `pages/admin/AdminIssues.tsx` | FULL | — |
| Admin actions log | `admin/activity/page.tsx` | Admin activity | `pages/admin/AdminActivity.tsx` | PARTIAL | Actor username resolution missing |
| Site settings | `admin/settings/page.tsx` | Admin settings | `pages/admin/AdminSettings.tsx` | FULL | — |
| Data center / CRUD browser | `admin/data/DataCenterPanel.tsx` | Admin data | `pages/admin/AdminData.tsx` | PARTIAL | Links to dedicated pages; generic CRUD `not_implemented` |
| Admin create (report/account) | `admin/create/page.tsx` | Admin create | `pages/admin/AdminCreate.tsx` | FULL | — |
| Admin feed table | `admin/feed/page.tsx` | Admin feed | `pages/admin/AdminFeed.tsx` | FULL | — |
| Role management | inline in `admin/users/UsersTable.tsx` | Role dropdown in AdminUsers | `pages/admin/AdminUsers.tsx` | PARTIAL | UI exists; backend `UserUpdateRequest` lacks most profile fields |
| Analytics/charts | `admin/page.tsx` | AdminDashboard charts section | `pages/admin/AdminDashboard.tsx` | PARTIAL | Charts TODO |
| Bubble moderation | — | — | — | N/A | Neither V1 nor V2 has dedicated admin bubble moderation |
| Ownership assignment | V1 `api/admin/ownership` | V2 `/admin/ownership` | via `api/admin.ts` | FULL | — |
| Score replay | V1 `api/admin/score/replay` | V2 `/admin/score/replay` | via `api/admin.ts` | FULL | — |

---

## Task 5 — Onboarding field parity

V1 fields from `Shoshaaahhh/src/app/onboard/page.tsx` `EMPTY` + form sections.

| V1 field | Collected in V2 form? | Sent to V2 backend? | Backend schema supports it? | Status |
|----------|----------------------|---------------------|----------------------------|--------|
| `name` | Yes | Yes (`display_name`) | `UserUpdateRequest.display_name` | FULL |
| `username` | Yes | Yes | `UserUpdateRequest.username` | FULL |
| `phone` | Yes | **No** | **No** (`User` model has no `phone`) | MISSING |
| `dob` | Yes | **No** | **No** | MISSING |
| `city` | Yes | Yes | `UserUpdateRequest.city` | FULL |
| `country` | Yes | **No** | **No** | MISSING |
| `email` | Yes (read-only) | N/A (from Firebase) | `UserPrivate.email` | FULL |
| `occupationRole` | Yes | **No** (`Onboard.tsx:424`) | **No** | MISSING |
| `networkSize` | Yes | **No** | **No** | MISSING |
| `education` | Yes | **No** | **No** | MISSING |
| `specializedField` | Yes | **No** | **No** | MISSING |
| `managesMoneyPeopleSystem` | Yes | **No** | **No** | MISSING |
| `physicalIntellectualLimitations` | Yes | **No** | **No** | MISSING |
| `igUrl` | Yes | **No** | **No** | MISSING |
| `tiktokUrl` | Yes | **No** | **No** | MISSING |
| `xUrl` | Yes | **No** | **No** | MISSING |
| `linkedinUrl` | Yes | **No** | **No** | MISSING |
| `redditUrl` | Yes | **No** | **No** | MISSING |
| `ytUrl` | Yes | **No** | **No** | MISSING |
| `fbUrl` | Yes | **No** | **No** | MISSING |
| `snapchatUrl` | Yes | **No** | **No** | MISSING |
| `photoUrl` | Yes | Yes (`photo_url`) | `UserUpdateRequest.photo_url` | FULL |
| `bio` | Yes | Yes | `UserUpdateRequest.bio` | FULL |
| `quote` | Yes | **No** | **No** (`headline` exists but not mapped) | MISSING |
| `trustBadge` | Yes (display) | N/A (from user record) | `UserPrivate.trust_badge` | FULL |
| `onboardingComplete` | Yes (on complete) | Yes | `UserUpdateRequest.onboarding_complete` | FULL |
| `region` | V1 type only (unused in form) | No | No | N/A |

**Downstream degradation when fields missing**

| V1 consumer | Impact in V2 |
|-------------|--------------|
| `calcCredibility()` / credibility panel | Frontend computes live during onboarding but **stored credibility is lost** after save |
| `profileMultipliersFromWorkbookProfile()` in scoring | Backend `moderate_report` uses `DEFAULT_MULTIPLIERS` (`report_service.py:281`) — scores don't reflect user profile |
| `calcProfileScores()` dimension display | Dashboard/Profile use **score proxy** (`Dashboard.tsx:138-139`) |
| People deck `weekDelta` from `windowScores` | No `windowScores` on accounts in V2 backend |
| Profile display / search filter by occupation, country | Fields not stored; cannot filter or display |
| Trust badge credibility cap (80% → 100%) | `trust_badge_service.py:70-73` notes Account has no credibility column; uses `score=1000.0` proxy |

---

## Task 6 — Auth & session parity

| Feature | V1 | V2 | Status |
|---------|----|----|--------|
| Google sign-in | Yes (`sign-in/page.tsx`) | Yes (`AuthProvider`) | FULL |
| Email/password sign-in | Yes | Yes (`SignIn.tsx`, Firebase) | FULL |
| Phone/OTP sign-in | No | Yes (`SignIn.tsx` phone mode) | V2-ONLY-NEW |
| Sign-up page | `/sign-up` | Redirects to `/sign-in` | FULL |
| Session sync | Implicit via `/api/me` on first load | `POST /auth/session/sync` creates/updates local user, returns `UserPrivate` + `is_new_user` | FULL |
| Session fields set | Full user doc incl. credibility fields | `display_name`, `photo_url`, `email`, `onboarding_complete` only | PARTIAL |
| Logout | Firebase `signOut` | Firebase `signOut` + clear mock state (`AuthProvider.tsx`) | FULL |
| Password reset | **Not found** in V1 codebase | **Not found** in V2 codebase | MISSING (both) |
| Account deletion request | Settings → `POST /api/me/deletion-request` | Settings → `POST /me/deletion-request` | FULL |
| Dev/mock auth | No | `USE_MOCKS` + `devPreviewLogin` | V2-ONLY-NEW |

---

## Task 7 — Background jobs / cron parity

| Job name | V1 implementation | V2 implementation | Status |
|----------|-------------------|-------------------|--------|
| Weekly momentum | `POST/GET /api/cron/weekly-momentum/route.ts` — rolls 7-day window scores (W1/W2), updates accounts | **None** — no `/cron/*`, no Celery/APScheduler in `backend/app/` | MISSING |
| Monthly score decay | Documented as future TODO in `shosha-claude-code-prompt.md` | Not implemented | MISSING (both, planned) |
| Notification digest | Settings toggle `weeklyDigest` (localStorage only) | Same localStorage toggle; **no backend job** | MISSING (both) |
| Razorpay webhook processing | `webhooks/razorpay/route.ts` + notifications | `webhooks.py` — status updates only | PARTIAL |

**Day 19 stretch goal:** `POST /cron/weekly-momentum` — **does not exist in V2**.

---

## Task 8 — Notifications trigger coverage

| Notification trigger type | In V1? | In V2? | Status |
|---------------------------|--------|--------|--------|
| Report approved/rejected (admin adjudicate) | Yes (`adjudicate/route.ts:222`) | Yes (`emit_report_notification` in `report_service.py:290`) | FULL |
| Report align vote | Yes (`interactions/route.ts:31`) | **No** | MISSING |
| Report oppose vote | Yes | **No** | MISSING |
| Report comment | Yes | **No** | MISSING |
| Moderation requested (notify admins) | Yes (`moderation/route.ts:49`) | **No** on create | MISSING |
| Moderation resolved | Yes (`moderation/[id]/decide`) | Yes (`moderation_request_service.py:96`) | FULL |
| Claim approved/rejected | Yes (`claims/[id]/decide`) | **No** (`claim_service.py` decide has no notification) | MISSING |
| Dispute filed | Yes (`disputes/route.ts:88`) | **No** | MISSING |
| Dispute resolved (admin) | Yes (`disputes/[id]/decide`) | **No** | MISSING |
| Trust badge approved/rejected | Yes (`trust-badge/[id]/decide`) | Yes (`trust_badge_service.py:76,97`) | FULL |
| Trust badge payment failed | Yes (`webhooks/razorpay`) | **No** | MISSING |
| Trust badge cancelled | Yes (`webhooks/razorpay`) | **No** | MISSING |
| Deletion requested | Yes (`deletion-request/route.ts:71`) | **No** on create | MISSING |
| Deletion resolved | Yes (`deletion-requests/[id]/decide`) | Yes (`deletion_request_service.py:122`) | FULL |
| Abuse dismissed | Yes (`abuse/[id]/dismiss`) | Yes (`admin_abuse_service.py:93`) | FULL |
| Bubble invite | **Not found** | **Not found** | N/A |

**Counts:** V1 = 15 trigger types; V2 = 6 implemented; 8 missing; 1 N/A.

---

## Task 9 — Score / scoring engine parity

### W1/W2/W3 windowed scoring + decay

| Component | V1 | V2 |
|-----------|----|----|
| Workbook delta + decay formula | `scoring.ts` `applySheetScore` | `scoring_service.py` `apply_sheet_score` — **ported** |
| Sheet scoring index | `SHEET_SCORING_INDEX` | Same index in `scoring_service.py:52+` — **ported** |
| Profile multipliers from onboarding | `profileMultipliersFromWorkbookProfile` uses account fields | Backend uses `DEFAULT_MULTIPLIERS` at moderate time; frontend lib has `profileMultipliersFromUser` but unused by backend |
| W1/W2/W3 window computation | `calcWindowScores()` in `scoring.ts:591+`; persisted on account as `windowScores` | Frontend `lib/scoring.ts` has `calcWindowScores`; **backend does not compute or expose `windowScores`** |
| Weekly momentum cron | Updates window scores from events | **Missing** |

**Answer:** V2 backend implements the core workbook formula + ledger replay but **not** the full W1/W2/W3 windowed pipeline or profile-derived multipliers. This is a **simplified/proxy version** for production scoring.

### Endpoint checks

| Endpoint | Status |
|----------|--------|
| `GET /accounts/{id}/score-windows` | **Not implemented** (UI placeholder in `ScoreLedgerPanel.tsx:83`) |
| `GET /accounts/{id}/score-history` | **Not implemented** (TODO `AccountDetail.tsx:265`) |

### V2 frontend scoring TODOs (cross-ref Task 2)

| File:Line | Topic |
|-----------|-------|
| `Dashboard.tsx:138` | Credibility proxy vs full formula |
| `AccountDetail.tsx:265` | Score history endpoint |
| `SwipeScoreBreakdownCard.tsx:31` | `/me/swipe-aggregate` |
| `AdminReviewControls.tsx:69` | Admin scoring fields on moderate |
| `LiveAccountScorePanel.tsx:85` | Followers + credibility display |
| `Ranks.tsx:122` | weekly_delta in list endpoint |
| `ProfileImpactAnalytics.tsx:122` | Range selector |

---

## Task 10 — Summary scorecard

| Area | Total items (V1 baseline) | Done in V2 | Partial | Missing | % Complete |
|------|---------------------------|------------|---------|---------|------------|
| Pages/Routes | 55 routable V1 pages | 38 | 14 | 0 | **69%** |
| API Endpoints | ~95 V1 handlers | 88 | 8 | 7 | **78%** |
| Admin Features | 20 tracked features | 12 | 8 | 0 | **60%** |
| Onboarding Fields | 24 fields | 6 | 0 | 18 | **25%** |
| Notification Triggers | 15 types | 6 | 0 | 8 | **40%** |
| Background Jobs | 2 planned jobs | 0 | 1 (webhook) | 1 (weekly-momentum) | **0%** |
| Scoring Engine Components | 8 components | 3 | 3 | 2 | **38%** |

*% Complete = (FULL + 0.5×PARTIAL) / total × 100, rounded.*

---

## Prioritized punch list

### P0 — Blocks core user flows

1. **Persist onboarding credibility fields** — expand `User` model + `UserUpdateRequest` + `Onboard.tsx:424` payload (18 fields missing; blocks real credibility and profile multipliers).
2. **Admin adjudicate with scoring fields** — extend `ModerationDecisionRequest` + `AdminReviewControls.tsx:69` to match V1 `adjudicate` (deed, baseScore, intent, circumstances, repetitionPattern); wire `profileMultipliersFromUser` in `apply_report_score`.
3. **Bookmark toggle API** — expose `report_bookmark_service.toggle_bookmark` as route; wire `FeedItem.tsx:254`.
4. **Notification triggers for social actions** — votes, comments, claim/dispute decisions, moderation-request-to-admins, deletion-request-submitted.
5. **`POST /cron/weekly-momentum`** — port V1 job; required for W1/W2 window scores and People/Ranks weekly_delta.

### P1 — Acknowledged in existing TODOs

6. `GET /accounts/{id}/score-history` + `GET /accounts/{id}/score-windows` — wire `AccountDetail.tsx:265`, `ScoreLedgerPanel.tsx`.
7. `GET /me/swipe-aggregate` — wire `SwipeScoreBreakdownCard.tsx:31`.
8. Following / Near You feed filters — `feed.ts:10,13` + Dashboard/Feed stubs.
9. Evidence scan integration — `admin.py:496` + `AdminEvidence.tsx:121`.
10. Admin dashboard metrics — `filingsLast7`, `aiAgreementRate`, time-series charts (`AdminDashboard.tsx:53,96,120`).
11. Claim evidence S3 upload — `ClaimProfileModal.tsx:71`.
12. `POST /accounts/{id}/audit` user endpoint — `DossierActions.tsx:43`.
13. Generic admin data CRUD — `admin/data/{collection}/{id}` currently `not_implemented`.
14. Razorpay webhook notifications — trust_badge_payment_failed, trust_badge_cancelled.

### P2 — Nice-to-have V1 parity

15. PDF export on share cards — `ShareCardModal.tsx:70`, `AccountShareButton.tsx:52`.
16. Impact analytics range selector — `ProfileImpactAnalytics.tsx:122`.
17. Bubble image crop modal — `CreateBubbleFlow.tsx:66`.
18. Ranks region filter + "Under Fire" section — `Ranks.tsx:36,122`.
19. Leaderboard weekly delta column — match V1 `leaderboard/page.tsx`.
20. Bubble leaderboard denormalized scores — `bubbles.py:101`.
21. OG image route — V1 `/api/og`.
22. Billing page or remove route — `Billing.tsx` placeholder.
23. Delete orphan placeholder pages — `Login.tsx`, `Onboarding.tsx`, `Subscribe.tsx`.
24. `DELETE /accounts/{id}/dossier-unfollow` — V1 parity for dossier follow graph.
25. Fix `/api/proxy-image` vs `/api/v1/proxy-image` path in `FeedShareCard.tsx:44`.

---

**User**

make me report, read only audit for a 8 day plan to create the final version of v2 that completely mimics v1 (no scope left i need compelete website done by the final day)

all onboarding parameters, all admin routes, etc etc from v1 into v2 (leave deployment for now just the Frontend and the backend)

---

**Cursor**

# V2 Final Parity — 8-Day Execution Plan

Read-only plan derived from the V1→V2 gap audit. Goal: **complete frontend + backend parity with V1** by end of Day 8. Deployment, CI/CD, and infra are out of scope.

**Reference:** V1 `Shoshaaahhh` · V2 `shosha`  
**Current parity (approx.):** Pages 69% · API 78% · Admin 60% · Onboarding 25% · Notifications 40% · Jobs 0% · Scoring 38%

---

## Plan principles

1. **Backend-first for data contracts** — expand models/schemas before wiring UI.
2. **One vertical slice per day** — each day closes a testable user/admin flow.
3. **No orphan TODOs** — every item from the audit maps to a day below.
4. **Definition of Done (DoD)** per day: listed endpoints work, UI no longer stubbed, V1 behavior matched.

---

## Day 1 — Data foundation: user profile & onboarding

**Theme:** All 24 onboarding fields stored, validated, and returned on read.

### Backend
| Task | Detail |
|------|--------|
| Alembic migration | Add to `users`: `phone`, `dob`, `country`, `occupation_role`, `network_size`, `education`, `specialized_field`, `manages_money_people_system`, `physical_intellectual_limitations`, `ig_url`, `tiktok_url`, `x_url`, `linkedin_url`, `reddit_url`, `yt_url`, `fb_url`, `snapchat_url`, `quote` (or map to `headline`) |
| `UserUpdateRequest` / `UserPrivate` | Expose all new fields with validators (URL, enum values matching V1 option sets) |
| `PATCH /users/me` | Accept and persist full onboarding payload |
| `GET /users/me`, `GET /users/{id}` | Return credibility-relevant fields on private/public as V1 does |
| Username check | Confirm `GET /users/username-availability` matches V1 `/api/me/username-check` behavior; wire in Onboard |

### Frontend
| Task | Detail |
|------|--------|
| `Onboard.tsx:424` | Remove TODO; send all credibility fields in `updateCurrentUser` payload |
| `EditProfile.tsx:189` | Replace "coming soon" with full field editor (mirror Onboard sections) |
| `types/user.ts` | Extend `UpdateUserPayload` / `UserProfile` |

### DoD
- Complete onboarding in V2 → reload → all fields present in DB and API response.
- V1 `calcCredibility()` runs on real stored data post-save (not just in-form).

---

## Day 2 — Scoring engine core: multipliers, adjudicate, ledger

**Theme:** Report moderation produces the same score deltas as V1 adjudicate.

### Backend
| Task | Detail |
|------|--------|
| `profile_multipliers_from_user()` | Port V1 `profileMultipliersFromWorkbookProfile` into `scoring_service.py`; use onboarding fields from Day 1 |
| `ModerationDecisionRequest` | Add: `category`, `deed`, `base_score`, `repetition_pattern`, `intent`, `circumstances`, `final_impact`, `note` (match V1 `adjudicateSchema`) |
| `POST /reports/{id}/moderate` | Replace `DEFAULT_MULTIPLIERS` with profile-derived multipliers + admin overrides |
| `GET /accounts/{id}/score-history` | Return ledger entries as `{ t, s, cause }[]` |
| `GET /accounts/{id}/score-windows` | Port V1 `calcWindowScores()`; compute W1/W2/W3 from ledger age buckets |
| Account serializer | Include `window_scores`, `score_breakdown`, `score_history` on account detail |

### Frontend
| Task | Detail |
|------|--------|
| `AdminReviewControls.tsx:69` | Send full scoring fields to moderate endpoint |
| `AccountDetail.tsx:265` | Wire score history from new endpoint |
| `ScoreLedgerPanel.tsx:83` | Wire `windowScores` from API |
| `Dashboard.tsx:138` | Restore full `calcCredibility()` from `UserPrivate` |
| `LiveAccountScorePanel.tsx:85` | Show followers + credibility when exposed |

### DoD
- Admin approves report with deed/intent/circumstances → ledger entry matches V1 formula.
- Account detail shows W1/W2/W3 panel and score history timeline.

---

## Day 3 — Notifications & social interactions

**Theme:** Every V1 notification trigger fires in V2.

### Backend — new notification emits
| Trigger | V1 kind | V2 action |
|---------|---------|-----------|
| Report align vote | `report_align` | Emit in vote handler |
| Report oppose vote | `report_oppose` | Emit in vote handler |
| Report comment | `report_comment` | Emit in comment handler |
| Moderation requested | `moderation_requested` | Notify all moderators on `create_moderation_request` |
| Claim approved/rejected | `claim_approved` / `claim_rejected` | Add to `claim_service.decide_claim` |
| Dispute filed | (on create) | Add to `dispute_service.file_dispute` |
| Dispute resolved | `dispute_resolved` | Add to `decide_dispute` |
| Deletion requested | `deletion_requested` | Add to `create_deletion_request` |
| Trust badge payment failed | `trust_badge_payment_failed` | Add to `webhooks.py` |
| Trust badge cancelled | `trust_badge_cancelled` | Add to `webhooks.py` |
| Abuse dismissed | `abuse_dismissed` | ✓ exists — verify parity |

### Backend — bookmark API
| Task | Detail |
|------|--------|
| `POST /reports/{id}/bookmark` | Expose `report_bookmark_service.toggle_bookmark` |
| `GET /me/bookmarks` | ✓ exists — verify toggle round-trip |

### Frontend
| Task | Detail |
|------|--------|
| `FeedItem.tsx:254` | Wire bookmark toggle to new endpoint |
| `Notifications.tsx` | Map all `NotificationType` + metadata to V1 icon/link behavior |

### DoD
- Vote, comment, claim decide, dispute file/decide, deletion submit all create in-app notifications.
- Bookmark icon persists across refresh.

---

## Day 4 — Background jobs, cron & weekly momentum

**Theme:** Window scores stay current; platform stats match V1.

### Backend
| Task | Detail |
|------|--------|
| `POST /cron/weekly-momentum` | Port V1 `cron/weekly-momentum/route.ts`: auth via `CRON_TOKEN` or admin session |
| Job logic | Rolling 7-day window; recompute W1 deltas per account from events/ledger; update user momentum fields |
| `GET /cron/weekly-momentum` | Health/info endpoint (V1 has GET) |
| `GET /stats` | Add `filings_last_7`, `ai_agreement_rate` for admin dashboard |
| `GET /people/deck` | Include `weekDelta` from `window_scores.w1Delta` |
| `GET /accounts/` list | Include `weekly_delta` for Ranks "Under Fire" |

### Frontend
| Task | Detail |
|------|--------|
| `AdminDashboard.tsx:53,96,120` | Wire real stats + time-series (queue depth, filings/7d, AI agreement) |
| `Ranks.tsx:36,122` | Region filter + "Under Fire" from `weekly_delta` |
| `Leaderboard.tsx` | Add weekly delta column (V1 `weeklyDelta()` from score history) |
| `Impact.tsx:162` | Wire global rank from stats/impact API |

### DoD
- Manual cron trigger updates window scores; People deck and Ranks show week delta.
- Admin dashboard shows live metrics, not hardcoded zeros.

---

## Day 5 — Admin panel completion

**Theme:** All 39 admin endpoints fully functional; no stubs.

### Backend
| Task | Detail |
|------|--------|
| `POST /admin/accounts/{id}/evidence/scan` | Wire `scanPublicEvidence` integration; remove `scan_stubbed` |
| `GET/PATCH/DELETE /admin/data/{collection}/{record_id}` | Implement generic data browser CRUD (or dedicated per-collection handlers) |
| `POST /admin/data/{collection}` | Record create (V1 has POST on collection) |
| `UserUpdateRequest` admin patch | Expand: role, all profile fields, `is_active` |
| Account admin patch | Expand fields locked in V1 `adminData.ts` where appropriate |
| `GET /admin/actions` | Batch user lookup for actor resolution |

### Frontend
| Task | Detail |
|------|--------|
| `AdminData.tsx:95` | Wire `DataCenterPanel`-style browser or full inline CRUD |
| `AdminUsers.tsx:212` | Full user edit form |
| `AdminAccounts.tsx:273` | Full account edit form |
| `AdminActivity.tsx:78` | Resolve `actor_user_id` → username |
| `AdminEvidence.tsx:121` | Remove stub warning after backend wired |
| `AdminQueue` / `AdminReview` | Verify scoring UI complete (Day 2 dependency) |

### DoD
- Admin can browse/edit any collection record via data center.
- Evidence scan returns real proposals.
- Activity log shows human-readable actor names.

---

## Day 6 — User-facing flows: feed, people, accounts, claims

**Theme:** All core browsing and filing flows match V1.

### Backend
| Task | Detail |
|------|--------|
| `GET /feed` | Support `tab=following` (filter by follow graph) and `tab=near` (location/city) |
| Feed response | Include vote aggregates per report |
| `GET /me/swipe-aggregate` | Swipe stats for People score breakdown |
| `POST /accounts/{id}/audit` | User-initiated audit request (port V1) |
| `DELETE /accounts/{id}/dossier-unfollow` | Dossier unfollow |
| `GET /users/{id}/connections` | Verify follower counts exposed for Profile |
| Claims | `ClaimProfileModal.tsx:71` — evidence via `POST /media/upload` (S3) |

### Frontend
| Task | Detail |
|------|--------|
| `Feed.tsx`, `Dashboard.tsx` | Implement Following + Near You tabs (remove "coming soon") |
| `lib/feed.ts:10,13` | Wire tab filters |
| `api/feed.ts:25` | Enrich with vote aggregates |
| `Profile.tsx:147` | Wire follower counts |
| `SwipeScoreBreakdownCard.tsx:31` | Wire `/me/swipe-aggregate` |
| `DossierActions.tsx:43` | Wire audit POST |
| `ClaimProfileModal.tsx:71-74` | Real S3 upload, remove mock URL |
| `Settings.tsx` | Deletion request attachment upload (match V1 modal) |
| `FeedShareCard.tsx:44` | Fix proxy path: `/api/v1/proxy-image` |

### DoD
- All three feed tabs return real filtered data.
- Claim with evidence file succeeds end-to-end.
- Profile shows follower count; People swipe breakdown populated.

---

## Day 7 — Remaining pages, polish & V2-only cleanup

**Theme:** Every routed page FULL; remove placeholders and orphans.

### Frontend pages to close
| Page | Task |
|------|------|
| `Billing.tsx` | Either implement subscription management UI or redirect to `/profile/upgrade` and remove stub |
| `ProfileImpactAnalytics.tsx:122` | Range selector (1D / 1W / 1M) |
| `ShareCardModal.tsx:70`, `AccountShareButton.tsx:52` | PDF export via jspdf |
| `CreateBubbleFlow.tsx:66` | Image crop modal |
| `Bubbles` leaderboard UI | Consume real bubble scores (post Day 4 denormalization if needed) |
| `PublicProfile.tsx` | Credibility + social links from stored user fields |
| `AccountSearch`, `Accounts`, `AccountNew` | Verify parity with V1 account creation/search UX |

### Backend
| Task | Detail |
|------|--------|
| `bubbles.py:101` | Denormalize `score`, `member_count` on bubbles table; fix leaderboard sort |
| `GET /api/og` equivalent | Port OG image route or document as out-of-scope* |

\*OG is share/marketing — include if "complete website" means share cards work fully; otherwise defer to post-Day-8.

### Cleanup
| Task | Detail |
|------|--------|
| Delete or unroute | `Login.tsx`, `Onboarding.tsx`, `Subscribe.tsx`, orphan `Admin.tsx` |
| Remove all 37 TODO/stub markers from audit | Grep verification pass |
| `trust_badge_service.py:70-73` | Add Account `credibility` or proper scoring hook (replace score=1000 proxy) |

### DoD
- Zero "coming soon" / placeholder pages in active routes.
- Share card PDF download works.
- Bubble leaderboard sorts by score.

---

## Day 8 — Integration, parity verification & hardening

**Theme:** Nothing left; sign-off checklist.

### Full parity test matrix (manual + automated where exists)

| Area | Verification |
|------|--------------|
| **Auth** | Google, email, phone OTP; session sync; logout; deletion request |
| **Onboarding** | All 24 fields required on complete; credibility reaches 80%; draft save |
| **Profile** | View/edit all fields; public profile; upgrade/trust badge Razorpay flow |
| **Accounts** | Create, search, detail, score panel, history, windows, share, audit, follow |
| **Reports** | Create, vote, comment, bookmark, moderate queue, admin adjudicate with scoring |
| **Feed** | For You / Following / Near You |
| **People** | Deck, swipe, aggregate breakdown, week delta |
| **Bubbles** | Create, join, join-request vote, leaderboard |
| **Disputes & claims** | File, withdraw, admin decide + notifications |
| **Admin (all 18 pages)** | Queue, review, moderation, claims, disputes, evidence, audits, abuse, users, accounts, deletion, trust badge, issues, activity, settings, data, create, feed |
| **Notifications** | All 15 V1 trigger types |
| **Scoring** | Workbook formula, profile multipliers, W1/W2/W3, weekly cron |
| **API** | Cross-check all 95 V1 routes have V2 equivalent (path map doc) |

### Hardening
| Task | Detail |
|------|--------|
| Error handling | 404/403 messages match V1 tone |
| Rate limits | Auth + report creation limits verified |
| Mock mode | `USE_MOCKS` paths still work for local dev |
| Type safety | Frontend API clients match all backend routes |
| Final grep | `TODO|FIXME|coming soon|stub|not implemented` → 0 in `frontend/src` and `backend/app` |

### Deliverable
**Parity sign-off document:** table of every V1 route/API/page vs V2 status = FULL.

---

## Scope checklist — nothing deferred

Every audit gap mapped to a day:

| # | Gap | Day |
|---|-----|-----|
| 1 | 18 onboarding fields not persisted | 1 |
| 2 | EditProfile incomplete | 1 |
| 3 | Credibility proxy on Dashboard | 2 |
| 4 | DEFAULT_MULTIPLIERS on moderate | 2 |
| 5 | Admin scoring fields not sent | 2 |
| 6 | score-history endpoint | 2 |
| 7 | score-windows endpoint | 2 |
| 8 | 8 missing notification triggers | 3 |
| 9 | Bookmark toggle API | 3 |
| 10 | weekly-momentum cron | 4 |
| 11 | Admin dashboard stub metrics | 4 |
| 12 | Ranks region + Under Fire | 4 |
| 13 | Leaderboard weekly delta | 4 |
| 14 | Impact global rank | 4 |
| 15 | Evidence scan stub | 5 |
| 16 | Admin data CRUD not_implemented | 5 |
| 17 | Admin user/account limited patch | 5 |
| 18 | Activity actor username resolution | 5 |
| 19 | Following/Near You feed | 6 |
| 20 | Feed vote aggregates | 6 |
| 21 | /me/swipe-aggregate | 6 |
| 22 | POST /accounts/{id}/audit | 6 |
| 23 | dossier-unfollow | 6 |
| 24 | Follower counts | 6 |
| 25 | Claim evidence S3 upload | 6 |
| 26 | Deletion attachment upload | 6 |
| 27 | proxy-image path fix | 6 |
| 28 | Billing placeholder | 7 |
| 29 | PDF export | 7 |
| 30 | Bubble crop modal | 7 |
| 31 | Bubble leaderboard score sort | 7 |
| 32 | Impact range selector | 7 |
| 33 | Trust badge credibility proxy | 7 |
| 34 | Orphan placeholder pages | 7 |
| 35 | Razorpay webhook notifications | 3 |
| 36 | Moderation-request notify admins | 3 |
| 37 | Full parity verification | 8 |

---

## Risk notes

| Risk | Mitigation |
|------|------------|
| Day 1 migration breaks existing users | Nullable columns; backfill script for dev |
| Scoring regressions | Port V1 `tests/scoring.test.ts` to pytest on Day 2 |
| 8 days is aggressive for 37 gaps | Days 1–4 are blocking; if slip occurs, cut Day 7 polish (PDF, crop) last |
| OG image route | Low user impact; include in Day 7 only if share-to-social is required |

---

## End state (Day 8)

| Area | Target |
|------|--------|
| Pages/Routes | **100%** FULL |
| API Endpoints | **100%** (V1 parity + V2 path equivalents documented) |
| Admin Features | **100%** FULL |
| Onboarding Fields | **100%** (24/24) |
| Notification Triggers | **100%** (15/15) |
| Background Jobs | **100%** (weekly-momentum live) |
| Scoring Engine | **100%** (formula + windows + profile multipliers + cron) |

Frontend and backend complete. Deployment remains a separate phase after sign-off.

