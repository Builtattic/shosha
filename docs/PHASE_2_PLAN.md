# Phase 2 Plan — V1 Behavioral Parity

Post–Day 19 execution plan. Goal: V2 **behaves** like V1, not just routes like V1.

**Timeline:** Days 20–31 (~12 working days)  
**Compressed MVP:** Days 20–25 (Phases 1–3 only) if time-constrained

---

## Current state (after Day 21)

Structure is largely complete:
- 55+ routable pages, 19 admin pages, 110 API handlers
- Onboarding fields persisted; credibility computed from stored profile on Dashboard
- Admin review (`AdminReviewControls`) sends full V1 adjudicate payload; score history + window endpoints live

Remaining work is **behavioral parity**: user→multiplier bridge, notifications, feed filters, cron/ranks, evidence scan.

See [PARITY_STATUS.md](./PARITY_STATUS.md) for the full gap matrix.

---

## Phase 1 — Data model truth (Days 20–21)

**Goal:** User profile and scores are real, not proxies.

### Day 20 — User model + onboarding persistence ✅
- [x] Alembic migration: add V1 onboarding fields to `users` (`02868f72cba7`)
- [x] Expand `UserUpdateRequest` / `UserPrivate` / `UserPublic` schemas
- [x] `Onboard.tsx` — send all collected fields
- [x] `EditProfile.tsx` — edit same fields (full section editor)
- [x] Wire live `GET /users/username-availability` during onboard

**Exit criteria:** Complete onboard → reload → all fields visible on Profile and PublicProfile. **Met** (except `region` not in onboard UI).

### Day 21 — Credibility + scoring multipliers (partial)
- [x] Compute `credibility` from onboarding fields (`calcCredibility` on Dashboard from `UserPrivate`)
- [ ] Backend: `profile_multipliers_from_user()` in `apply_report_score` / moderate — **uses `profile_multipliers_from_account()` instead; account workbook not synced from user**
- [x] Remove Dashboard credibility proxy (`score/10000`)
- [ ] `LiveAccountScorePanel` — wire follower counts + credibility from API

**Exit criteria:** User with full onboard gets different score multiplier than empty profile. **Not met** until user onboarding feeds moderate multipliers.

---

## Phase 2 — Admin can judge reports (Days 22–23)

**Goal:** Admin review matches V1 adjudicate behavior.

### Day 22 — Adjudicate API + admin UI (partial — started Day 21)
- [x] Extend `POST /reports/{id}/moderate` with V1 scoring payload (`ModerationDecisionRequest`)
- [x] `AdminReviewControls.tsx` — send deed, baseScore, intent, circumstances, repetitionPattern
- [ ] `AdminQueue.tsx` — quick-moderate still omits adjudicate payload
- [x] `AdminReview.tsx` — uses `AdminReviewControls` with full payload
- [ ] Optional: pre-fill from `POST /ai/classify`

**Exit criteria:** Admin moderates with custom deed/score → ledger reflects override. **Met** on `AdminReview` path; multiplier source still account workbook, not user profile.

### Day 23 — Admin dashboard + activity polish
- [ ] Backend: `filingsLast7`, `aiAgreementRate`, time-series on `/admin/stats`
- [ ] `AdminDashboard.tsx` — wire charts (remove hardcoded 0s)
- [ ] `AdminActivity.tsx` — batch user lookup for actor names
- [ ] Expand admin user/account patch schemas

**Exit criteria:** Admin home shows real 7-day filings and non-zero stats.

---

## Phase 3 — Social loop works (Days 24–25)

**Goal:** Feed, bookmarks, notifications feel alive.

### Day 24 — Bookmarks + feed enrichment
- [x] `POST /reports/{id}/bookmark` (toggle) using `report_bookmark_service` *(Day 3 parity sprint)*
- [x] `FeedItem.tsx` — wire bookmark toggle *(Day 3 parity sprint)*
- [ ] Feed API: include vote aggregates on feed items
- [ ] `api/feed.ts` — remove enrich TODO

**Exit criteria:** Bookmark from feed → `/bookmarks`; unbookmark works.

### Day 25 — Feed tabs + notification triggers
- [ ] Backend: `GET /feed?filter=following|near` with real filters
- [ ] `lib/feed.ts`, `Dashboard.tsx`, `Feed.tsx` — enable Following / Near You tabs
- [x] Notifications: vote, comment, moderation-request-to-admins *(Day 3 parity sprint)*
- [x] Notifications: claim decided, dispute filed/decided, deletion-request submitted *(Day 3 parity sprint)*

**Exit criteria:** Following tab shows followed users' reports; vote/comment creates notification.

---

## Phase 4 — Score windows & ranks (Days 26–27)

**Goal:** Leaderboard, Ranks, People, Account pages match V1 score behavior.

### Day 26 — Score history + windows + swipe aggregate (partial — started Day 21)
- [x] `GET /accounts/{id}/score-history` (from `ledger_entries`)
- [x] `GET /accounts/{id}/score-windows` (W1/W2/W3)
- [ ] `GET /me/swipe-aggregate`
- [x] Wire `AccountDetail.tsx`, `ScoreLedgerPanel.tsx`
- [ ] `SwipeScoreBreakdownCard.tsx` — needs swipe aggregate

