# Shosha V2 Documentation

V2 rebuild target: `shosha` (this repo). V1 reference: `C:\Others\project\Builtattic\Shoshaaahhh`.

**Last updated:** June 2026 — after Phase 2 Day 6 (feed filters, aggregates, profile counts, audit, claims S3) and Days 20–21 (onboarding + scoring core).

---

> Starting a new AI session? Read [CONTEXT.md](./CONTEXT.md) first.

## Start here

| Document | Purpose |
|----------|---------|
| [V1_TO_V2_PARITY_AUDIT.md](./V1_TO_V2_PARITY_AUDIT.md) | **Master plan** — V1→V2 gap audit (Tasks 1–10) + 8-day final parity execution plan |
| [PARITY_STATUS.md](./PARITY_STATUS.md) | Current V1→V2 parity scorecard, gaps, and punch list |
| [PHASE_2_PLAN.md](./PHASE_2_PLAN.md) | Day-by-day checklist (Phase 2 Days 20–31; maps to audit 8-day plan) |
| [API_SPEC.md](./API_SPEC.md) | API contract (MVP origin; many endpoints now implemented) |
| [MVP_DATABASE_DESIGN.md](./MVP_DATABASE_DESIGN.md) | Postgres schema design |
| [BUSINESS_RULES.md](./BUSINESS_RULES.md) | Domain rules ported from V1 |
| [PROJECT_SETUP.md](./PROJECT_SETUP.md) | Local dev setup |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deployment notes |

---

## Migration history

| Document | Purpose |
|----------|---------|
| [REBUILD_PLAN.md](./REBUILD_PLAN.md) | Original scaffold plan (Days 1–5 baseline) — **completed** |
| [FEATURE_INVENTORY.md](./FEATURE_INVENTORY.md) | Feature inventory — updated for current implementation state |
| [FRONTEND_WORK_ALLOCATION.md](./FRONTEND_WORK_ALLOCATION.md) | Frontend work split — updated; mocks optional now |

---

## Quick status (after Day 6)

| Area | Progress |
|------|----------|
| Pages / routes | **~78%** — 41 FULL, 11 PARTIAL, 0 missing |
| API endpoints | **~85%** — ~112 V2 handlers; 3 V1 gaps + several stubs |
| Admin panel | **65%** — full adjudicate on `AdminReview`; dashboard charts partial |
| Onboarding fields | **96%** — 23/24 persisted (`region` not collected in onboard) |
| Notification triggers | **100%** — 15/15 V1 trigger types |
| Background jobs | **50%** — weekly-momentum cron implemented; schedule with `CRON_TOKEN` |
| Scoring engine | **75%** — adjudicate + score history/windows; user→multiplier bridge open |

**Next milestone:** `profile_multipliers_from_user()`, evidence scan, admin dashboard charts, `PublicProfile`/`LiveAccountScorePanel` credibility wiring.

See [PHASE_2_PLAN.md](./PHASE_2_PLAN.md) for the day-by-day checklist.
