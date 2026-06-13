# V1 → V2 Parity Status

Master gap-tracking document. Updated after **Day 8 (parity hardening)**, **Phase 2 Day 7** (credibility wiring, OG images, billing redirect, bubble polish), and **Days 20–21** (data foundation + scoring core).

- **V1 reference:** `C:\Others\project\Builtattic\Shoshaaahhh`
- **V2 target:** this repository (`shosha`)
- **Master plan:** [V1_TO_V2_PARITY_AUDIT.md](./V1_TO_V2_PARITY_AUDIT.md) — gap audit (Tasks 1–10) + 8-day execution plan; live progress tracked here and in [PHASE_2_PLAN.md](./PHASE_2_PLAN.md)

---

## What shipped in Day 8 (parity hardening)

> Label disambiguates this sprint from the original roadmap Day 8 in [PHASE_2_PLAN.md](./PHASE_2_PLAN.md).

### Item 1 — Profile score multipliers from user onboarding
- `calc_profile_scores_from_user()`, `profile_multipliers_from_user()`, `resolve_report_multipliers()` in `scoring_service.py` (ported V1 `calcProfileScores` lookup tables)
- `reputation` multiplier hardcoded to `1.0` (no V2 `reporterScore` mapping yet)
- Wired into `moderate_report()` and `admin_create_report()` (replaces `DEFAULT_MULTIPLIERS` on those paths)
- `pytest tests/test_profile_multipliers.py` (7 tests)

### Item 2 — LiveAccountScorePanel + PublicProfile UI
- `LiveAccountScorePanel.tsx`: `profile_credibility`, `weekly_delta` (or "Pending"), follower counts via `getPublicUser(linkedUserId)`
- `PublicProfile.tsx`: `profile_credibility` + `account.social_links` (all links shown — no V1 `canViewProfileField` gating; intentional divergence)

### Item 3 — AdminQueue inline quick-adjudicate
- Expandable **Quick adjudicate** reuses `AdminReviewControls` / full `moderateReport` payload per row
- `AdminReview.tsx` unchanged

### Item 4 — Cron ops documentation
- `DEPLOYMENT.md` + `PROJECT_SETUP.md`: `CRON_TOKEN`, POST/GET curl for `/api/v1/cron/weekly-momentum`
- `backend/scripts/verify_weekly_momentum_cron.py` — local ASGI verification

### Item 5 — V1 rate limits (Upstash; skip silently when unset)
| Route | Limit | Key |
|-------|-------|-----|
| `POST /ai/analyze` | 30/h | `ai:analyze:{user_id}` |
| `POST /ai/classify` | 20/h | `ai:classify:{user_id}` |
| `GET /accounts/search` | 60/min | `search:{client_ip}` |
| `POST /claims` | 3/day | `claims:{user_id}` |
| `POST /events` | 10/h | `events:{user_id}` (Redis prefix `rl:events`) |

**Deferred:** events subscription tier daily cap (free=5 / pro=50).

### Item 6 — Community vote auto-discard (Rule A only)
- `vote_on_report()` auto-rejects when PENDING report hits `disputeThreshold` (default 3) with ≥⅔ opposes
- **Status guard:** `PENDING` only (V1 uses `status !== 'rejected'` — documented intentional divergence)
- No ledger reversal on community discard (V1 parity)
- `get_or_create_system_actor()` (`username=shosha_system`) + `AdminAction` audit + `emit_report_notification` on reject
- **Rule B deferred:** `reports.dispute_status` column missing — needs Alembic migration

### Item 7 — Cleanup
- Removed stale TODO in `DossierActions.tsx` (audit endpoint wired Day 6)
- This doc + [CONTEXT.md](./CONTEXT.md) updated

### Day 8 verification
- `pytest` — `test_profile_multipliers`, `test_credibility_service`, `test_community_auto_reject` (17 passed)
- `npx tsc --noEmit` — clean

---

## What shipped in Phase 2 (Day 7)

