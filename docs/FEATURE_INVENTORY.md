# Shosha Feature Inventory (Scaffold Phase Alignment)

This inventory is aligned to the initial implementation phase, which is setup-only scaffolding.

## Phase Intent

- Start implementation with clean monorepo scaffold.
- Lock stack/tooling choices.
- Prepare local development workflow.
- Avoid domain feature implementation in this phase.

## Stack Inventory (Approved)

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

- PostgreSQL
- Firebase Auth
- AWS S3

## Repository Inventory (Current Target)

```text
frontend/
backend/
docs/
```

## Deliverable Inventory For This Phase

### 1) Frontend Scaffold

- Project skeleton and base `src` directories.
- Tooling config (`vite`, `typescript`, lint/format setup if included).
- Dependency declarations only.

### 2) Backend Scaffold

- FastAPI app bootstrap structure only.
- SQLAlchemy/Alembic scaffolding only.
- Dependency declarations only.

### 3) Dependency Manifests

- `frontend/package.json`
- `backend/pyproject.toml`

### 4) Environment Templates

- `frontend/.env.example`
- `backend/.env.example`

### 5) Local Setup

- Commands to run Postgres, backend, and frontend locally.
- No feature code.

### 6) Docker Compose

- PostgreSQL service only.
- No application containers.

### 7) Setup Documentation

- README instructions for installation and local run.

## Explicitly Out Of Scope In This Phase

- Business logic
- API endpoints
- Database tables/migrations for domain schema
- Feature workflows (reports, feeds, scoring, disputes, etc.)

## Next Phase Preview (Not Implemented Now)

- API route design
- Domain model/table definitions
- Auth flow integration behavior
- S3 upload and media workflow behavior

## Canonical Plan Link

Detailed scaffold execution baseline:

- `docs/REBUILD_PLAN.md`
