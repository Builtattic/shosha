# Shosha . Claude Code Build Prompt

P   aste this entire document into Claude Code as your initial prompt. It is a full specification. Work through it in the phased order at the bottom.

---

## 1. Product Overview

Shosha is a mobile first webapp that rates social media accounts from Instagram and Twitter (X). Anyone can search an account and see its Shosha Score (0 to 100, starting baseline 60). Any user (anonymous or registered) can file a report (positive or negative) about a specific incident. Every report must include media proof, a 2 to 3 line description of what happened, and a 2 to 3 line statement of how the filer felt. Reports are first adjudicated by Shosha AI, then a human admin approves or rejects and sets the final score impact. Registered users can claim their own account and request a fresh audit.

The aesthetic is dossier / editorial / investigative. Dark theme, serif display font (Instrument Serif), monospace body (JetBrains Mono), sharp electric lime accent (#d4ff4a). The score is always the hero element.

---

## 2. Tech Stack (use exactly these)

Frontend and backend in one repo using Next.js 14 App Router.

* **Framework**: Next.js 14 (App Router) with TypeScript, strict mode on
* **Styling**: Tailwind CSS with custom theme tokens
* **Data viz**: D3.js v7 (semicircle gauge, line history, radar breakdown)
* **Icons**: lucide-react
* **Database**: MongoDB Atlas via Mongoose
* **Auth**: NextAuth.js (credentials provider, JWT strategy)
* **Password hashing**: bcrypt
* **AI**: Shosha AI via the configured model provider, with structured output
* **Media**: Cloudinary (images and short video clips, signed uploads)
* **Validation**: Zod on every API route boundary
* **Rate limiting**: @upstash/ratelimit with Redis
* **Deploy target**: Railway (NOT Vercel). Use a Dockerfile, not Vercel runtime.

Node 20. pnpm as package manager.

---

## 3. Project Structure

```
shosha/
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx                    # Home / search feed
│   │   │   └── account/[id]/page.tsx       # Dossier / profile view
│   │   ├── (auth)/
│   │   │   ├── signin/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (app)/
│   │   │   ├── dashboard/page.tsx          # Claimed accounts + my filings
│   │   │   └── admin/
│   │   │       ├── page.tsx                # Queue
│   │   │       └── review/[reportId]/page.tsx
│   │   ├── api/
│   │   │   ├── accounts/
│   │   │   │   ├── route.ts                # GET list, POST create
│   │   │   │   ├── search/route.ts         # GET ?q=
│   │   │   │   ├── [id]/route.ts           # GET one, PATCH
│   │   │   │   ├── [id]/claim/route.ts     # POST claim
│   │   │   │   └── [id]/audit/route.ts     # POST audit request
│   │   │   ├── reports/
│   │   │   │   ├── route.ts                # POST create, GET list (admin)
│   │   │   │   ├── [id]/route.ts           # GET one
│   │   │   │   └── [id]/adjudicate/route.ts # POST admin verdict
│   │   │   ├── media/upload/route.ts       # Signed Cloudinary upload
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   └── ai/analyze/route.ts         # Internal Shosha analysis call
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── viz/
│   │   │   ├── ScoreGauge.tsx
│   │   │   ├── ScoreHistory.tsx
│   │   │   └── ScoreRadar.tsx
│   │   ├── ui/                             # Primitives (Button, Input, Modal, etc.)
│   │   ├── feed/                           # Home components
│   │   ├── profile/                        # Dossier components
│   │   ├── report/                         # Report flow
│   │   ├── admin/                          # Tribunal components
│   │   └── nav/BottomNav.tsx
│   ├── lib/
│   │   ├── db.ts                           # Mongoose connection cache
│   │   ├── auth.ts                         # NextAuth config
│   │   ├── gemini.ts                       # Gemini provider client + Shosha prompts
│   │   ├── cloudinary.ts                   # Signed upload helper
│   │   ├── ratelimit.ts
│   │   ├── scoring.ts                      # Score math, history append
│   │   └── validators.ts                   # Zod schemas (single source of truth)
│   ├── models/
│   │   ├── User.ts
│   │   ├── Account.ts
│   │   ├── Report.ts
│   │   ├── ClaimRequest.ts
│   │   └── AuditRequest.ts
│   ├── types/index.ts
│   └── styles/fonts.ts
├── public/
├── scripts/
│   └── seed.ts                             # Seeds 10 accounts + demo admin
├── .env.example
├── Dockerfile
├── docker-compose.yml                      # Local mongo + redis
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. Data Models (Mongoose)

### User
```
{
  _id, username (unique, lowercased), email (unique), passwordHash,
  role: 'user' | 'admin',
  reporterScore: number (default 50, reputation of their filings),
  claimedAccounts: [ObjectId ref Account],
  createdAt, updatedAt
}
```

### Account
```
{
  _id, platform: 'x' | 'instagram', username (lowercased),
  displayName, bio, avatarUrl, verified: boolean, followers: string,
  score: number (default 60, clamped 0 to 100),
  scoreHistory: [{ t: Date, s: number, cause: 'seed' | 'report' | 'audit' | 'decay' }],
  breakdown: { authenticity, engagement, community, content, impact } (each 0 to 100),
  posts: [{ externalId, content, likes, replies, mediaUrl, capturedAt }],
  claimed: boolean, claimedBy: ObjectId ref User,
  createdAt, updatedAt,
  compound unique index: (platform, username)
}
```

### Report
```
{
  _id, accountId: ObjectId,
  reporterId: ObjectId | null (null = anonymous),
  anonymousTag: string (e.g. "anon_a3f2" shown publicly instead of reporterId),
  type: 'positive' | 'negative',
  description: string (max 500 chars),
  feelings: string (max 500 chars),
  media: { publicId, url, type: 'image' | 'video', width, height, bytes },
  status: 'pending_ai' | 'ai_reviewed' | 'approved' | 'rejected' | 'flagged',
  aiVerdict: {
    valid: boolean, confidence: number (0 to 1),
    proposedImpact: number (integer -10 to 10),
    reasoning: string, categoryTags: [string],
    abuseFlags: [string], analyzedAt: Date
  },
  adminDecision: {
    adminId: ObjectId, verdict: 'approved' | 'rejected',
    finalImpact: number, note: string, decidedAt: Date
  } | null,
  createdAt, updatedAt
}
```

### ClaimRequest
```
{
  _id, userId, accountId,
  proofType: 'bio_code' | 'dm_screenshot' | 'oauth',
  proofPayload: mixed, status: 'pending' | 'approved' | 'rejected',
  createdAt, reviewedAt, reviewedBy
}
```

### AuditRequest
```
{
  _id, userId, accountId, reason: string,
  status: 'pending' | 'in_progress' | 'completed',
  createdAt
}
```

---

## 5. API Endpoints (every one)

All routes return `{ ok: true, data }` or `{ ok: false, error: { code, message } }`. Validate every input with Zod.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /api/auth/signup | public | Create account |
| POST | /api/auth/[...nextauth] | public | NextAuth |
| GET | /api/accounts/search?q= | public | Typeahead + full search |
| GET | /api/accounts/:id | public | Full dossier |
| POST | /api/accounts | user | Register a new account to track |
| POST | /api/accounts/:id/claim | user | Submit claim proof |
| POST | /api/accounts/:id/audit | user (owner) | Request fresh audit |
| GET | /api/reports?accountId= | public | Public filings for account |
| POST | /api/reports | anyone | Create report (kicks off AI adjudication) |
| GET | /api/reports/queue | admin | Queue filtered by status |
| POST | /api/reports/:id/adjudicate | admin | Approve or reject, set final impact |
| POST | /api/media/upload | anyone | Return signed Cloudinary upload params |
| GET | /api/admin/claims | admin | Pending claim requests |
| POST | /api/admin/claims/:id/decide | admin | Approve or reject claim |
| GET | /api/admin/audits | admin | Pending audit requests |
| POST | /api/admin/audits/:id/run | admin | Trigger AI full audit (see section 10) |
| GET | /api/admin/stats | admin | Dashboard counters |

Rate limits (Upstash):
* POST /api/reports: 3 per hour per IP for anonymous, 10 per hour per user
* POST /api/accounts/:id/claim: 3 per day per user
* POST /api/auth/signup: 5 per hour per IP
* GET /api/accounts/search: 60 per minute per IP

---

## 6. Core User Flows (step by step)

### 6.1 Search and view a dossier
1. User lands on home. Sees search input + indexed accounts list sorted by score + wire of recent filings.
2. User types. Debounced 250ms call to `/api/accounts/search?q=`.
3. User taps an account. Navigate to `/account/[id]`.
4. Dossier page loads: D3 gauge (animated semicircle), score delta vs previous filing, history chart, breakdown radar, posts feed, filings on record.
5. If the account does not exist yet but the user searched for a valid handle, show a "Track this account" button that POSTs to `/api/accounts` which fetches the account's public metadata (scaffold with placeholder until API access is wired) and creates it with baseline score 60.

### 6.2 File a report (the critical flow)
Three-step modal, do not let users skip steps.

**Step 1: Type selection**
* Positive or negative radio cards. Explain each raises or lowers the score.

**Step 2: Evidence and description**
* Media upload (required). Client calls `/api/media/upload` to get signed params, then uploads directly to Cloudinary. Store returned `publicId` and `secureUrl`. Accept image (jpg, png, webp up to 8MB) or video (mp4, webm up to 25MB, duration under 60s). Preview inline. Allow replace.
* Description textarea. Min 10 chars, max 500. Show live counter.

**Step 3: Feelings + submit**
* Feelings textarea. Min 10 chars, max 500.
* On submit: POST `/api/reports`. The route creates the report with `status: 'pending_ai'`, synchronously calls Shosha analysis (see section 10), updates the report with `aiVerdict` and `status: 'ai_reviewed'` or `status: 'flagged'` if abuse detected. Returns the full report.
* Show the AI verdict card inline: valid / invalid, confidence %, proposed impact, reasoning. User taps confirm to file.
* Do NOT adjust the account score yet. Score only moves after admin approval.

### 6.3 Claim your account
1. User signs in. On any dossier they open, the Claim button is active.
2. Claim modal offers three proof types:
   * **bio_code**: we generate a short code (e.g. "shosha-9xk3"). User adds it to their bio for 5 minutes. Backend fetches their public bio and verifies (scaffold the fetcher, use a mock until Instagram / X API is wired).
   * **dm_screenshot**: user uploads a screenshot of a DM from an admin account.
   * **oauth**: placeholder for future OAuth flows on X and Instagram.
3. On success the Account gets `claimed: true, claimedBy: user._id`, and a ClaimRequest with `status: 'approved'`.
4. For `dm_screenshot`, status is `pending` and an admin must approve.

### 6.4 Request an audit (owner only)
1. Owner of a claimed account opens dossier, taps Request Audit.
2. Modal asks for reason (optional). POST `/api/accounts/:id/audit`.
3. Creates AuditRequest with status `pending`.
4. Admin later triggers the audit. It re-runs AI analysis across all approved reports plus recent post activity and recomputes the breakdown and score. Append to history with `cause: 'audit'`.

### 6.5 Anonymous reporting
* If no session, the POST /api/reports accepts `reporterId: null` and server generates a stable `anonymousTag` from a hash of IP + userAgent + salt (for rate limiting and light abuse detection only, never shown as identifying info).
* The tag shown publicly is shortened like "anon_a3f2".

---

## 7. Admin Features (the full tribunal)

Admin role is set manually in DB or via seed. Only admins see the Tribunal tab.

### 7.1 Adjudication queue
* List reports where `status === 'ai_reviewed'` or `status === 'pending_ai'` (stuck).
* Each row shows: account, type, AI confidence, AI proposed impact, snippet.
* Filter by platform, type, date range, AI confidence band.
* Sort by oldest first (default) or by AI confidence.

### 7.2 Review screen
* Full report card with media preview (image or video player).
* AI verdict block with reasoning, confidence, proposed impact, category tags, abuse flags.
* Slider to override impact (-10 to +10). Live preview of the resulting account score.
* Note field (internal admin notes, stored on the report).
* Buttons: Reject, Approve + apply.
* On approve: update report `adminDecision`, push `scoreHistory` entry on Account, recompute `breakdown` using the impact distributed across relevant traits (see scoring.ts), update `score`.
* Also update the reporter's `reporterScore`: approved filings +2, rejected -3, clamped 0 to 100. Anonymous reports do not affect reputation.

### 7.3 Claim approvals
* List pending ClaimRequests where `proofType: 'dm_screenshot'`.
* Admin reviews screenshot, approves or rejects.

### 7.4 Audit execution
* Admin triggers an audit. Backend batches all approved reports for that account through Shosha analysis with a "full audit" prompt (see section 10.2) that returns a rebalanced breakdown and score. Applied as a single history entry.

### 7.5 Abuse and manipulation panel
* List reports where `aiVerdict.abuseFlags.length > 0` (e.g. coordinated, spam, off-topic, doxxing).
* Quick reject bulk action.

### 7.6 Stats dashboard
* Counts: accounts tracked, filings total, filings last 7 days, queue depth, average AI-to-admin agreement rate.
* Simple bar charts with D3.

---

## 8. Scoring Logic (`src/lib/scoring.ts`)

```
applyImpact(account, impact, cause) {
  const prev = account.score
  const next = clamp(prev + impact, 0, 100)
  // distribute impact across breakdown traits weighted by category tags
  // default distribution: even across all 5 traits
  // if AI returned categoryTags, weight those traits 2x
  // clamp each trait 0 to 100
  account.score = next
  account.scoreHistory.push({ t: new Date(), s: next, cause })
  return account
}
```

Decay job (optional, cron in future phase): once a month, pull untouched accounts toward baseline 60 by 1 point. Skip for now, leave a TODO.

---

## 9. Frontend Routes and Views

### Public
* `/` Home. Search + sorted account list + recent filings wire.
* `/account/[id]` Dossier. Gauge, history, radar, posts, filings, action buttons.
* `/signin`, `/signup`

### Authenticated
* `/dashboard` Claimed accounts, my filings with status tags.

### Admin
* `/admin` Queue overview + stats tiles.
* `/admin/review/[reportId]` Review screen.
* `/admin/claims`, `/admin/audits`, `/admin/abuse`

### Global
* Fixed bottom nav: Feed, You, Tribunal (admin only).
* Top right: sign-in chip when anonymous.
* Toast system for post action feedback.

All pages must be mobile first, max-width 448px content column centered on desktop. Touch targets minimum 44px. Respect safe area insets.

---

## 10. Shosha AI Integration (`src/lib/gemini.ts`)

Use Gemini as the underlying model provider with Shosha-branded prompts and structured JSON responses. One module exports two functions.

### 10.1 Adjudicate a single report

```ts
adjudicateReport({ description, feelings, type, accountDisplayName, platform, mediaDescription? })
```

System prompt (exact):
```
You are the adjudicator for Shosha, a reputation platform for social media accounts. Grade an individual filing for validity and determine how it should impact a score.

Your output must be strict JSON matching the provided schema. No prose outside JSON.

Scoring guidance:
- Vague emotional complaints without specifics: low confidence, small magnitude (-1 to +1).
- Concrete dated incidents with evidence: high confidence, larger magnitude (up to -10 or +10).
- Positive filings produce positive proposedImpact, negative filings produce negative.
- Flag coordinated brigading, off topic vendettas, doxxing, or pure opinion as abuse. Set valid=false and list flags.

Categorize each filing with up to 3 tags from: authenticity, engagement, community, content, impact, harassment, misinformation, philanthropy, professionalism, controversy.
```

Response schema:
```json
{
  "valid": "boolean",
  "confidence": "number 0 to 1",
  "proposedImpact": "integer -10 to 10",
  "reasoning": "one to two sentences",
  "categoryTags": "array of strings",
  "abuseFlags": "array of strings (empty if clean)"
}
```

User message: serialize the report fields as labeled text.

### 10.2 Full account audit

```ts
runFullAudit({ account, approvedReports, recentPosts })
```

System prompt:
```
You audit a social media account's reputation holistically. Given a list of admin-approved filings and recent posts, return a rebalanced Shosha Score and trait breakdown. Weight recent events more than old ones (exponential decay by days). Do not produce impacts larger than +/- 15 from current score in a single audit.
```

Response schema:
```json
{
  "newScore": "integer 0 to 100",
  "breakdown": { "authenticity": "int", "engagement": "int", "community": "int", "content": "int", "impact": "int" },
  "summary": "two sentences explaining the change"
}
```

### 10.3 Network failure handling
* Timeout 20s. On failure, return a heuristic fallback: simple keyword match, small magnitude, `confidence: 0.3`, reasoning: "Heuristic fallback (AI unavailable)".

---

## 11. D3 Visualizations

Use D3 in React via refs. Clean up on unmount.

### ScoreGauge
* Semicircle arc, 0 to 100 maps to -90deg to +90deg.
* Background arc neutral gray.
* Foreground arc color keyed to score band: green >=75, lime 50 to 74, orange 30 to 49, red <30.
* Animated sweep on mount (1.3s ease-cubic-out).
* Tick marks every 5 units, bolder every 25.
* Needle line from center to value arc.
* Numeric score rendered with Instrument Serif 64px overlaid.

### ScoreHistory
* Line chart with area fill gradient.
* Responsive width. Min 2 points, draw line. Animate line using stroke-dashoffset.
* Horizontal grid at 0, 50, 100.

### ScoreRadar
* 5 axes (the breakdown traits).
* Concentric polygon gridlines at 25, 50, 75, 100.
* Data polygon animated from center to final shape.
* Axis labels monospace 9px uppercase.

---

## 12. Styling Tokens (Tailwind config)

```
colors: {
  bg:        '#0a0a0a',
  raised:    '#131313',
  border:    '#262626',
  dim:       '#1a1a1a',
  text:      '#f5f5f0',
  muted:     '#7a7a70',
  subtle:    '#555555',
  accent:    '#d4ff4a',
  success:   '#6ee787',
  warn:      '#ffa24a',
  danger:    '#ff4466',
  xPlat:     '#ffffff',
  igPlat:    'linear-gradient(135deg, #e1306c, #f77737)'
},
fontFamily: {
  serif: ['Instrument Serif', 'serif'],
  mono:  ['JetBrains Mono', 'monospace']
}
```

Load fonts via `next/font/google`.

---

## 13. Security and Abuse Prevention

* Bcrypt password hashing, cost 12.
* CSRF protection via NextAuth built-in for auth routes. For mutation APIs, verify session server-side.
* Zod on every route boundary, never trust client.
* Strip EXIF from uploaded images at Cloudinary level.
* Max media size enforced both client (warning) and server (hard reject).
* Rate limits (see section 5).
* Simple IP + fingerprint hashing for anonymous tag (never store raw IP).
* All admin routes guarded by middleware that checks `session.user.role === 'admin'`.
* On claim by bio_code, expire the code after 10 minutes.
* Do not expose Cloudinary API secret client side. Signed uploads only.

---

## 14. Environment Variables (`.env.example`)

```
MONGODB_URI=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GEMINI_API_KEY=
GEMINI_MODEL=
GEMINI_DISCOVERY_MODEL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
ANONYMOUS_TAG_SALT=
NODE_ENV=development
```

---

## 15. Seed Script (`scripts/seed.ts`)

* Create admin user (username `admin`, password from env `SEED_ADMIN_PASSWORD`).
* Create 10 test accounts across X and Instagram with varied scores (30 to 90), realistic breakdowns, 3 posts each, 3 seeded approved reports.
* Run via `pnpm seed`.

---

## 16. Build Order (execute in this exact sequence)

Do each phase fully and commit to a fresh git branch before the next. Verify with a manual smoke test at the end of each phase before moving on.

**Phase 1: Skeleton**
* Initialize Next.js 14 app with TypeScript, Tailwind, pnpm.
* Commit `.env.example`, Dockerfile, docker-compose.yml (mongo + redis).
* Set up `src/lib/db.ts` Mongoose connection cache.
* Configure fonts via next/font/google.
* Set Tailwind tokens from section 12.
* Create empty page shells for every route in section 9.
* Bottom nav component.

**Phase 2: Auth**
* NextAuth credentials provider, JWT strategy.
* User model + signup/signin pages.
* Middleware to guard `/dashboard` and `/admin`.
* Seed script with admin user.

**Phase 3: Accounts**
* Account model.
* `/api/accounts/*` endpoints.
* Home page with search + sorted list.
* Dossier page with posts feed and action buttons (no viz yet).

**Phase 4: Visualizations**
* Build `ScoreGauge`, `ScoreHistory`, `ScoreRadar` components in isolation.
* Wire into dossier page.
* Animate on mount.

**Phase 5: Media pipeline**
* Cloudinary setup.
* Signed upload endpoint.
* Client side uploader component with preview + replace.

**Phase 6: Reporting**
* Report model + endpoints.
* Three step report modal.
* Shosha analysis module with heuristic fallback.
* Wire POST /api/reports to call Shosha analysis and return verdict.
* Render verdict card in the modal.

**Phase 7: Admin tribunal**
* Admin queue page.
* Review screen with impact slider.
* Approve / reject flow.
* Apply impact to Account.score and history.
* Update reporter reputation.

**Phase 8: Claim and audit**
* ClaimRequest + AuditRequest models and endpoints.
* Claim modal with three proof types (bio_code scaffold + dm_screenshot live, oauth as TODO).
* Audit request flow and admin execution of full audit.

**Phase 9: Polish**
* Abuse panel (filter by abuseFlags non-empty).
* Stats dashboard with D3 bar charts.
* Toast system.
* Empty states for every list.
* Loading skeletons, not spinners, on list screens.
* Error boundaries.

**Phase 10: Hardening and deploy**
* All rate limits wired with Upstash.
* Zod everywhere.
* Dockerfile validated. Railway.json config file. Deploy.
* Seed production DB with 10 accounts minimum.
* README with run instructions.

---

## 17. Testing (write as you go, do not defer)

* Vitest for unit tests on `src/lib/scoring.ts` and `src/lib/gemini.ts` (mock Shosha analysis client).
* Playwright for one E2E: sign up, file a report, admin approves, score updates.
* Test every API route with a request and assert response shape.

---

## 18. Deployment (Railway, not Vercel)

* Railway project with services: web (Docker), mongo (official), redis (official).
* Expose web on $PORT.
* Health check endpoint at `/api/health` returns `{ ok: true }`.
* Claim a railway.app subdomain for now, wire custom domain later.

Note: the author has a specific concern with Vercel's Hobby plan commercial use terms for other products. Do not deploy this to Vercel.

---

## 19. Guardrails for Claude Code

* Never use em dashes, en dashes, or plain hyphens as punctuation in any UI copy or generated prose. Restructure sentences.
* Use "Shosha Score" (capitalized) as a proper noun in UI.
* Do not use generic AI aesthetics. Follow the dossier direction exactly: Instrument Serif, JetBrains Mono, dark palette, electric lime accent, monospace data grids.
* Every list must have an empty state copy written in editorial voice.
* Every destructive action requires a confirmation step.
* All media must be preview-able before submission.
* When in doubt about a product decision, default to the more editorial / investigative choice.

---

## 20. Out of Scope (explicitly not in v1)

* Real Instagram / X API ingestion (scaffold with placeholders, leave TODOs).
* OAuth claim flow (scaffold only).
* Email notifications.
* Payments or paid tiers.
* Multi language.
* Push notifications.
* Native mobile shell.

Leave clear TODO comments where these touch the code.

---

Begin with Phase 1. Confirm the folder structure matches section 3 before writing any route code.
