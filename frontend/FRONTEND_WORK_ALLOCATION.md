# FRONTEND_WORK_ALLOCATION.md

## Objective

Build the entire frontend foundation for Shosha V2 in parallel while backend is ongoing.

All screens, layouts, forms, components, and routing are built now — fully navigable — against a mock API layer. When backend routes go live, integration is a straight swap with no UI rewrites.

Do NOT wait for backend completion.

---

## Backend Status

Backend API endpoints are **not implemented yet**.

What exists:
- SQLAlchemy model files under `backend/app/models/`
- API contract in `docs/API_SPEC.md`

What does not exist yet:
- FastAPI routers
- Route handlers (GET / POST / PATCH / DELETE)
- Live endpoint responses

**Frontend proceeds entirely on mocks. Mocks are the source of truth until backend is ready.**

---

## Reference Documents

- `docs/FEATURE_INVENTORY.md`
- `docs/REBUILD_PLAN.md`
- `docs/PROJECT_SETUP.md`
- `docs/MVP_DATABASE_DESIGN.md`
- `docs/API_SPEC.md`

Do not use the legacy repository for frontend architecture. Use it only to understand business workflows.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | React + Vite + TypeScript |
| Routing | React Router v6 |
| Server state | TanStack Query |
| HTTP client | Axios |
| Forms | React Hook Form + Zod |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| Auth | Firebase Auth |

---

## Principles

- **Mobile-first, always.** Every screen is designed for small viewports first and scales up. No desktop-first breakpoint hacks.
- **Mock API layer is real infrastructure.** Every page consumes mock functions from `src/mocks/` — never hardcoded objects inside components. This is what makes backend swap seamless.
- **No waiting.** "Is /accounts ready?" is never a blocker. Build the screen, wire the mock, move on.
- **Seamless and dynamic.** Smooth transitions, loading states, empty states, error states — all built. Nothing feels static or placeholder-y.

---

## Project Structure

```
src/
├── api/              # Typed Axios clients — one file per domain
│   ├── auth.ts
│   ├── users.ts
│   ├── accounts.ts
│   ├── reports.ts
│   ├── bubbles.ts
│   ├── people.ts
│   └── payments.ts
│
├── mocks/            # Mock API functions mirroring API spec exactly
│   ├── auth.ts
│   ├── users.ts
│   ├── accounts.ts
│   ├── reports.ts
│   ├── bubbles.ts
│   ├── people.ts
│   └── payments.ts
│
├── types/            # Shared TypeScript interfaces and enums
│   ├── auth.ts
│   ├── user.ts
│   ├── account.ts
│   ├── report.ts
│   ├── bubble.ts
│   ├── people.ts
│   ├── payment.ts
│   └── common.ts
│
├── components/
│   ├── ui/           # Reusable primitives (Button, Input, Badge, Avatar, Modal...)
│   ├── viz/          # Score visualisations (ScoreMeter, ScoreDelta, LedgerBar...)
│   └── layout/       # Navbar, Sidebar, PageShell, BottomNav (mobile)
│
├── features/         # Domain-scoped UI + hooks
│   ├── auth/
│   ├── accounts/
│   ├── reports/
│   ├── profile/
│   ├── feed/
│   ├── bubbles/
│   ├── people/
│   └── payments/
│
├── hooks/            # Shared hooks (useAuth, useDebounce, useInfiniteScroll...)
├── lib/              # Utilities (cn, formatScore, formatDate, apiClient...)
├── pages/            # Route-level page components
├── routes/           # Route tree + guards (ProtectedRoute, OnboardingGuard...)
├── providers/        # QueryClientProvider, AuthProvider, ThemeProvider
└── styles/           # Global CSS, Tailwind base overrides
```

---

## Mock API Pattern

Every domain has:
1. A mock file in `src/mocks/` that returns typed fake data with realistic delay
2. An API file in `src/api/` with the same function signatures pointing to real endpoints
3. Pages and features import from `src/api/` only — the mock/real switch is one config flag

```ts
// src/lib/apiClient.ts
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

// src/api/accounts.ts
import { USE_MOCKS } from '@/lib/apiClient'
import * as mock from '@/mocks/accounts'
import * as real from '@/api/accountsReal'

export const getAccount = USE_MOCKS ? mock.getAccount : real.getAccount
```

