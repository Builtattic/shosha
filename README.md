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

## Scripts

```bash
pnpm dev
pnpm build
pnpm test
pnpm e2e
pnpm seed
```

Default seeded admin username is `admin`. Set `SEED_ADMIN_PASSWORD` before running the seed.
