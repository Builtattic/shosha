# Shosha V2 Project Setup

This document defines the greenfield foundation for Shosha V2. It intentionally focuses on scaffolding, architecture boundaries, and local development setup only.

## 1) Frontend Foundation Structure

Target: `frontend/src/`

```text
frontend/src/
├── api/
├── assets/
├── components/
│   ├── ui/
│   └── common/
├── features/
│   ├── auth/
│   ├── users/
│   ├── accounts/
│   ├── reports/
│   ├── notifications/
│   └── admin/
├── hooks/
├── layouts/
├── lib/
├── pages/
├── providers/
├── routes/
├── types/
├── utils/
└── main.tsx
```

Responsibilities:

- `api/`: Axios clients, request/response adapters, and API modules grouped by domain.
- `assets/`: Static files such as images, icons, and fonts used by the web app.
- `components/ui/`: Design-system primitives (shadcn/ui generated and wrapped UI components).
- `components/common/`: Shared cross-feature components (headers, empty states, loaders, dialogs).
- `features/`: Domain modules (`auth`, `users`, `accounts`, `reports`, `notifications`, `admin`) containing feature-scoped UI, hooks, API usage, and validation.
- `hooks/`: Reusable custom React hooks that are not limited to one feature module.
- `layouts/`: Route-level layout shells (authenticated layout, public layout, admin layout).
- `lib/`: Framework-level helpers and configuration (Axios instance, query client, firebase client, constants).
- `pages/`: Page entry components that compose layouts + feature modules.
- `providers/`: App providers (React Query provider, Router provider wrappers, theme provider).
- `routes/`: Route definitions, route guards, and route metadata.
- `types/`: Global/shared TypeScript types and interfaces used across modules.
- `utils/`: Pure utility functions (formatting, parsing, date/math helpers, safe mappers).
- `main.tsx`: Frontend bootstrap entrypoint that mounts providers and the router.

Boundary rules:

- Keep `features/*` self-contained for scalability and easier future extraction.
- Keep UI primitives in `components/ui` and avoid placing domain logic there.
- Keep `api/` focused on transport concerns; business rules should stay in feature/domain layers.

## 2) Backend Foundation Structure

Target: `backend/app/`

```text
backend/app/
├── api/
│   └── v1/
├── core/
├── db/
├── models/
├── schemas/
├── repositories/
├── services/
├── integrations/
│   ├── firebase/
│   └── s3/
├── middleware/
├── utils/
└── main.py
```

Responsibilities:

- `api/v1/`: FastAPI routers, request handlers, dependency wiring, and HTTP contracts for version `v1`.
- `core/`: Application-wide settings/config, startup wiring, logging, error handling conventions, security primitives.
- `db/`: SQLAlchemy engine/session setup, DB base metadata, and transaction/session helpers.
- `models/`: SQLAlchemy ORM models only (persistence entities and relationships).
- `schemas/`: Pydantic v2 request/response schemas and internal DTOs.
- `repositories/`: Data access layer that isolates SQLAlchemy queries from service logic.
- `services/`: Use-case/business orchestration layer using repositories and integrations.
- `integrations/firebase/`: Firebase Admin SDK related adapters (token verification, provider utilities).
- `integrations/s3/`: Boto3 S3 client setup and storage gateway interfaces for future use.
- `middleware/`: Cross-cutting FastAPI middleware (request IDs, timing, CORS policy, auth context injection).
- `utils/`: Generic reusable helpers (time, id generation, serialization helpers) without business coupling.
- `main.py`: FastAPI app bootstrap and top-level registration (middleware, routers, startup/shutdown).

Layering contract:

- API layer depends on services, not repositories directly.
- Services depend on repositories and integrations.
- Repositories depend on db/models.
- Integrations are isolated behind service-facing interfaces for testability.

## 3) Environment Variables (Documentation Only)

Do not create `.env.example` files in this phase. Add these keys manually when needed.

Frontend variables:

- `VITE_API_URL`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

Backend variables:

- `DATABASE_URL`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `S3_BUCKET_NAME`

Notes:

- For local PostgreSQL with Docker, common format is:
  - `DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/shosha_v2`
- If storing Firebase private key in a single-line env variable, preserve newline escapes (`\n`) and unescape at load time in backend config.

## 4) Dependency Installation Commands

### Frontend (npm)

Create app shell:

```bash
npm create vite@latest frontend -- --template react-ts
```

Install runtime dependencies:

```bash
cd frontend
npm install react-router-dom @tanstack/react-query axios react-hook-form zod @hookform/resolvers firebase
```

