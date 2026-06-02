# Shosha Initial Implementation Scaffold Plan

Status: This document is now aligned to scaffolding-only implementation start.

This phase generates project structure and setup only.

## Hard Constraints

- Do not generate business logic.
- Do not generate API endpoints.
- Do not generate database tables.
- Do not add domain models beyond placeholders.

## Target Stack

### Frontend

- React
- Vite
- TypeScript
- React Router
- TanStack Query
- Tailwind CSS
- shadcn/ui

### Backend

- FastAPI
- Uvicorn
- SQLAlchemy 2
- Alembic
- Pydantic v2

### Platform

- Database: PostgreSQL
- Auth provider: Firebase Auth
- Storage: AWS S3

## Repository Structure

```text
frontend/
backend/
docs/
```

## Scaffolding Deliverables

1. Folder structure for frontend.
2. Folder structure for backend.
3. `package.json` dependencies for frontend tooling/runtime.
4. `pyproject.toml` dependencies for backend tooling/runtime.
5. Environment variable structure (`.env.example` style templates only).
6. Local development setup scripts and instructions.
7. `docker-compose.yml` for PostgreSQL only.
8. README setup instructions for running frontend/backend locally.

## Frontend Scaffold Shape

```text
frontend/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── .env.example
├── src/
│   ├── main.tsx
│   ├── app/
│   │   ├── router.tsx
│   │   └── providers.tsx
│   ├── pages/
│   ├── components/
│   │   └── ui/
│   ├── lib/
│   │   ├── queryClient.ts
│   │   └── env.ts
│   ├── services/
│   ├── hooks/
│   ├── styles/
│   └── types/
└── ...
```

Notes:
- `components/ui` is reserved for shadcn/ui components.
- No feature/business modules are implemented in this phase.

## Backend Scaffold Shape

```text
backend/
├── pyproject.toml
├── alembic.ini
├── .env.example
├── app/
│   ├── main.py
│   ├── core/
│   │   ├── config.py
│   │   ├── db.py
│   │   └── logging.py
│   ├── api/
│   ├── schemas/
│   ├── services/
│   └── integrations/
│       ├── firebase_auth.py
│       └── s3.py
├── alembic/
│   ├── env.py
│   └── versions/
└── tests/
```

Notes:
- `api/` exists for future routers but no endpoints are created now.
- Alembic is configured only as tooling scaffold; no table migrations are created.

## Environment Variable Structure

### Frontend (`frontend/.env.example`)

- `VITE_API_BASE_URL`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

### Backend (`backend/.env.example`)

- `APP_ENV`
- `APP_HOST`
- `APP_PORT`
- `DATABASE_URL`
- `FIREBASE_PROJECT_ID`
- `AWS_REGION`
- `AWS_S3_BUCKET`
- `AWS_ACCESS_KEY_ID` (local only)
- `AWS_SECRET_ACCESS_KEY` (local only)

## Local Development Setup

- Backend runs with Uvicorn (dev reload enabled).
- Frontend runs with Vite dev server.
- PostgreSQL runs via Docker Compose only.
- Each app reads from its own `.env` file derived from `.env.example`.

## Docker Compose Scope

- Single PostgreSQL service.
- Named volume for persistence.
- Exposed local port (default `5432`).
- No backend/frontend containers in this phase.

## Documentation Requirements

- Root `README.md` must explain:
  - prerequisites
  - environment setup
  - starting PostgreSQL
  - starting backend
  - starting frontend
  - scaffold-only scope and non-goals

## Non-Goals For This Phase

- Route handlers
- Domain services and workflows
- DB schema/table definitions
- Auth/session business behavior
- S3 upload logic implementation

This plan is the execution baseline for initial project scaffolding only.
