# Shosha — AI Session Context

> **Last updated:** 2026-06-13 · Phase 2 behavioral parity (Days 20–31)

Single-file onboarding map. Link out to detailed docs; do not treat this as a substitute for [PARITY_STATUS.md](./PARITY_STATUS.md).

---

## 1. Project snapshot

**Shosha** is a mobile-first investigative dossier platform: community reports, AI-assisted adjudication, reputation scores for social accounts across major platforms.

- **V1 reference:** `C:\Others\project\Builtattic\Shoshaaahhh` (Next.js + Firebase/Firestore)
- **V2 (this repo):** FastAPI + PostgreSQL + React/Vite SPA; Firebase Auth only; S3 media; Gemini AI
- **Goal:** V2 **behaves** like V1 — route parity is largely done; remaining work is behavioral/data parity
- **Phase:** Post–Day 19 migration complete; **Phase 2** (Days 20–31) in progress
- **Source of truth for gaps:** [PARITY_STATUS.md](./PARITY_STATUS.md) · **Roadmap:** [PHASE_2_PLAN.md](./PHASE_2_PLAN.md) · **Doc index:** [README.md](./README.md)

---

## 2. Doc map — what to read for what

| Doc | What it's for | Read when… |
|-----|---------------|------------|
| [CONTEXT.md](./CONTEXT.md) | This file — orientation + decisions log | **Always first** in a fresh AI session |
| [PARITY_STATUS.md](./PARITY_STATUS.md) | V1→V2 scorecard, page/API matrices, punch list | You need current gap/status for any feature |
| [PHASE_2_PLAN.md](./PHASE_2_PLAN.md) | Day-by-day roadmap (Days 20–31) | You need scope/exit criteria for the current sprint day |
| [BUSINESS_RULES.md](./BUSINESS_RULES.md) | Service-layer invariants (notifications, claims, moderation) | Touching notifications, claims, moderation, ownership |
| [MVP_DATABASE_DESIGN.md](./MVP_DATABASE_DESIGN.md) | Postgres schema reference | Models, migrations, FK/cascade questions |
| [API_SPEC.md](./API_SPEC.md) | Original MVP API contract | Endpoint shapes; **check implementation** — partially superseded |
| [FEATURE_INVENTORY.md](./FEATURE_INVENTORY.md) | Domain-level done/partial/missing | High-level feature status by area |
| [PROJECT_SETUP.md](./PROJECT_SETUP.md) | Monorepo layout, local dev, boundaries | Scaffolding, folder conventions, running locally |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | AWS EC2/RDS/S3 deployment | Infra, env vars, production ops |
| [REBUILD_PLAN.md](./REBUILD_PLAN.md) | Historical Days 1–5 scaffold plan | Understanding migration origin only |
| [FRONTEND_WORK_ALLOCATION.md](./FRONTEND_WORK_ALLOCATION.md) | Frontend work split | Page ownership / parallel work planning |

---

## 3. Current state (2026-06-13)

### Phase / day