### Credibility (items 1–5)
- `backend/app/services/credibility_service.py` — ports `calcCredibility` + `calcProfileCredibility` from frontend TS
- Alembic `d7a1b2c3e4f5`: `users.credibility` (int, default 0)
- `PATCH /users/me` recomputes and persists `credibility` after profile updates
- Trust-badge approve recomputes `credibility` (+20 verification); **removed** website `score=1000` proxy reset
- Razorpay webhook `subscription.cancelled` / `subscription.completed` clears badge and recomputes `credibility`
- `GET /users/me` exposes `credibility` + computed `profile_credibility` (`opposed_posts` from owned website account)
- `GET /accounts/{id}` exposes `profile_credibility`
- Frontend: `Dashboard.tsx` uses API `profile_credibility` (no client `calcCredibility` for gauge); `Onboard.tsx` still uses client calc for live panel
- `pytest` + `backend/tests/test_credibility_service.py` (5 tests)

### OG + share (items 6, 8)
- `GET /api/v1/og?id={account_uuid}` — Pillow PNG, **no auth** (crawler-safe)
- `AccountDetail.tsx` / `PublicProfile.tsx` inject `og:image` meta via `lib/ogMeta.ts`
- `ShareCardModal.tsx` — PDF export via dynamic `jspdf` import (PNG unchanged)

### Routing + bubbles + cleanup (items 7, 9–12)
- `/billing` → redirect to `/profile/upgrade`; deleted orphan `Billing.tsx`
- `CreateBubbleFlow.tsx` — `react-easy-crop` modal (cover 16:6, avatar 1:1) before `uploadMedia`
- Bubble detail members sorted by live profile score (`owner_profile_score` helper)
- `AccountDetail.tsx` displays `profile_credibility` + social links (from account response)
- Deleted orphan stubs: `Login.tsx`, `Onboarding.tsx`, `Subscribe.tsx`, `Admin.tsx` (admin lives under `pages/admin/`)

### Still deferred (Day 7 triage — partially cleared Day 8)
- Inter-bubble leaderboard denormalized scores (`bubbles.py` TODO)
- ~~`LiveAccountScorePanel` followers count wiring~~ **Done (Day 8)**
- ~~`AdminQueue` quick-moderate adjudicate payload~~ **Done (Day 8)**
- Evidence scan stub
- `region` onboard field / ranks filter
- Community vote **Rule B** (`dispute_status`) — migration pending
- Events tier daily cap (free=5 / pro=50)

### Day 7 manual verification (2026-06-13)

Automated gates: `pytest tests/test_credibility_service.py` (5/5), `npx tsc --noEmit` (clean).

| Check | Result | Notes |
|-------|--------|-------|
| `GET /api/v1/og?id={uuid}` (no `Authorization`) | **PASS** — HTTP 200, `image/png`, ~25 KB | Fixed startup blocker: invalid `raise_api_error(...) from None` in `misc.py` (function call, not `raise`) |
| `GET /accounts/{id}` `profile_credibility` | **PASS** — live API matches serializer | `seed_account_01` → 22, `seed_account_02` → 62, `seed_account_08` → 8 |
| Seed user credibility (`GET /users/me` serializer path) | **PASS** — no red flags | See table below |
| `/billing` → `/profile/upgrade` | **PARTIAL** | Route redirect wired (`routes/index.tsx`); `/profile/upgrade` is behind `AppRoute` — unauthenticated users chain to `/sign-in`. Authenticated E2E not run in verification session (real Firebase env, `VITE_USE_MOCKS=false`). |
| Share modal PDF download | **PARTIAL** | `jspdf` smoke test passed; full modal flow needs signed-in user (same auth constraint). |

**Seed credibility spot-check** (serializer ≡ `GET /users/me` response fields):

| User | Trust badge | `credibility` (stored) | `profile_credibility` | Assessment |
|------|-------------|------------------------|----------------------|------------|
| `seed_admin` | no | 0 | 22 | OK — sparse seed profile; stored `0` until PATCH/badge/webhook |
| `seed_full1` | yes | 0 | 62 | OK — computed 42 + badge bonus → 62 |
| `seed_incomplete1` | no | 0 | 8 | OK — incomplete onboarding |

**Not yet done:** batched git commits (Day 6 + Day 7 working tree); full TODO inventory in docs.

---

