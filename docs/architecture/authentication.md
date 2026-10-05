# Authentication

The selected provider is Clerk because it provides managed login, logout, persistent sessions, Next.js middleware, and a Convex JWT integration without storing passwords in the application database. The application keeps provider identity separate from the application profile through `users.identitySubject`. Convex functions resolve identity using `ctx.auth.getUserIdentity()` and then load the active application user. Set `CLERK_ISSUER_URL` in the Convex deployment and the Clerk/Convex frontend variables in `frontend/.env.local`.

The first administrator must be provisioned out-of-band by an operator using a protected deployment/admin seed procedure. No public role-elevation mutation exists. New identities do not receive ADMIN automatically; they must be linked to an existing application profile and assigned by an operator.
