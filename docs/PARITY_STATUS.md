# V1 → V2 Parity Status

Master gap-tracking document. Updated at end of **Days 1–19** migration sprint.

- **V1 reference:** `C:\Others\project\Builtattic\Shoshaaahhh`
- **V2 target:** this repository (`shosha`)

---

## Summary scorecard

| Area | V1 baseline | V2 status | % complete* |
|------|-------------|-----------|-------------|
| Pages / routes | 55 routable pages | 38 FULL · 14 PARTIAL · 0 missing | **69%** |
| API endpoints | ~95 handlers (+ OG) | 108 handlers; 7 gaps + stubs | **78%** |
| Admin features | 20 tracked | 12 FULL · 8 PARTIAL | **60%** |
| Onboarding fields | 24 fields | 6 persisted · 18 missing | **25%** |
| Notification triggers | 15 types | 6 implemented · 8 missing | **40%** |
| Background jobs | 2 planned | 0 (webhook partial) | **0%** |
| Scoring components | 8 | 3 full · 3 partial · 2 missing | **38%** |

\* `(FULL + 0.5 × PARTIAL) / total × 100`

---

## What shipped in Days 1–19

### Backend
- FastAPI app with **108 route handlers** under `/api/v1` (+ `/health`, `/webhooks/razorpay`)
- Postgres models: users, accounts, reports, votes, comments, bookmarks, claims, disputes, bubbles, notifications, ledger, admin actions, and related tables
- Routers: auth, users, social, me, accounts, reports, feed, people, bubbles, claims, disputes, notifications, admin, media, discovery, impact, events, ai, imports, misc, payments, webhooks
- Gemini integration for AI analyze/classify
- Razorpay order/verify + webhook (status updates only)

### Frontend
- **55+ routable pages** including public, auth, app, legal, and 19 admin pages
- Core flows wired: sign-in, onboard, dashboard, feed, reports, accounts, bubbles, people (partial), disputes, bookmarks, notifications, search, impact, ranks, upgrade
- Admin shell with moderation, claims, disputes, evidence, audits, abuse, users, accounts, settings, and more

### Still stubbed or partial (high level)
- Onboarding collects 24 fields; only 6 reach the backend
- Credibility uses score proxy on dashboard/profile
- Following / Near You feed tabs show "coming soon"
- Bookmark toggle in feed is local-only (no API route)
- Admin review cannot send V1 adjudicate scoring fields
- Score history, window scores, swipe aggregate endpoints missing
- Weekly-momentum cron missing
- Evidence scan returns empty proposals
- 8 notification trigger types missing vs V1

---

## Page parity matrix

| V1 route | V2 route | V2 page | Status |
|----------|----------|---------|--------|
| `/` | `/` | `Landing.tsx` | FULL |
| `/how-it-works` | `/how-it-works` | `HowItWorks.tsx` | FULL |
| `/leaderboard` | `/leaderboard` | `Leaderboard.tsx` | PARTIAL — no weekly delta from score history |
| `/report-issue` | `/report-issue` | `ReportIssue.tsx` | FULL |
| `/trust-badge` | `/trust-badge` | `TrustBadge.tsx` | FULL |
| `/profile/[id]` | `/profile/:id` | `PublicProfile.tsx` | PARTIAL — credibility/followers not fully wired |
| `/[slug]` | `/:slug` | `SlugPage.tsx` | FULL |
| `/sign-in` | `/sign-in` | `SignIn.tsx` | PARTIAL — V2 adds phone/OTP |
| `/sign-up` | `/sign-up` → redirect | — | FULL |
| `/onboard` | `/onboard` | `Onboard.tsx` | PARTIAL — 18 fields not persisted |
| `/dashboard` | `/dashboard` | `Dashboard.tsx` | PARTIAL — credibility proxy; 2 feed tabs stubbed |
| `/feed` | `/feed` | `Feed.tsx` | PARTIAL — Following/Near You stubbed |
| `/profile` | `/profile` | `Profile.tsx` | PARTIAL — follower counts TODO |
| `/profile/edit` | `/profile/edit` | `EditProfile.tsx` | PARTIAL — limited fields |
| `/profile/upgrade` | `/profile/upgrade` | `ProfileUpgrade.tsx` | FULL |
| `/account/[id]` | `/accounts/:id` | `AccountDetail.tsx` | PARTIAL — score history, audit, window scores |
| `/people` | `/people` | `People.tsx` | PARTIAL — swipe aggregate missing |
| `/search` | `/search` | `Search.tsx` | FULL |
| `/notifications` | `/notifications` | `Notifications.tsx` | FULL |
| `/bookmarks` | `/bookmarks` | `Bookmarks.tsx` | PARTIAL — toggle in feed not wired |
| `/disputes` | `/disputes` | `Disputes.tsx` | FULL |
| `/impact` | `/impact` | `Impact.tsx` | PARTIAL — global rank coming soon |
| `/ranks` | `/ranks` | `Ranks.tsx` | PARTIAL — no region / Under Fire |
| `/access` | `/access` | `Access.tsx` | FULL |
| `/settings` | `/settings` | `Settings.tsx` | PARTIAL — deletion attachment; prefs localStorage |
| `/bubbles` | `/bubbles` | `Bubbles.tsx` | FULL |
| `/bubbles/[id]` | `/bubbles/:id` | `BubbleDetail.tsx` | FULL |
| `/bubbles/create` | `/bubbles/new` | `BubbleNew.tsx` | PARTIAL — image crop TODO |
| `/post/[id]` | `/reports/:id` | `ReportDetail.tsx` | FULL |
| `/legal-policies/*` | `/legal-policies/*` | `legal/LegalHub.tsx`, `LegalPage.tsx` | FULL |
| `/admin` | `/admin` | `admin/AdminDashboard.tsx` | PARTIAL — charts/metrics stubbed |
| `/admin/queue` | `/admin/queue` | `admin/AdminQueue.tsx` | PARTIAL — scoring fields not sent |
| `/admin/moderation` | `/admin/moderation` | `admin/AdminModeration.tsx` | FULL |
| `/admin/review/[id]` | `/admin/review/:id` | `admin/AdminReview.tsx` | PARTIAL |
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
| `POST /accounts/[id]/audit` | No user-facing audit endpoint |
| `DELETE /accounts/[id]/dossier-unfollow` | No dossier unfollow |
| Bookmark toggle | Service exists; no POST/DELETE route |
| `GET /me/swipe-aggregate` | Referenced in UI; not implemented |
| `GET /accounts/{id}/score-history` | Not implemented |
| `GET /accounts/{id}/score-windows` | Not implemented |
| `POST/GET /cron/weekly-momentum` | Missing entirely |
| `GET /api/og` | OG image generation missing |
| `POST /admin/data/[collection]` | Collection record create missing |
| `GET/PATCH/DELETE /admin/data/{collection}/{id}` | Returns `not_implemented` |