| Area | V1 baseline | V2 status | % complete* |
|------|-------------|-----------|-------------|
| Pages / routes | 55 routable pages | 41 FULL · 11 PARTIAL · 0 missing | **~78%** |
| API endpoints | ~95 handlers (+ OG) | ~112 handlers; 3 gaps + stubs | **~85%** |
| Admin features | 20 tracked | 13 FULL · 7 PARTIAL | **65%** |
| Onboarding fields | 24 fields | 23 persisted · 1 not collected (`region`) | **96%** |
| Notification triggers | 15 types | 15 implemented | **100%** |
| Background jobs | 2 planned | 1 (weekly-momentum cron); schedule externally | **50%** |
| Scoring components | 8 | 7 full · 1 partial · 0 missing | **~94%** |
| Rate limits (V1 routes) | 8 tracked | 8 wired (Upstash optional) | **100%** |

\* `(FULL + 0.5 × PARTIAL) / total × 100`

---

## What shipped in Phase 2 (Days 20–21)

### Day 20 — User profile & onboarding (data foundation)
- Alembic `02868f72cba7`: all V1 onboarding columns on `users` (phone, dob, country, quote, 6 profile questions, 8 social URLs)
- `UserUpdateRequest` / `UserPrivate` / `UserPublic` expose credibility-relevant fields; URL validators on social links
- `PATCH /users/me`, `GET /users/me`, `GET /users/{id}` persist and return full profile
- `GET /users/username-availability` wired in `Onboard.tsx`
- Frontend: `Onboard.tsx` sends full payload; `EditProfile.tsx` full field editor; `types/user.ts` extended
- ~~`Dashboard.tsx` runs `calcCredibility()` from stored `UserPrivate`~~ → **Day 7:** Dashboard uses API `profile_credibility`

### Day 21 — Scoring engine core (partial)
- `ModerationDecisionRequest`: category, deed, base_score, repetition_pattern, intent, circumstances, final_impact, note
- `POST /reports/{id}/moderate` resolves deed/base_score and calls `profile_multipliers_from_account()` + `apply_report_score()`
- `GET /accounts/{id}/score-history`, `GET /accounts/{id}/score-windows`; account detail includes `score_history`, `window_scores`, `score_breakdown`
- Alembic `b7d2f4a9c1e3`: account workbook columns for multiplier lookup
- Frontend: `AdminReviewControls.tsx` sends full adjudicate payload; `AccountDetail.tsx` wires history + W1/W2/W3

### Still open from Days 20–21 (partially cleared Day 8)
- ~~`profile_multipliers_from_user()`~~ **Done (Day 8)** — moderate + admin create use user onboarding lookup tables; `reputation=1.0`
- No sync from user onboarding → account workbook columns (multipliers read user at moderate time, not stored on account)
- Enum validators on profile question slugs (stored as strings; V1 option sets not enforced server-side)
- `region` on user model but not collected in onboard UI
- ~~`LiveAccountScorePanel.tsx` — followers + credibility still stubbed~~ **Done (Day 8)**
- `DEFAULT_MULTIPLIERS` still used on evidence-proposal path only

---

## What shipped in Days 1–19

### Backend
- FastAPI app with **108 route handlers** under `/api/v1` (+ `/health`, `/webhooks/razorpay`)
- Postgres models: users, accounts, reports, votes, comments, bookmarks, claims, disputes, bubbles, notifications, ledger, admin actions, and related tables
- Routers: auth, users, social, me, accounts, reports, feed, people, bubbles, claims, disputes, notifications, admin, media, discovery, impact, events, ai, imports, misc, payments, webhooks
- Gemini integration for AI analyze/classify
- Razorpay order/verify + webhook (status updates + cancel/payment-failed notifications)

### Frontend
- **55+ routable pages** including public, auth, app, legal, and 19 admin pages
- Core flows wired: sign-in, onboard, dashboard, feed, reports, accounts, bubbles, people (partial), disputes, bookmarks, notifications, search, impact, ranks, upgrade
- Admin shell with moderation, claims, disputes, evidence, audits, abuse, users, accounts, settings, and more

