# Phase 1 architecture

The repository separates `frontend/` (Next.js UI and application composition) from `backend/` (Convex schema and server functions). The frontend never owns database logic or secrets.

## Authentication and authorization

Clerk identity is validated by Convex JWT authentication. Backend functions call `ctx.auth.getUserIdentity()` and enforce permissions server-side. The user profile stores one of `ADMIN`, `WARDEN`, or `STUDENT`, plus `ACTIVE`/`INACTIVE` status. An authenticated identity without an application profile receives `PENDING`; an inactive profile receives `INACTIVE`. No identity is automatically granted a role.

## Database principles

The initial `users` table is intentionally small and indexed by email and role. Future modules should add bounded tables and reference the user identity rather than restructuring this table. Timestamps are stored as numbers and configuration should become data-driven through settings tables in a later phase.

## Future modules

Students, hostels, rooms, attendance, fees, visitors, RMS, medical, feedback, notifications, audit logs, and settings should each be isolated in their own Convex module with validators, authenticated functions, role checks, and audit events.
