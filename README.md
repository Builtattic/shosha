# Shosha

Mobile-first investigative dossier web app for social account reputation scoring.

## Local Setup

1. Install Node 20.x and Java 17+.
2. Create a Clerk app and copy its keys into `.env`.
3. Start the local Firebase backend.
4. Seed data, then run the app.

```bash
pnpm install
cp .env.example .env
pnpm emulators
pnpm seed
pnpm dev
```

Required `.env` values for sign-up/sign-in:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
```

Required `.env` values for local Firebase:

```bash
FIREBASE_PROJECT_ID=shosha-local
FIREBASE_STORAGE_BUCKET=shosha-local.appspot.com
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199
```

`GEMINI_API_KEY` powers AI adjudication and Gemini Search grounding for account discovery across Instagram, Facebook, X, YouTube, TikTok, LinkedIn, and official websites.

```bash
GEMINI_API_KEY=
GEMINI_DISCOVERY_MODEL=gemini-2.5-flash
```

Live X and Instagram credentials are optional. Without them, opening a dossier uses Gemini candidate metadata or deterministic mock social data while still writing real Firestore records.

```bash
X_BEARER_TOKEN=
INSTAGRAM_GRAPH_ACCESS_TOKEN=
INSTAGRAM_BUSINESS_ACCOUNT_ID=
META_GRAPH_VERSION=v22.0
```

## Test Flow

1. Visit `http://localhost:3000/sign-up` and create a Clerk account.
2. Open `/dashboard`.
3. Click `Create Report`, enter a target handle, upload evidence, accept the undertaking, and submit.
4. Use the feed tabs, align/oppose/comment/share/bookmark controls, notifications, settings, and the `View My Report` link.

## Scripts

```bash
pnpm dev
pnpm build
pnpm typecheck
pnpm test
pnpm e2e
pnpm emulators
pnpm seed
```