### Still stubbed or partial (high level)
- ~~Profile score multipliers from user onboarding~~ **Done (Day 8)**
- ~~`AdminQueue.tsx` quick-moderate~~ **Done (Day 8)** — inline quick adjudicate; full review page unchanged
- Weekly-momentum cron implemented; schedule externally — see [DEPLOYMENT.md](./DEPLOYMENT.md#scheduled-jobs--weekly-momentum)
- Evidence scan returns empty proposals
- Community vote Rule B (`dispute_status`) — deferred pending migration

### Day 6 — feed, profile, audit (shipped)
- **Following feed:** `GET /feed?filter=following` — approved reports where `reporter_user_id` is in the current user's `user_follows.following_id` set. This is **user-follow → reporter** semantics, not account/dossier subscribe.
- **Near You feed:** `GET /feed?filter=near` — approved reports where the reporter's onboarded `users.city` matches the viewer's city (case-insensitive). Returns `empty_reason: insufficient_location_data` when the viewer has no city. Does **not** use `accounts.region` (workbook field).
- **`GET /me/swipe-aggregate`:** aggregate over `swipe_records` for profile swipe breakdown.
- **Feed aggregates:** `FeedReportOut` on `GET /feed` includes `align_count`, `oppose_count`, `comment_count`, `viewer_vote`.
- **`POST /accounts/{id}/audit`:** user-facing audit request with service-layer dedupe on open `(user_id, account_id)`.
- **Profile counts:** `followers_count` / `following_count` on `UserPublic` / `UserPrivate`.
- **Claims S3:** `ClaimProfileModal` uses `POST /media/upload` for evidence URLs in `evidence_payload` JSONB.

### Dossier-unfollow (deferred)
- V1 route `DELETE /accounts/{id}/dossier-unfollow` remains unimplemented. No `account_follows` table in V2. Day 6 Following feed uses `user_follows` only. Future options: add `account_follows` table after V1 reference confirms behavior, or defer if user-follow semantics suffice.

---

## Page parity matrix

| V1 route | V2 route | V2 page | Status |
|----------|----------|---------|--------|
| `/` | `/` | `Landing.tsx` | FULL |
| `/how-it-works` | `/how-it-works` | `HowItWorks.tsx` | FULL |
| `/leaderboard` | `/leaderboard` | `Leaderboard.tsx` | PARTIAL — 7d Δ column wired from `weekly_delta`; scope buttons still display-only |
| `/report-issue` | `/report-issue` | `ReportIssue.tsx` | FULL |
| `/trust-badge` | `/trust-badge` | `TrustBadge.tsx` | FULL |
| `/profile/[id]` | `/profile/:id` | `PublicProfile.tsx` | PARTIAL — credibility + social links wired (Day 8); no field-level privacy gating |
| `/[slug]` | `/:slug` | `SlugPage.tsx` | FULL |
| `/sign-in` | `/sign-in` | `SignIn.tsx` | PARTIAL — V2 adds phone/OTP |
| `/sign-up` | `/sign-up` → redirect | — | FULL |
| `/onboard` | `/onboard` | `Onboard.tsx` | FULL — all fields persisted; `region` not collected |
| `/dashboard` | `/dashboard` | `Dashboard.tsx` | PARTIAL — credibility from API `profile_credibility` (Day 7); feed tabs wired (following/near/top) |
| `/feed` | `/feed` | `Feed.tsx` | PARTIAL — following/near/top filters wired; shares stat client-only |
| `/profile` | `/profile` | `Profile.tsx` | PARTIAL — follower counts + swipe aggregate wired |
| `/profile/edit` | `/profile/edit` | `EditProfile.tsx` | FULL |
| `/profile/upgrade` | `/profile/upgrade` | `ProfileUpgrade.tsx` | FULL |
| `/account/[id]` | `/accounts/:id` | `AccountDetail.tsx` | PARTIAL — score history + windows wired; user audit wired |
| `/people` | `/people` | `People.tsx` | PARTIAL — swipe aggregate on profile wired |
| `/search` | `/search` | `Search.tsx` | FULL |
| `/notifications` | `/notifications` | `Notifications.tsx` | FULL |
| `/bookmarks` | `/bookmarks` | `Bookmarks.tsx` | FULL — toggle wired in feed |
| `/disputes` | `/disputes` | `Disputes.tsx` | FULL |
| `/impact` | `/impact` | `Impact.tsx` | PARTIAL — global rank wired via `/me/score/replay` |
| `/ranks` | `/ranks` | `Ranks.tsx` | PARTIAL — Under Fire wired; region filter blocked on Day 20 onboarding |
| `/access` | `/access` | `Access.tsx` | FULL |
| `/settings` | `/settings` | `Settings.tsx` | PARTIAL — deletion attachment; prefs localStorage |
| `/bubbles` | `/bubbles` | `Bubbles.tsx` | FULL |
| `/bubbles/[id]` | `/bubbles/:id` | `BubbleDetail.tsx` | FULL |
| `/bubbles/create` | `/bubbles/new` | `BubbleNew.tsx` | PARTIAL — image crop TODO |
| `/post/[id]` | `/reports/:id` | `ReportDetail.tsx` | FULL |
| `/legal-policies/*` | `/legal-policies/*` | `legal/LegalHub.tsx`, `LegalPage.tsx` | FULL |
| `/admin` | `/admin` | `admin/AdminDashboard.tsx` | PARTIAL — filings (7d) + queue depth wired; chart time-series TODO; `ai_agreement_rate` null until audit field exists |
| `/admin/queue` | `/admin/queue` | `admin/AdminQueue.tsx` | PARTIAL — inline quick adjudicate wired (Day 8); full review page for deep review |
| `/admin/moderation` | `/admin/moderation` | `admin/AdminModeration.tsx` | FULL |
| `/admin/review/[id]` | `/admin/review/:id` | `admin/AdminReview.tsx` | PARTIAL — full adjudicate via `AdminReviewControls` |
| `/admin/claims` | `/admin/claims` | `admin/AdminClaims.tsx` | FULL |
| `/admin/disputes` | `/admin/disputes` | `admin/AdminDisputes.tsx` | FULL |
| `/admin/evidence` | `/admin/evidence` | `admin/AdminEvidence.tsx` | PARTIAL — scan stubbed |
| `/admin/audits` | `/admin/audits` | `admin/AdminAudits.tsx` | FULL |
| `/admin/abuse` | `/admin/abuse` | `admin/AdminAbuse.tsx` | FULL |
| `/admin/users` | `/admin/users` | `admin/AdminUsers.tsx` | PARTIAL — limited patch schema |
| `/admin/accounts` | `/admin/accounts` | `admin/AdminAccounts.tsx` | PARTIAL |
| `/admin/deletion-requests` | `/admin/deletion-requests` | `admin/AdminDeletionRequests.tsx` | FULL |
| `/admin/trust-badge` | `/admin/trust-badge` | `admin/AdminTrustBadge.tsx` | FULL |
| `/admin/issues` | `/admin/issues` | `admin/AdminIssues.tsx` | FULL |
| `/admin/activity` | `/admin/activity` | `admin/AdminActivity.tsx` | PARTIAL — actor IDs not resolved |
| `/admin/settings` | `/admin/settings` | `admin/AdminSettings.tsx` | FULL |
| `/admin/data` | `/admin/data` | `admin/AdminData.tsx` | PARTIAL — generic CRUD not implemented |
| `/admin/create` | `/admin/create` | `admin/AdminCreate.tsx` | FULL |
| `/admin/feed` | `/admin/feed` | `admin/AdminFeed.tsx` | FULL |

### V2-only routes
`/accounts`, `/accounts/search`, `/accounts/new`, `/reports/new`, `/billing` (stub), `/account/:id` redirect.

### Orphan files (not routed)
`pages/Login.tsx`, `pages/Onboarding.tsx`, `pages/Subscribe.tsx`, `pages/Admin.tsx` (legacy).

---

## API gaps

### Missing vs V1
| V1 route | Gap |
|----------|-----|
| ~~`POST /accounts/[id]/audit`~~ | **Done (Day 6)** — `POST /api/v1/accounts/{id}/audit` |
| `DELETE /accounts/[id]/dossier-unfollow` | No dossier unfollow — deferred; see Day 6 note (no `account_follows` table) |
| ~~Bookmark toggle~~ | Done — `POST /reports/{id}/bookmark` |
| ~~`GET /me/swipe-aggregate`~~ | **Done (Day 6)** |
| `POST/GET /cron/weekly-momentum` | **Done** — persists `w1/w2/w3_delta` via `sum_deltas_by_age`; auth via `CRON_TOKEN` or admin |
| `GET /api/og` | OG image generation missing |
| `POST /admin/data/[collection]` | Collection record create missing |
| `GET/PATCH/DELETE /admin/data/{collection}/{id}` | Returns `not_implemented` |

### Stub / partial endpoints
| Endpoint | Issue |
|----------|-------|
| `POST /admin/accounts/{id}/evidence/scan` | Returns `proposals: []`, `scan_stubbed` |
| `POST /reports/{id}/moderate` | Full adjudicate + `profile_multipliers_from_user()` (Day 8) |
| `POST /admin/reports` (create) | Uses `resolve_report_multipliers` (Day 8) |
| `GET /bubbles/leaderboard` | Sorts by created_at/member count, not bubble score |
| `POST /webhooks/razorpay` | Notifies on cancel/halt; no notification on `subscription.charged` (V1 parity) |

---

## Onboarding field parity

| Field | Sent to backend? | In schema? |
|-------|------------------|------------|
| display_name, username, city, photo_url, bio, onboarding_complete | Yes | Yes |
| phone, dob, country, quote | Yes | Yes |
| occupation_role, network_size, education, specialized_field, manages_money_people_system, physical_intellectual_limitations | Yes | Yes |
| ig_url, tiktok_url, x_url, linkedin_url, reddit_url, yt_url, fb_url, snapchat_url | Yes | Yes |
| region | No (not in onboard UI) | Yes |

**Impact:** credibility and profile display use stored data. **Score multipliers** resolve from linked user onboarding at moderate time (Day 8).

---

## Notification triggers

| Trigger | V1 | V2 |
|---------|----|----|
| Report approved/rejected | Yes | Yes |
| Community auto-reject (Rule A) | Yes | Yes (Day 8; PENDING-only guard) |
| Moderation resolved | Yes | Yes |
| Trust badge decided | Yes | Yes |
| Deletion resolved | Yes | Yes |
| Abuse dismissed | Yes | Yes |
| Vote align/oppose | Yes | Yes |
| Comment | Yes | Yes |
| Moderation requested (admins) | Yes | Yes |
| Claim decided | Yes | Yes |
| Dispute filed/decided | Yes | Yes |
| Deletion submitted | Yes | Yes |
| Razorpay payment failed/cancelled | Yes | Yes |

---

## Prioritized punch list

### P0 — Blocks core user flows
1. ~~Persist onboarding credibility fields (User model + Onboard payload)~~ **Done (Day 20)**
2. ~~Admin adjudicate with scoring fields (deed, baseScore, intent, circumstances, repetitionPattern)~~ **Done (Day 21)** — use `AdminReview`, not `AdminQueue`
3. ~~`profile_multipliers_from_user()`~~ **Done (Day 8)**
4. ~~Bookmark toggle API + FeedItem wire-up~~ **Done (Day 3 parity sprint)**
5. ~~Notification triggers for votes, comments, claims, disputes, moderation-create, deletion-create~~ **Done (Day 3 parity sprint)**
6. ~~`POST /cron/weekly-momentum` for leaderboard weekly delta~~ **Done (Day 4)** — schedule with `CRON_TOKEN`

### P1 — Acknowledged TODOs
7. ~~Score history + score windows endpoints~~ **Done (Day 21)**
8. ~~`/me/swipe-aggregate`~~ **Done (Day 6)**
9. ~~Following / Near You feed filters~~ **Done (Day 6)**
10. Evidence scan integration
11. Admin dashboard metrics (filingsLast7, aiAgreementRate, time-series)
12. ~~Claim evidence S3 upload~~ **Done (Day 6)**
13. ~~`POST /accounts/{id}/audit`~~ **Done (Day 6)**
14. Generic admin data CRUD
15. ~~Razorpay webhook notifications~~ **Done (Day 3 parity sprint)** — cancel + payment-failed emits
16. ~~`LiveAccountScorePanel` — followers + credibility from API~~ **Done (Day 8)**
17. Strict enum validators on onboarding slug fields
18. Community vote Rule B (`dispute_status` migration + port)
19. Events tier daily cap (free=5 / pro=50)

### P2 — Nice-to-have
20. PDF share export, impact range selector, bubble crop, ranks region filter, OG route, orphan page cleanup, proxy-image path fix

---

## Related docs

- [PHASE_2_PLAN.md](./PHASE_2_PLAN.md) — day-by-day plan for P0/P1 work
- [API_SPEC.md](./API_SPEC.md) — original MVP contract (superseded in places by implementation)