Install styling/UI dependencies:

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npx shadcn@latest init
```

Install optional foundation dependencies for UI ergonomics:

```bash
npm install clsx tailwind-merge class-variance-authority lucide-react
```

### Backend (uv)

Initialize project:

```bash
cd backend
uv init
```

Install runtime dependencies:

```bash
uv add fastapi uvicorn[standard] sqlalchemy alembic psycopg[binary] pydantic pydantic-settings python-dotenv firebase-admin boto3
```

Install development dependencies:

```bash
uv add --dev ruff black mypy pytest pytest-asyncio httpx
```

## 5) Local Development Setup

Recommended startup order:

1. Start PostgreSQL + pgAdmin (Docker Compose).
2. Start backend FastAPI server.
3. Start frontend Vite dev server.

### Start frontend

```bash
cd frontend
npm install
npm run dev
```

### Start backend

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Alembic initialization (once)

```bash
cd backend
uv run alembic init alembic
```

Configure `alembic.ini` and `alembic/env.py` to use `DATABASE_URL` from app settings.

### Create migration revision (after models exist)

```bash
cd backend
uv run alembic revision --autogenerate -m "init schema"
uv run alembic upgrade head
```

### PostgreSQL connection quick check

Using Docker container shell:

```bash
docker compose exec postgres psql -U postgres -d shosha_v2 -c "SELECT 1;"
```

From host if `psql` installed:

```bash
psql "postgresql://postgres:postgres@localhost:5432/shosha_v2" -c "SELECT 1;"
```

## 6) Local Docker Setup

Create a local-only `docker-compose.yml` at repository root with PostgreSQL + pgAdmin. Application containers are intentionally excluded in this stage.

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: shosha_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: shosha_v2
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d shosha_v2"]
      interval: 10s
      timeout: 5s
      retries: 5

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: shosha_pgadmin
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@shosha.local
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - pgadmin_data:/var/lib/pgadmin

volumes:
  postgres_data:
  pgadmin_data:
```

Run commands:

```bash
docker compose up -d
docker compose ps
```

pgAdmin connection settings:

- Host: `postgres` (inside compose network) or `localhost` (from host tools)
- Port: `5432`
- User: `postgres`
- Password: `postgres`
- Database: `shosha_v2`

## 7) Authentication Architecture (No Implementation Code)

### Frontend Firebase Auth flow

1. User signs in/up using Firebase client SDK in frontend.
2. Firebase returns ID token (JWT) for the authenticated user session.
3. Frontend attaches token in `Authorization: Bearer <id_token>` for backend API calls.
4. Frontend token refresh is handled by Firebase SDK; API client always sends latest token.

### Backend Firebase token verification flow

1. FastAPI auth dependency extracts bearer token from request header.
2. Backend Firebase integration verifies token signature and claims through Firebase Admin SDK.
3. Backend maps verified claims (`uid`, email, provider, custom claims) into internal auth context.
4. Request proceeds only if token is valid and authorization checks pass.

### User creation/sync flow

1. First authenticated API call arrives with verified Firebase token.
2. Backend checks if internal user record exists by Firebase `uid`.
3. If not found, backend creates local user row with mapped identity fields.
4. If found, backend updates mutable profile metadata (for example display name/photo if policy allows).
5. Backend returns internal user profile + role/permissions context for app usage.

### Protected route flow

Frontend side:

1. Route guard checks local auth state (Firebase session + optional hydrated user profile).
2. Unauthenticated users are redirected to public/auth pages.
3. Authenticated users can access protected route components.

Backend side:

1. Every protected endpoint uses token verification dependency.
2. Optional authorization policy checks role/permissions.
3. Unauthorized/forbidden requests return consistent `401/403` responses.

```mermaid
flowchart TD
    User[User] -->|SignIn| FrontendAuth[FrontendFirebaseSDK]
    FrontendAuth -->|IssueIdToken| FrontendClient[FrontendApp]
    FrontendClient -->|BearerToken| ApiGateway[FastAPIAuthDependency]
    ApiGateway -->|VerifyToken| FirebaseAdmin[FirebaseAdminIntegration]
    FirebaseAdmin -->|VerifiedClaims| UserSync[UserSyncService]
    UserSync -->|CreateOrUpdateUser| Postgres[(PostgreSQL)]
    UserSync -->|AuthContext| ProtectedApi[ProtectedAPIEndpoint]
    ProtectedApi -->|Response| FrontendClient
    FrontendClient -->|RenderGuardedRoute| User
```

## 8) Development Roadmap (Post-Scaffold)

Implementation order after foundation setup:

### Phase 1: Users

- Establish user profile domain baseline and account identity mapping.
- Complete user CRUD + profile retrieval contracts.
- Stabilize auth-to-user synchronization behavior.

### Phase 2: Accounts

- Introduce account domain boundaries and ownership rules.
- Implement account-level data access patterns and policies.
- Add account context switching contracts where needed.

### Phase 3: Reports

- Implement report domain model and creation/retrieval workflows.
- Add report processing orchestration and status lifecycle.
- Introduce auditability hooks for report changes.

### Phase 4: Notifications

- Add notification domain contracts and delivery orchestration.
- Integrate trigger points from existing domains (users/accounts/reports).
- Define read/unread tracking and notification preference baseline.

### Phase 5: Admin

- Implement admin-only policies, routes, and moderation operations.
- Add elevated oversight workflows for governance and dispute handling.
- Finalize operational controls and observability for privileged actions.

## Non-Goals For This Foundation Stage

- No product feature implementation.
- No legacy architecture carryover (Next.js, Firebase RTDB, Firestore patterns).
- No completed domain workflows beyond scaffolding contracts.
