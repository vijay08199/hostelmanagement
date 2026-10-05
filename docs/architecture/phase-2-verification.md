# Phase 2 verification status

The repository contains the critical Convex integrity checks for active users, active students, available beds, duplicate active allocations, transfer history, warden assignment, and audit events. Frontend role gating now resolves the application role from the authenticated Convex user and redirects mismatches to `/unauthorized`.

Full end-to-end verification requires installing dependencies, generating Convex bindings, configuring Clerk, and running a Convex deployment. Those steps are environment-dependent and must not be represented as passed until executed.
