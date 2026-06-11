# Phase 2 Plan — V1 Behavioral Parity

Post–Day 19 execution plan. Goal: V2 **behaves** like V1, not just routes like V1.

**Timeline:** Days 20–31 (~12 working days)  
**Compressed MVP:** Days 20–25 (Phases 1–3 only) if time-constrained

---

## Current state (Day 19)

Structure is largely complete:
- 55+ routable pages, 19 admin pages, 108 API handlers
- Core flows exist but many use proxies, stubs, or "coming soon" UI

Remaining work is **behavioral parity**: data persistence, scoring, notifications, feed filters, admin adjudicate.

See [PARITY_STATUS.md](./PARITY_STATUS.md) for the full gap matrix.

---

## Phase 1 — Data model truth (Days 20–21)

**Goal:** User profile and scores are real, not proxies.

### Day 20 — User model + onboarding persistence
- [ ] Alembic migration: add V1 onboarding fields to `users` (or `user_profiles`)
- [ ] Expand `UserUpdateRequest` / `UserPrivate` schemas
- [ ] `Onboard.tsx` — send all collected fields (remove line ~424 TODO)
- [ ] `EditProfile.tsx` — edit same fields; remove "coming soon" banner
- [ ] Wire live `GET /users/username-availability` during onboard

**Exit criteria:** Complete onboard → reload → all fields visible on Profile and PublicProfile.

### Day 21 — Credibility + scoring multipliers
- [ ] Store or compute `credibility` from onboarding fields
- [ ] Backend: `profile_multipliers_from_user()` in `apply_report_score` / moderate (replace `DEFAULT_MULTIPLIERS`)
- [ ] Remove Dashboard/Profile credibility proxy (`score/10000`)
- [ ] `LiveAccountScorePanel` — wire follower counts from social API

**Exit criteria:** User with full onboard gets different score multiplier than empty profile.

---

## Phase 2 — Admin can judge reports (Days 22–23)

**Goal:** Admin review matches V1 adjudicate behavior.

### Day 22 — Adjudicate API + admin UI
- [ ] Extend `POST /reports/{id}/moderate` (or add `/adjudicate`) with V1 scoring payload
- [ ] `AdminReviewControls.tsx` — send deed, baseScore, intent, circumstances, repetitionPattern
- [ ] `AdminQueue.tsx` / `AdminReview.tsx` — same payload
- [ ] Optional: pre-fill from `POST /ai/classify`

**Exit criteria:** Admin moderates with custom deed/score → ledger reflects override.

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
- [ ] `POST/DELETE /reports/{id}/bookmark` (toggle) using `report_bookmark_service`
- [ ] `FeedItem.tsx` — wire bookmark toggle
- [ ] Feed API: include vote aggregates on feed items
- [ ] `api/feed.ts` — remove enrich TODO

**Exit criteria:** Bookmark from feed → `/bookmarks`; unbookmark works.

### Day 25 — Feed tabs + notification triggers
- [ ] Backend: `GET /feed?filter=following|near` with real filters
- [ ] `lib/feed.ts`, `Dashboard.tsx`, `Feed.tsx` — enable Following / Near You tabs
- [ ] Notifications: vote, comment, moderation-request-to-admins
- [ ] Notifications: claim decided, dispute filed/decided, deletion-request submitted

**Exit criteria:** Following tab shows followed users' reports; vote/comment creates notification.

---

## Phase 4 — Score windows & ranks (Days 26–27)

**Goal:** Leaderboard, Ranks, People, Account pages match V1 score behavior.

### Day 26 — Score history + windows + swipe aggregate
- [ ] `GET /accounts/{id}/score-history` (from `ledger_entries`)
- [ ] `GET /accounts/{id}/score-windows` (W1/W2/W3)
- [ ] `GET /me/swipe-aggregate`
- [ ] Wire `AccountDetail.tsx`, `ScoreLedgerPanel.tsx`, `SwipeScoreBreakdownCard.tsx`

**Exit criteria:** Account page shows score history; people swipe breakdown populated.

### Day 27 — Weekly momentum cron + rank surfaces
- [ ] Port `POST/GET /cron/weekly-momentum` from V1
- [ ] Persist/update `window_scores` on accounts
- [ ] `Leaderboard.tsx` — weekly delta from score history
- [ ] `Ranks.tsx` — "Under Fire" + `weekly_delta`
- [ ] `Impact.tsx` — global rank

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
- [ ] Razorpay webhook: payment failed/cancelled notifications
- [ ] Claim decide → notification

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

| Metric | Target |
|--------|--------|
| Onboarding fields persisted | 24/24 |
| Pages FULL (not PARTIAL) | ≥ 50/55 |
| P0 punch list | 5/5 done |
| P1 punch list | ≥ 8/9 done |
| Notification triggers | ≥ 13/15 |
| Smoke test | 12/12 pass |
