# V1 → V2 Parity Status

Master gap-tracking document. Updated after **Phase 2 Day 6** (feed filters, aggregates, profile counts, audit, claims S3) and **Days 20–21** (data foundation + scoring core).

- **V1 reference:** `C:\Others\project\Builtattic\Shoshaaahhh`
- **V2 target:** this repository (`shosha`)
- **Master plan:** [V1_TO_V2_PARITY_AUDIT.md](./V1_TO_V2_PARITY_AUDIT.md) — gap audit (Tasks 1–10) + 8-day execution plan; live progress tracked here and in [PHASE_2_PLAN.md](./PHASE_2_PLAN.md)

---

## Summary scorecard

| Area | V1 baseline | V2 status | % complete* |
|------|-------------|-----------|-------------|
| Pages / routes | 55 routable pages | 41 FULL · 11 PARTIAL · 0 missing | **~78%** |
| API endpoints | ~95 handlers (+ OG) | ~112 handlers; 3 gaps + stubs | **~85%** |
| Admin features | 20 tracked | 13 FULL · 7 PARTIAL | **65%** |
| Onboarding fields | 24 fields | 23 persisted · 1 not collected (`region`) | **96%** |
| Notification triggers | 15 types | 15 implemented | **100%** |
| Background jobs | 2 planned | 1 (weekly-momentum cron); schedule externally | **50%** |
| Scoring components | 8 | 5 full · 2 partial · 1 missing | **75%** |

\* `(FULL + 0.5 × PARTIAL) / total × 100`

---

## What shipped in Phase 2 (Days 20–21)

### Day 20 — User profile & onboarding (data foundation)
- Alembic `02868f72cba7`: all V1 onboarding columns on `users` (phone, dob, country, quote, 6 profile questions, 8 social URLs)
- `UserUpdateRequest` / `UserPrivate` / `UserPublic` expose credibility-relevant fields; URL validators on social links
- `PATCH /users/me`, `GET /users/me`, `GET /users/{id}` persist and return full profile
- `GET /users/username-availability` wired in `Onboard.tsx`
- Frontend: `Onboard.tsx` sends full payload; `EditProfile.tsx` full field editor; `types/user.ts` extended
- `Dashboard.tsx` runs `calcCredibility()` from stored `UserPrivate` (no score proxy)

### Day 21 — Scoring engine core (partial)
- `ModerationDecisionRequest`: category, deed, base_score, repetition_pattern, intent, circumstances, final_impact, note
- `POST /reports/{id}/moderate` resolves deed/base_score and calls `profile_multipliers_from_account()` + `apply_report_score()`
- `GET /accounts/{id}/score-history`, `GET /accounts/{id}/score-windows`; account detail includes `score_history`, `window_scores`, `score_breakdown`
- Alembic `b7d2f4a9c1e3`: account workbook columns for multiplier lookup
- Frontend: `AdminReviewControls.tsx` sends full adjudicate payload; `AccountDetail.tsx` wires history + W1/W2/W3

### Still open from Days 20–21
- `profile_multipliers_from_user()` — moderate uses **Account** workbook fields, not **User** onboarding; empty accounts get neutral 1.0 multipliers
- No sync from user onboarding → account workbook columns
- Enum validators on profile question slugs (stored as strings; V1 option sets not enforced server-side)
- `region` on user model but not collected in onboard UI
- `LiveAccountScorePanel.tsx` — followers + credibility still stubbed
- `DEFAULT_MULTIPLIERS` still used on admin report-create and evidence-proposal paths

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
- Profile score multipliers do not yet read user onboarding (account workbook columns empty by default)
- `AdminQueue.tsx` quick-moderate does not send adjudicate scoring fields (use `AdminReview` for full adjudicate)
- Weekly-momentum cron implemented (`POST/GET /api/v1/cron/weekly-momentum`); run migration + set `CRON_TOKEN` before scheduling
- Evidence scan returns empty proposals

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
| `/profile/[id]` | `/profile/:id` | `PublicProfile.tsx` | PARTIAL — credibility/followers not fully wired |
| `/[slug]` | `/:slug` | `SlugPage.tsx` | FULL |
| `/sign-in` | `/sign-in` | `SignIn.tsx` | PARTIAL — V2 adds phone/OTP |
| `/sign-up` | `/sign-up` → redirect | — | FULL |
| `/onboard` | `/onboard` | `Onboard.tsx` | FULL — all fields persisted; `region` not collected |
| `/dashboard` | `/dashboard` | `Dashboard.tsx` | PARTIAL — credibility from profile; feed tabs wired (following/near/top) |
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
| `/admin/queue` | `/admin/queue` | `admin/AdminQueue.tsx` | PARTIAL — quick-moderate without adjudicate payload |
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
| `POST /reports/{id}/moderate` | Adjudicate fields supported; multipliers from account workbook (not user onboarding) |
| `POST /admin/reports` (create) | Still uses `DEFAULT_MULTIPLIERS` |
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

**Impact:** credibility and profile display use stored data. **Score multipliers** still read account workbook columns, not user onboarding — see open item `profile_multipliers_from_user()`.

---

## Notification triggers

| Trigger | V1 | V2 |
|---------|----|----|
| Report approved/rejected | Yes | Yes |
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
3. `profile_multipliers_from_user()` — map user onboarding → moderate multipliers (V1 parity)
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
16. `LiveAccountScorePanel` — followers + credibility from API
17. Strict enum validators on onboarding slug fields

### P2 — Nice-to-have
18. PDF share export, impact range selector, bubble crop, ranks region filter, OG route, orphan page cleanup, proxy-image path fix

---

## Related docs

- [PHASE_2_PLAN.md](./PHASE_2_PLAN.md) — day-by-day plan for P0/P1 work
- [API_SPEC.md](./API_SPEC.md) — original MVP contract (superseded in places by implementation)