### Stub / partial endpoints
| Endpoint | Issue |
|----------|-------|
| `POST /admin/accounts/{id}/evidence/scan` | Returns `proposals: []`, `scan_stubbed` |
| `POST /reports/{id}/moderate` | Uses `DEFAULT_MULTIPLIERS`; no adjudicate field overrides |
| `GET /bubbles/leaderboard` | Sorts by created_at/member count, not bubble score |
| `POST /webhooks/razorpay` | No user notifications on payment events |

---

## Onboarding field parity

| Field | Sent to backend? | In schema? |
|-------|------------------|------------|
| name, username, city, photoUrl, bio, onboardingComplete | Yes | Yes |
| phone, dob, country, quote | No | No |
| occupationRole, networkSize, education, specializedField, managesMoneyPeopleSystem, physicalIntellectualLimitations | No | No |
| igUrl, tiktokUrl, xUrl, linkedinUrl, redditUrl, ytUrl, fbUrl, snapchatUrl | No | No |

**Impact:** credibility formula, profile multipliers, and profile display cannot match V1 until these are persisted.

---

## Notification triggers

| Trigger | V1 | V2 |
|---------|----|----|
| Report approved/rejected | Yes | Yes |
| Moderation resolved | Yes | Yes |
| Trust badge decided | Yes | Yes |
| Deletion resolved | Yes | Yes |
| Abuse dismissed | Yes | Yes |
| Vote align/oppose | Yes | **No** |
| Comment | Yes | **No** |
| Moderation requested (admins) | Yes | **No** |
| Claim decided | Yes | **No** |
| Dispute filed/decided | Yes | **No** |
| Deletion submitted | Yes | **No** |
| Razorpay payment failed/cancelled | Yes | **No** |

---

## Prioritized punch list

### P0 — Blocks core user flows
1. Persist onboarding credibility fields (User model + Onboard payload)
2. Admin adjudicate with scoring fields (deed, baseScore, intent, circumstances, repetitionPattern)
3. Bookmark toggle API + FeedItem wire-up
4. Notification triggers for votes, comments, claims, disputes, moderation-create, deletion-create
5. `POST /cron/weekly-momentum` for W1/W2 window scores

### P1 — Acknowledged TODOs
6. Score history + score windows endpoints
7. `/me/swipe-aggregate`
8. Following / Near You feed filters
9. Evidence scan integration
10. Admin dashboard metrics (filingsLast7, aiAgreementRate, time-series)
11. Claim evidence S3 upload
12. `POST /accounts/{id}/audit`
13. Generic admin data CRUD
14. Razorpay webhook notifications

### P2 — Nice-to-have
15. PDF share export, impact range selector, bubble crop, ranks region filter, OG route, orphan page cleanup, proxy-image path fix

---

## Related docs

- [PHASE_2_PLAN.md](./PHASE_2_PLAN.md) — day-by-day plan for P0/P1 work
- [API_SPEC.md](./API_SPEC.md) — original MVP contract (superseded in places by implementation)
