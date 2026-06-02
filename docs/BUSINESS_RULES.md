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

## Implementation Phase Notes

- Apply these rules in service-layer orchestration and validation.
- Keep database schema focused on structure and referential integrity.
- Revisit whether selective DB-level constraints should be added after workflow stabilization.
