# Shosha Feature Inventory (Migration Baseline)

This document captures the functional inventory for the rebuild effort, based on the current planning artifact and legacy behavior analysis.

## Purpose

- Establish a single migration baseline of "what the product does."
- Separate MVP-critical features from later phases.
- Help sequence implementation across `frontend/`, `backend/`, and `docs/`.

## Product Core

- Reputation and dossier platform centered on social/web identities.
- Evidence-backed community reporting for positive/negative deeds.
- Deterministic score movement through admin-governed adjudication.
- AI-assisted pre-review before human approval.

## Domain Inventory

### Critical

- Authentication and role-based authorization
- Users and onboarding profile
- Accounts/dossiers (tracked identities)
- Reports (filing, review lifecycle, evidence)
- Scoring and immutable ledger replay
- Admin tribunal and moderation queues
- Media upload and serving pipeline

### High

- Feed and discovery
- Report interactions (align/oppose, comments, bookmarks)
- Notifications
- Claims and ownership workflows
- Disputes and score reversal handling

### Medium

- Trust Badge workflow
- Moderation requests
- Impact/ranks/leaderboards
- Site settings and policy controls
- Compliance and safety workflows

### Low / Deferred

- Evidence proposals
- Bubbles (groups)
- People discovery deck + swipes
- Live social ingestion and enrichment extras
- Generic admin data center

## MVP Scope Buckets (21-Day Target)

### Must Have

- Auth, user profile, onboarding minimums
- Account search/create/track + dossier
- Report filing with required media
- AI adjudication + admin approve/reject
- Score/ledger application and replay
- Feed (approved reports) + align/oppose
- Core notifications
- Basic admin roles and settings
- AWS deployability + legal pages

### Should Have

- Claims flow (bio code + screenshot path)
- Disputes + resolution path
- Comments and bookmarks
- Reporter reputation updates
- Admin abuse view + activity log

### Nice To Have

- Audit requests and full AI audit
- Trust Badge paid automation
- Bubbles, People deck, live ingestion
- Additional compliance/support tooling

## Canonical Plan Link

The detailed architecture, database, and phased schedule lives in:

- `docs/REBUILD_PLAN.md`

Use this inventory for quick scoping and planning conversations; use the rebuild plan for implementation sequencing.
