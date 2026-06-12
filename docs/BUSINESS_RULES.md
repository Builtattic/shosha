# Shosha V2 Business Rules Backlog

This document tracks service-layer business constraints that should be enforced in application logic (and optionally reinforced with DB checks where appropriate).

## Scope

- Service/use-case layer rules
- Domain invariants that are not purely schema structure
- Future enforcement guidance for repository/service implementation

## Rules To Enforce

### 1) Firebase Identity Immutability

- `users.firebase_uid` is immutable after user creation.
- User update flows must reject attempts to change `firebase_uid`.

### 2) Account Ownership Claim Lifecycle

- `accounts.owner_user_id` remains nullable before successful claim.
- On approved claim flow, `accounts.owner_user_id` must be set to the approved claimant.
- Claim rejection must not mutate existing account ownership.

### 3) Moderation Audit Completeness

- `reports.reviewed_by` and `reports.reviewed_at` are optional while report status is `PENDING`.
- When report status moves from `PENDING` to a moderated state (`APPROVED`, `REJECTED`, `REMOVED`), both fields become required.
- Moderation transitions without reviewer metadata must be rejected by service logic.

### 4) Notification Trigger Invariants

Notifications are created via `notification_repository.create` (flush only); the owning service commits. Triggers and recipients:

- **Vote (align/oppose)** — notify the report's reporter (`reporter_user_id`). Skip when the reporter is anonymous (`NULL`) or the actor is the reporter. Type `REPORT`; metadata: `report_id`, `actor_id`, `account_id`.
- **Comment** — same recipient and guards as vote. Type `REPORT`.
- **Moderation request (create)** — fan-out to every user with role `MODERATOR`, `ADMIN`, or `SUPER_ADMIN`. Type `MODERATION`; metadata: `moderation_request_id`, `report_id`, `account_id`.
- **Claim decide** — notify the claim's `requester_user_id` on both APPROVED and REJECTED. Type `CLAIM`; metadata: `claim_id`, `account_id`.
- **Dispute file** — notify the original report's reporter (not the filer). Skip when reporter is anonymous or is the filer. Type `DISPUTE`; metadata: `report_id`, `dispute_id`, `account_id`.
- **Dispute decide** — notify the dispute's `requester_user_id` (filer). Type `DISPUTE`; metadata: `dispute_id`, `report_id`, `account_id`.
- **Deletion request (create)** — fan-out to moderators/admins (same role set as moderation requests). Type `SYSTEM`; metadata: `deletion_request_id`, `requested_by`.
- **Trust badge webhook** — `subscription.cancelled` emits "Trust badge cancelled"; `subscription.halted` emits "Trust badge payment failed". `subscription.completed` and `subscription.charged` emit nothing (V1 parity). Type `TRUST_BADGE`; empty metadata.
- **Abuse dismiss** — notify the report's reporter. Type `SYSTEM`; metadata: `report_id`, `account_id`.

Notification failures must never roll back the primary action: the primary mutation commits first, the notification commits separately afterward.

## Implementation Phase Notes

- Apply these rules in service-layer orchestration and validation.
- Keep database schema focused on structure and referential integrity.
- Revisit whether selective DB-level constraints should be added after workflow stabilization.
