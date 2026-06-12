# Shosha Feature Inventory

Updated after **Phase 2 Day 21** — reflects implemented V2 state vs V1 reference.

V1 reference: `C:\Others\project\Builtattic\Shoshaaahhh`

---

## Implementation status by domain

| Domain | V2 status | Notes |
|--------|-----------|-------|
| Auth (Firebase + session sync) | **Done** | Google, email/password, phone/OTP (V2-only) |
| Users / profile | **Done** | 23/24 onboarding fields persisted (`region` not in onboard UI); full edit profile |
| Accounts / dossiers | **Partial** | CRUD, search, score history + windows; workbook columns for multipliers not synced from user |
| Reports / filing | **Partial** | Create, vote, comment; moderate with V1 adjudicate fields on `AdminReview` |
| Feed | **Partial** | For You works; Following/Near You stubbed |
| People / swipe deck | **Partial** | Deck works; swipe aggregate missing |
| Bubbles | **Done** | Create, join, leaderboard (sort partial) |
| Claims | **Done** | File, admin decide, decide notifications |
| Disputes | **Done** | File, withdraw, admin decide; file + decide notifications |
| Notifications | **Done** | List/read works; all V1 triggers emit (vote, comment, claim, dispute, moderation, deletion, trust badge, abuse) |
| Bookmarks | **Done** | GET + toggle API wired to feed UI |
| Admin panel | **Partial** | 19 pages; full adjudicate on `AdminReview`; `AdminQueue` quick-moderate partial; dashboard charts stubbed |
| Payments / upgrade | **Done** | Razorpay order/verify; webhook cancel/halt notifications |
| Impact / ranks / stats | **Partial** | APIs exist; UI partial (weekly delta, global rank) |
| Legal / policies | **Done** | 12 pages via dynamic legal routes |
| AI (Gemini) | **Done** | analyze, classify endpoints |
| Imports | **Done** | contacts, links |
| Background jobs | **Missing** | weekly-momentum cron not ported |
| OG images | **Missing** | V1 `/api/og` not in V2 |

---

## Stack (implemented)

### Frontend
- React 18 + Vite + TypeScript
- React Router (`frontend/src/routes/index.tsx`)
- Tailwind CSS + Framer Motion
- Firebase Auth client
- D3 score gauges (partial viz suite)

### Backend
- FastAPI + Uvicorn
- SQLAlchemy 2 + Alembic (PostgreSQL)
- Pydantic v2 schemas
- Firebase Admin (session sync)
- AWS S3 (media upload)
- Google Gemini (adjudication assist)

### Platform
- PostgreSQL (Docker Compose local)
- Firebase Auth
- AWS S3
- Razorpay (payments)

---

## Database tables (V2)

| Table | Purpose |
|-------|---------|
| `users` | User profiles |
| `accounts` | Dossier accounts |
| `account_social_links` | Per-account social URLs |
| `reports` | Filed reports |
| `report_media` | Report attachments |
| `report_votes` | Align/oppose votes |
| `report_comments` | Report comments |
| `report_bookmarks` | User bookmarks (service exists) |
| `claim_requests` | Profile claims |
| `disputes` | Dispute records |
| `notifications` | In-app notifications |
| `ledger_entries` | Score change ledger |
| `admin_actions` | Admin audit log |
| `bubbles` | Bubble groups |
| `bubble_members` | Membership |
| `bubble_join_requests` | Join voting |
| `swipe_records` | People deck swipes |
| `moderation_requests` | User moderation requests |
| `evidence_proposals` | Admin evidence queue |
| `audit_requests` | Account audits |
| `deletion_requests` | Account deletion |
| `issue_reports` | Bug/issue reports |
| `site_settings` | Platform settings |
| `subscriptions` | Razorpay subscriptions |
| `events` | Account event ledger |

---

## Frontend pages (summary)

| Category | Count | Status |
|----------|-------|--------|
| Public | 7 | Mostly FULL |
| Auth / onboard | 3 | PARTIAL (onboard fields) |
| App core | 18 | Mix of FULL and PARTIAL |
| Legal | 12 | FULL (dynamic routes) |
| Admin | 19 | Mix; dashboard/review partial |
| V2-only | 4 | Accounts list/search/new, reports/new |
| Orphan stubs | 4 | Login, Onboarding, Subscribe, legacy Admin |

Full matrix: [PARITY_STATUS.md](./PARITY_STATUS.md)

---

## API surface (summary)

**108 route handlers** under `/api/v1` plus `/health` and `/webhooks/razorpay`.

Routers: `auth`, `users`, `social`, `me`, `accounts`, `reports`, `feed`, `people`, `bubbles`, `claims`, `disputes`, `notifications`, `admin`, `media`, `discovery`, `impact`, `events`, `ai`, `imports`, `misc`, `payments`, `webhooks`.

Gaps and stubs: [PARITY_STATUS.md#api-gaps](./PARITY_STATUS.md#api-gaps)

Contract origin: [API_SPEC.md](./API_SPEC.md) (MVP doc; implementation has exceeded MVP scope).

---

## Next work

See [PHASE_2_PLAN.md](./PHASE_2_PLAN.md) for prioritized Days 20–31 checklist.

P0 items:
1. Onboarding field persistence
2. Admin adjudicate scoring fields
3. ~~Bookmark toggle API~~ (done — Day 3 parity sprint)
4. ~~Social notification triggers~~ (done — Day 3 parity sprint)
5. Weekly-momentum cron
