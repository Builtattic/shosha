# Shosha

Mobile first investigative dossier webapp for social account reputation scoring.

## Local Setup

```bash
pnpm install
docker compose up -d
cp .env.example .env
pnpm seed
pnpm dev
```

Fill `.env` with MongoDB, NextAuth, Cloudinary, Gemini, Upstash, and salt values before using live integrations. Local MongoDB from `docker-compose.yml` works with `MONGODB_URI=mongodb://localhost:27017/shosha`.

Live account lookup needs platform credentials:

```bash
X_BEARER_TOKEN=
INSTAGRAM_GRAPH_ACCESS_TOKEN=
INSTAGRAM_BUSINESS_ACCOUNT_ID=
META_GRAPH_VERSION=v22.0
```

X lookup uses the X API v2 user lookup and recent user posts endpoints. Instagram lookup uses Meta Graph API Business Discovery, which can only discover Instagram Business or Creator accounts through a configured Instagram business account.

## Scripts

```bash
pnpm dev
pnpm build
pnpm test
pnpm e2e
pnpm seed
```

Default seeded admin username is `admin`. Set `SEED_ADMIN_PASSWORD` before running the seed.
