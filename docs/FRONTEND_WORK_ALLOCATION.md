# FRONTEND_WORK_ALLOCATION.md

## Objective

Build the entire frontend foundation for Shosha V2 in parallel while backend implementation is ongoing.

The frontend should be built against the API contract and use mocked data until backend endpoints become available.

Do NOT wait for backend completion.

---

# Current Backend Status (Important)

Backend API endpoints are **not implemented yet** in the current repository state.

What exists now:

- Backend scaffold structure
- SQLAlchemy model files under `backend/app/models/`
- API contract documentation in `docs/API_SPEC.md`

What does not exist yet:

- FastAPI routers
- Route handlers (`GET/POST/PATCH/...`)
- Live endpoint responses

Frontend must proceed using mock handlers based on API spec.

---

# Reference Documents

Read these first:

- `docs/FEATURE_INVENTORY.md`
- `docs/REBUILD_PLAN.md`
- `docs/PROJECT_SETUP.md`
- `docs/MVP_DATABASE_DESIGN.md`
- `docs/API_SPEC.md`

These documents are the source of truth.

Do not use the legacy repository as the source of frontend architecture.

Use it only for understanding business workflows if needed.

---

# Current Stack

Frontend:

- React
- Vite
- TypeScript
- React Router
- TanStack Query
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod

Backend:

- FastAPI
- PostgreSQL
- Firebase Auth

---

# Primary Goal

Deliver a fully navigable frontend application using mocked API responses.

By the time backend routes are ready, the frontend should only require API integration.

---

# Phase 1: Frontend Foundation

## Setup

Configure:

- React Router
- TanStack Query
- Axios
- Tailwind
- shadcn/ui

Create `frontend/src/` structure:

- `api/`
- `components/`
- `features/`
- `hooks/`
- `layouts/`
- `pages/`
- `providers/`
- `routes/`
- `types/`
- `utils/`

---

## Layouts

Create:

### Public Layout

Used for:

- Landing page
- Public account pages
- Public report pages

### App Layout

Used for:

- Dashboard
- Profile
- Report creation
- Moderation-related placeholders (MVP-safe structure only)

Must include:

- Navbar
- Responsive navigation
- User menu

---

# Phase 2: Authentication UI

Build:

## Login Page

Route: `/login`

Features:

- Google sign in button
- Loading state
- Error state

## Onboarding Page

Route: `/onboarding`

Features:

- Username setup
- Display name
- Profile picture preview

Use mocked responses.

---

# Phase 3: User Module

Build:

## Profile Page

Route: `/profile`

Using contract: `GET /api/v1/users/me`

Features:

- Profile information
- Edit profile action

## Edit Profile

Route: `/profile/edit`

Using contract: `PATCH /api/v1/users/me`

Fields:

- `username`
- `display_name`
- `photo_url`

Integrate form validation using Zod.

---

# Phase 4: Accounts Module

Build:

## Account Search

Route: `/accounts/search`

Using contract: `GET /api/v1/accounts/search`

Features:

- Search input
- Infinite scrolling
- Empty state
- Loading state

## Account List

Route: `/accounts`

Using contract: `GET /api/v1/accounts`

Features:

- Filters
- Pagination

## Account Detail

Route: `/accounts/:id`

Using contract: `GET /api/v1/accounts/{account_id}`

Display:

- Account information
- Social links
- Report statistics

## Create Account

Route: `/accounts/new`

Using contract: `POST /api/v1/accounts`

Build complete form flow.

---

# Phase 5: Reports Module

Build:

## Report Creation

Route: `/reports/new`

Using contract: `POST /api/v1/reports`

Features:

- Account selection
- Title
- Description
- Media attachments UI flow (mocked upload outcome)

## Report Detail

Route: `/reports/:id`

Using contract: `GET /api/v1/reports/{report_id}`

Display:

- Report information
- Media
- Vote counts
- Comments

## Voting Component

Using contract: `POST /api/v1/reports/{report_id}/votes`

Features:

- Align
- Oppose

## Comments Component

Using contracts:

- `POST /api/v1/reports/{report_id}/comments`
- `GET /api/v1/reports/{report_id}/comments`

Features:

- Comment list
- Comment creation

---

# Mock Data Requirement

Until backend endpoints exist:

Create mock API handlers.

All mocks must follow `docs/API_SPEC.md` exactly.

Response shape baseline:

```json
{
  "ok": true,
  "data": {}
}
```

Do not invent response formats.

Also include realistic error cases (`ok: false`, validation errors, auth failures) aligned to API spec patterns.

---

# Deliverables

By completion:

- [ ] Application routing working
- [ ] Authentication screens completed
- [ ] Profile module completed
- [ ] Accounts module completed
- [ ] Reports module completed
- [ ] Responsive layouts completed
- [ ] Mock data integrated
- [ ] Components reusable

Backend integration should be a simple API replacement step rather than a UI rewrite.

---

# Out of Scope (For Current Frontend Sprint)

Do not build:

- Notifications
- Claims
- Disputes
- Admin moderation dashboard
- Follow system
- Analytics
- Payments

Focus only on MVP Phase 1 UI foundation and core user/accounts/reports flows.

