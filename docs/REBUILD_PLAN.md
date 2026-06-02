# Shosha Rebuild Plan

Status: Architecture and execution plan only - no implementation code, SQL, or migration scripts.

Context: This repository is a copy of the legacy app and is being used as the first migration workspace. The original repository remains the source of truth for latest behavior and history.

## Repository Sources

- Copy repo: `C:\Others\project\Builtattic\shosha`
- Original repo: `C:\Others\project\Builtattic\Shoshaaahhh`

If behavior differs, reconcile against the original repository before final implementation decisions.

## System Overview

Shosha is a mobile-first reputation and investigative dossier platform. It lets users:

1. Identify public social/web accounts across platforms.
2. File evidence-backed positive or negative reports.
3. See deterministic score impact after AI pre-review and admin adjudication.

Governance is core: AI flags and structures incoming filings, while admins approve/reject and trigger ledger-backed score updates.

## Core Domains

- Authentication
- Users
- Accounts
- Reports
- Scoring and Ledger
- Feed
- Report Interactions
- Notifications
- Trust Badge
- Admin / Tribunal
- Claims and Ownership
- Audits
- Disputes
- Moderation Requests
- Evidence Proposals
- Payments and Subscriptions
- AI Services
- Media
- Bubbles
- People / Discovery
- Impact, Ranks, Leaderboard
- Site Settings and Policy
- Compliance and Safety

## MVP Scope (21 Days)

### Must Have

- Auth and verification gates
- User onboarding profile
- Account search/create + dossier
- Report filing with media
- AI adjudication on submit
- Admin queue review and decisioning
- Score movement via ledger replay
- Feed and align/oppose
- Notifications
- Basic admin role controls
- Site settings baseline
- AWS deployability and legal pages

### Should Have

- Claim request flow
- Disputes with admin resolution
- Comments and bookmarks
- Reporter reputation updates
- Admin abuse panel and activity log

### Nice To Have

- Audit requests
- Trust Badge payment automation
- Evidence proposals
- Moderation requests
- Bubbles and People deck
- Live social ingestion

## PostgreSQL Design (Conceptual)

Primary entity groups:

- Identity: `users`, `sessions`/`refresh_tokens`
- Subjects: `accounts`, `account_social_links`, `account_posts`
- Reporting: `reports`, `report_media`, `report_comments`, `report_votes`, `report_bookmarks`
- Scoring: `ledger_entries`, `user_ledger_entries`, `account_score_snapshots`
- Governance: `claim_requests`, `audit_requests`, `disputes`, `moderation_requests`, `evidence_proposals`, `admin_actions`
- Platform: `notifications`, `subscriptions`, `trust_badge_submissions`, `payment_events`, `site_settings`, `deletion_requests`, `issue_reports`
- Optional social: `bubbles`, `bubble_members`, `bubble_join_requests`, `account_swipes`, `user_follows`

## Backend Shape (FastAPI)

Suggested top-level modules:

- `core/` config, security, DB, exception handling
- `api/v1/` routers by domain (`auth`, `users`, `accounts`, `reports`, `feed`, `interactions`, `notifications`, `claims`, `audits`, `disputes`, `media`, `admin`, `webhooks`)
- `services/` business logic (`scoring`, `adjudication`, `ai`, `notifications`, `media`, `feed_ranking`)
- `models/`, `schemas/`, optional `repositories/`

## Frontend Shape (React + Vite)

Suggested top-level app structure:

- `src/routes/` route trees and guards
- `src/pages/` route-level pages
- `src/features/` domain UI/hooks
- `src/components/ui/` reusable primitives
- `src/components/viz/` score visualizations
- `src/services/` typed API clients
- `src/hooks/`, `src/lib/`, `src/types/`, `src/styles/`

## Build Order (3 Weeks)

### Week 1

- Infra/skeleton
- Auth/users
- Accounts and dossier
- Media upload
- Report create flow
- AI adjudication
- Admin queue read path

### Week 2

- Scoring engine and replay
- Admin approve/reject with score impact
- Onboarding gates
- Feed + align/oppose
- Notifications
- Claims and disputes MVP

### Week 3

- Comments/bookmarks
- Abuse/safety controls
- Impact dashboard basics
- Admin operations pages and logs
- Legal/public pages
- Hardening, smoke tests, launch

## Risks

- Scoring complexity can delay MVP -> freeze workbook early and prioritize replay path.
- AI latency can slow filing -> keep async fallback and status polling.
- Scope creep in low-priority social features -> strict feature flags and deferment.

## Notes

- Consolidate legacy parallel "events" concepts into `reports` + `ledger_entries`.
- Keep scoring auditable and replayable as a first-class requirement.
- Use this file as the migration blueprint for initial monorepo setup.