**Exit criteria:** Account page shows score history; people swipe breakdown populated. **Partial** — account dossier met; people swipe not.

### Day 27 — Weekly momentum cron + rank surfaces
- [x] Port `POST/GET /cron/weekly-momentum` from V1 (V2: ledger delta persistence via `sum_deltas_by_age`)
- [x] Persist `w1_delta` / `w2_delta` / `w3_delta` + `momentum_updated_at` on accounts
- [x] `Leaderboard.tsx` — 7d Δ column from `weekly_delta`
- [x] `Ranks.tsx` — "Under Fire" + `weekly_delta` (region filter deferred — Day 20)
- [x] `Impact.tsx` — global rank via `/me/score/replay`

**Exit criteria:** Run cron → Leaderboard/Ranks show weekly movement like V1.

---

## Phase 5 — Remaining admin + account actions (Days 28–29)

**Goal:** Ops tooling and dossier actions complete.

### Day 28 — Evidence scan + account audit
- [ ] Wire `scanPublicEvidence` in `admin.py` (port V1 integration)
- [ ] `AdminEvidence.tsx` — remove stub warning when proposals return
- [ ] `POST /accounts/{id}/audit` — user-facing audit request
- [ ] `DossierActions.tsx` — wire audit button
- [ ] `DELETE /accounts/{id}/dossier-unfollow` (if needed for V1 parity)

**Exit criteria:** Admin scan → proposals appear; user can request audit.

### Day 29 — Claims upload + payments notifications
- [ ] `ClaimProfileModal.tsx` — `uploadMedia` for evidence (replace blob URL)
- [x] Razorpay webhook: payment failed/cancelled notifications *(Day 3 parity sprint)*
- [x] Claim decide → notification *(Day 3 parity sprint)*

**Exit criteria:** Claim with file upload works; payment failure notifies user.

---

## Phase 6 — Ship-ready cleanup (Days 30–31)

**Goal:** No dead ends; launch smoke test passes.

### Day 30 — Path fixes + partial page completion
- [ ] Fix `FeedShareCard` proxy path → `/api/v1/proxy-image`
- [ ] `PublicProfile.tsx` — follower counts + credibility from backend
- [ ] `Settings.tsx` — deletion attachment upload (or document intentional skip)
- [ ] Bubble leaderboard denormalized score OR document sort parity
- [ ] `CreateBubbleFlow.tsx` crop modal (or defer with resize-only)

**Exit criteria:** Share cards load images; public profiles show real stats.

### Day 31 — Cleanup + smoke test
- [ ] Delete or redirect orphans: `Login.tsx`, `Onboarding.tsx`, `Subscribe.tsx`, legacy `Admin.tsx`
- [ ] `Billing.tsx` → redirect to `/profile/upgrade` or implement
- [ ] Dashboard — `shosha:score-updated` live refresh (port V1 event)
- [ ] Run smoke test checklist below
- [ ] Optional: generic admin data CRUD

**Exit criteria:** Full user journey passes without placeholder text or 404 API calls.

---

## Launch smoke test (end of Phase 6)

| # | Flow |
|---|------|
| 1 | Sign in → onboard all fields → dashboard credibility ring |
| 2 | File report with media → appears in feed |
| 3 | Vote + comment → notification received |
| 4 | Bookmark toggle → `/bookmarks` |
| 5 | Follow user → Following feed tab works |
| 6 | Swipe people → swipe aggregate on profile |
| 7 | Admin review with custom scoring → score changes |
| 8 | Claim profile with evidence upload |
| 9 | Dispute file → admin decide → notification |
| 10 | Upgrade via Razorpay test mode |
| 11 | Leaderboard/Ranks show weekly delta after cron |
| 12 | Account score history + windows on dossier |

---

## If behind — cut order

1. Admin data CRUD browser  
2. PDF share export  
3. Bubble image crop  
4. OG image route  
5. Ranks region filter  
6. Generic `/admin/data` POST create  

**Never cut:** onboarding persistence, admin adjudicate fields, bookmarks, feed following filter, score history.

---

## One-week compressed plan

If only **6 days** available, do **Phases 1–3** (Days 20–25):
- Real profiles + credibility
- Admin adjudicate
- Bookmarks + feed tabs + core notifications

Defer cron/ranks (Phase 4) and evidence scan (Phase 5) by one week.

---

## Success metrics (target end of Day 31)

| Metric | Target | Current (Day 21) |
|--------|--------|------------------|
| Onboarding fields persisted | 24/24 | 23/24 (`region` not in onboard UI) |
| Pages FULL (not PARTIAL) | ≥ 50/55 | 41/55 |
| P0 punch list | 5/5 done | 2/6 done |
| P1 punch list | ≥ 8/9 done | 1/11 done |
| Notification triggers | ≥ 13/15 | 15/15 *(Day 3 parity sprint)* |
| Smoke test | 12/12 pass | partial (onboard + adjudicate + account windows) |