All mock responses follow the API spec envelope:
```json
{ "ok": true, "data": {} }
```

Mocks also cover error cases: `ok: false`, validation errors, auth failures.

---

## Build Phases

### Phase 1 — Foundation
- Vite + TypeScript + Tailwind + shadcn/ui config
- React Router setup with all route stubs
- Auth provider wiring (Firebase)
- TanStack Query provider
- App layout (Navbar + mobile BottomNav)
- Public layout
- Design tokens and global styles

### Phase 2 — Auth Screens
| Screen | Route |
|---|---|
| Login | `/login` |
| Onboarding | `/onboarding` |

### Phase 3 — User / Profile Module
| Screen | Route | API Contract |
|---|---|---|
| My Profile | `/profile` | `GET /api/v1/users/me` |
| Edit Profile | `/profile/edit` | `PATCH /api/v1/users/me` |

### Phase 4 — Accounts Module
| Screen | Route | API Contract |
|---|---|---|
| Search | `/accounts/search` | `GET /api/v1/accounts/search` |
| List | `/accounts` | `GET /api/v1/accounts` |
| Detail / Dossier | `/accounts/:id` | `GET /api/v1/accounts/{id}` |
| Create | `/accounts/new` | `POST /api/v1/accounts` |

### Phase 5 — Reports Module
| Screen | Route | API Contract |
|---|---|---|
| Create Report | `/reports/new` | `POST /api/v1/reports` |
| Report Detail | `/reports/:id` | `GET /api/v1/reports/{id}` |
| Vote (inline) | — | `POST /api/v1/reports/{id}/votes` |
| Comments (inline) | — | `GET/POST /api/v1/reports/{id}/comments` |

### Phase 6 — Feed
| Screen | Route | API Contract |
|---|---|---|
| Main Feed | `/feed` | `GET /api/v1/feed` |

### Phase 7 — Bubbles
| Screen | Route | API Contract |
|---|---|---|
| Bubble List | `/bubbles` | `GET /api/v1/bubbles` |
| Bubble Detail | `/bubbles/:id` | `GET /api/v1/bubbles/{id}` |
| Create Bubble | `/bubbles/new` | `POST /api/v1/bubbles` |
| Join Request (inline) | — | `POST /api/v1/bubbles/{id}/join` |
| Members (inline) | — | `GET /api/v1/bubbles/{id}/members` |

### Phase 8 — People / Discovery
| Screen | Route | API Contract |
|---|---|---|
| People Deck | `/people` | `GET /api/v1/people` |
| Swipe / Interact (inline) | — | `POST /api/v1/people/{account_id}/swipe` |
| Following List | `/people/following` | `GET /api/v1/users/me/following` |

### Phase 9 — Payments / Trust Badge
| Screen | Route | API Contract |
|---|---|---|
| Trust Badge Submit | `/trust-badge` | `POST /api/v1/trust-badge/submit` |
| Trust Badge Status | `/trust-badge/status` | `GET /api/v1/trust-badge/status` |
| Subscription Plans | `/subscribe` | `GET /api/v1/subscriptions/plans` |
| Checkout (inline/modal) | — | `POST /api/v1/subscriptions/checkout` |
| Billing / Payment History | `/billing` | `GET /api/v1/payments` |

---

## Every Screen Must Have

- Loading state (skeleton, not spinner where possible)
- Empty state (illustrated, not just "No results")
- Error state (with retry)
- Mobile layout verified at 375px
- Desktop layout verified at 1280px

---

## Out of Scope (Current Sprint)

Do not build yet:

- Notifications
- Claims
- Disputes
- Admin / Tribunal dashboard
- Analytics
- Audit requests
- Moderation requests
- Evidence proposals
- Impact / Leaderboard dashboard

Use feature flags or placeholder routes for these — never dead links.

---

## Done Criteria

- [ ] All routes navigable with mock data
- [ ] Auth screens complete
- [ ] Profile module complete
- [ ] Accounts module complete
- [ ] Reports module complete
- [ ] Feed screen complete
- [ ] Bubbles module complete
- [ ] People / Discovery module complete
- [ ] Payments / Trust Badge module complete
- [ ] Responsive on mobile (375px) and desktop (1280px)
- [ ] Mock layer in place — backend swap requires zero UI changes
- [ ] No hardcoded data inside components
- [ ] Loading / empty / error states on every data-fetching screen