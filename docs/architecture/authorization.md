# Authorization

All protected Convex functions should begin with `requireAuthenticatedUser`, `requireAdmin`, `requireWarden`, or `requireStudent` from `backend/convex/authorization.ts`. These helpers resolve the authenticated subject server-side, load the application user, require `ACTIVE`, and enforce role. Warden-specific resources additionally require an assigned-hostel relationship. Frontend route guards improve UX but are never the security boundary. `studentProfile.mine` resolves the student only through the authenticated user reference.