- **Phase 2, Day 21+** per [PHASE_2_PLAN.md](./PHASE_2_PLAN.md); scorecard in [PARITY_STATUS.md](./PARITY_STATUS.md) updated through Days 20–21
- **Last merged to main:** PR #32 — weekly-momentum cron + rank surfaces (`a8f6c86`)
- **Most recent plan:** [Day 6 Implementation](file:///C:/Users/Admin/.cursor/plans/day_6_implementation_dce9040a.plan.md) — all 7 todos **completed** (local; **not yet committed**)

### Just completed (Day 6 parity sprint — uncommitted)

Feed/profile/audit batch; documented in PARITY_STATUS "Day 6" section:

- `GET /me/swipe-aggregate` + Profile / People swipe breakdown wiring
- `FeedReportOut` aggregates (`align_count`, `oppose_count`, `comment_count`, `viewer_vote`)
- `GET /feed?filter=following|near|top` + frontend tab refetch
- `followers_count` / `following_count` on user schemas
- `POST /accounts/{id}/audit` with service-layer dedupe
- Claims evidence via S3 (`uploadMedia` → `evidence_payload` JSONB)
- PARITY_STATUS note on dossier-unfollow deferral

### Actively in progress

- None locked — Day 6 code/docs sit in working tree awaiting commit/PR

### Not started / next up (from PHASE_2_PLAN + punch list)

| Area | Status |
|------|--------|
| `profile_multipliers_from_user()` — user onboarding → moderate multipliers | **P0 open** |
| Admin dashboard charts (`filingsLast7`, `aiAgreementRate`, time-series) | Day 23 |
| `AdminQueue.tsx` quick-moderate without adjudicate payload | Day 22 partial |
| Evidence scan (`POST /admin/accounts/{id}/evidence/scan`) | Day 28 |
| `LiveAccountScorePanel` followers + credibility | Day 21 open |
| Generic admin data CRUD | P1 |
| Ship-ready cleanup (Days 30–31 smoke test) | Not started |

---

## 4. Key architectural decisions log

Decisions from planning that may not yet be fully folded into all docs.

| Decision | Why | Fold into |
|----------|-----|-----------|
| **Following feed = reporter-based via `user_follows`** | Reuses existing social graph; no `account_follows` table | PARITY_STATUS (done), BUSINESS_RULES if feed rules added |
| **Near You = reporter `users.city` == viewer `users.city`** (case-insensitive) | Simple, onboarded location only; avoids "near subject" vs "near reporter" ambiguity | PARITY_STATUS (done) |
| **No `accounts.region` for Near You** | Workbook field, not user location; second semantic | PARITY_STATUS (done) |
| **`empty_reason: insufficient_location_data`** on feed when viewer has no city | Honest empty state for Near tab | API_SPEC / feed docs |
| **Feed aggregates via `FeedReportOut`** (not widening `ReportOut`) | Keeps `GET /reports/{id}` and admin paths unchanged | API_SPEC |
| **Batch feed aggregates** (grouped queries per page, not N+1) | Feed is hot path | — |
| **Audit dedupe = service-layer only** on open `(user_id, account_id)` | Good enough without migration; unique constraint later if abuse | BUSINESS_RULES |
| **No notification on audit create** | Not listed in BUSINESS_RULES notification triggers | BUSINESS_RULES |
| **Claims evidence = S3 URLs in existing `evidence_payload` JSONB** | No new table; matches report media pattern | BUSINESS_RULES / MVP_DATABASE_DESIGN |
| **`stats.shares: 0`** kept with inline comment | No backend source; dropping field ripples through frontend types | — |
| **Dossier-unfollow deferred** | No V1 reference to confirm semantics; no `account_follows` in V2 | PARITY_STATUS (done) |

---

## 5. Known gaps / explicitly deferred

Do not re-litigate these without user confirmation:

- **`profile_multipliers_from_user()`** — moderate reads account workbook columns; user onboarding not synced → empty accounts get 1.0 multipliers
- **`region`** on user model but not collected in onboard UI → ranks region filter blocked
- **Dossier-unfollow** (`DELETE /accounts/{id}/dossier-unfollow`) — unimplemented; Following feed uses `user_follows` only
- **Near You location** — requires both viewer and reporter to have onboarded `city`; sparse data → empty feed with `empty_reason`
- **Shares stat** — hardcoded `0` in feed mapping; no V1 backend source identified
- **Evidence scan** — returns `proposals: []` / `scan_stubbed`
- **OG image route** (`GET /api/og`) — missing in V2
- **Admin data CRUD** — `not_implemented` stubs
- **`AdminQueue` quick-moderate** — omits full adjudicate scoring fields (use `AdminReview` path)
- **Bubble leaderboard** — sorts by created_at/member count, not bubble score
- **Root `README.md`** — legacy V1 (Next.js/Firebase); use `docs/` for V2 truth

---

## 6. Conventions & guardrails for AI-assisted changes

- **Read PARITY_STATUS first** for any parity task; do not assume PHASE_2_PLAN checkboxes are current (some pre-date Day 6 sprint)
- **New routes:** match auth pattern of sibling routes in the same router file (`get_current_user` vs `get_current_user_optional`)
- **Schema changes:** grep all consumers before widening shared schemas like `ReportOut`; prefer feed-specific variants (`FeedReportOut`)
- **Notifications:** only add if [BUSINESS_RULES.md](./BUSINESS_RULES.md) explicitly lists the trigger
- **No new Alembic migrations** without explicit user confirmation
- **Feed / profile / list endpoints:** hot paths — batch queries; check for N+1
- **One logical change per task** — diff summary + verification step before moving on (Day 6 protocol)
- **Do not invent business rules** — flag assumptions; check V1 reference or ask user
- **V1 reference path:** `C:\Others\project\Builtattic\Shoshaaahhh` for behavioral parity questions
- **Seed caveat:** `swipe_records` not seeded by default — swipe-aggregate verification needs manual swipes or SQL check

---

## 7. How to resume work

1. Read this file fully
2. Check `.cursor/plans/` for the most recent plan file and todo status (e.g. `day_6_implementation_*.plan.md`)
3. Run `git log --oneline -10` and `git status` — distinguish **merged** vs **local uncommitted** work
4. Cross-reference [PARITY_STATUS.md](./PARITY_STATUS.md) punch list (P0 → P1 → P2)
5. **Ask the user what's next** rather than assuming the next PHASE_2_PLAN checkbox is correct
