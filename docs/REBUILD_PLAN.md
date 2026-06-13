# Shosha V2 Rebuild Plan

## Status: Scaffold complete · Migration sprint Days 1–19 complete

The original scaffold-only plan below was the **Days 1–5 baseline**. Implementation continued through **Day 19** with full-stack feature work.

**Current docs:**
- [V1_TO_V2_PARITY_AUDIT.md](./V1_TO_V2_PARITY_AUDIT.md) — master gap audit + 8-day final parity plan
- [PARITY_STATUS.md](./PARITY_STATUS.md) — what is done vs V1
- [PHASE_2_PLAN.md](./PHASE_2_PLAN.md) — Days 20–31 behavioral parity plan (maps to audit Days 1–8)
- [docs/README.md](./README.md) — documentation index

---

## Original scaffold plan (historical)

Status at project start: scaffolding-only implementation.

This phase generated project structure and setup only.

### Hard constraints (scaffold phase — satisfied)

- ~~Do not generate business logic.~~ → **Now implemented**
- ~~Do not generate API endpoints.~~ → **~112 handlers live**
- ~~Do not generate database tables.~~ → **16+ SQLAlchemy models**

### Target stack (unchanged)

| Layer | Stack |
|-------|-------|
| Frontend | React, Vite, TypeScript, React Router, Tailwind |
| Backend | FastAPI, SQLAlchemy 2, Alembic, Pydantic v2 |
| Platform | PostgreSQL, Firebase Auth, AWS S3 |

### Repository structure (current)

```text
frontend/     # React SPA — pages, components, api clients
backend/      # FastAPI — api/v1 routers, services, models
docs/         # Plans, parity status, API spec
```

---

## Migration sprint summary (Days 1–19)

| Milestone | Outcome |
|-----------|---------|
| Days 1–5 | Monorepo scaffold, Docker Postgres, env templates |
| Days 6–10 | Core API routers, models, migrations |
| Days 11–14 | Frontend pages, admin shell, public/legal routes |
| Days 15–19 | Admin pages, payments, impact, parity pass |

See [PARITY_STATUS.md](./PARITY_STATUS.md) for detailed scorecard.

---

## Next phase (Days 20–31)

Focus shifts from **route coverage** to **behavioral parity**:

1. ~~Persist all onboarding fields + credibility~~ **Done (Day 20)**
2. ~~Admin adjudicate with V1 scoring fields~~ **Done on `AdminReview` (Day 21)**; user→multiplier bridge open
3. ~~Bookmarks, feed filters, notification triggers~~ **Done (Day 3 parity sprint + Day 6)**
4. ~~Score history, window scores~~ **Done (Day 21)**; ~~weekly-momentum cron~~ **Done (Day 4)** — schedule with `CRON_TOKEN`
5. ~~User account audit, claim S3 upload~~ **Done (Day 6)**; evidence scan + dossier-unfollow still open

Full checklist: [PHASE_2_PLAN.md](./PHASE_2_PLAN.md)

---

## Historical scaffold deliverables (completed)

1. Folder structure for frontend and backend
2. `package.json` / `pyproject.toml` dependencies
3. Environment variable templates (`.env.example`)
4. Local development setup (`PROJECT_SETUP.md`)
5. `docker-compose.yml` for PostgreSQL
6. README setup instructions

---

## Non-goals (original scaffold phase — no longer apply)

These were intentionally deferred at start; most are now implemented or tracked in Phase 2:

- ~~Route handlers~~ → done
- ~~Domain services and workflows~~ → largely done; scoring/notifications partial
- ~~DB schema~~ → done
- ~~Auth/session behavior~~ → done
- ~~S3 upload logic~~ → done (`/media/upload`)
