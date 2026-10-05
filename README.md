# College + Hostel Management System

A production-oriented college and hostel management platform built with a Next.js frontend and Convex backend. The app supports role-based workflows for administrators, wardens, and students across hostel operations such as attendance, room allocations, electricity billing, fees, leaves, maintenance, mess, notices, requests, transfers, visitors, and audit logs.

## Tech Stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- Clerk authentication
- Convex database and backend functions
- React Hook Form, Zod, Lucide React, and shared UI utilities

## Repository Structure

```text
frontend/            Next.js application, routes, components, and client config
backend/             Convex schema, auth config, and server functions
docs/                Architecture notes and setup documentation
```

## Prerequisites

- Node.js 20 or newer
- npm
- Convex account and project
- Clerk account and application

## Environment Setup

Copy the example files before running the app:

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env.local
```

Frontend variables:

```text
NEXT_PUBLIC_CONVEX_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
```

Backend/Convex variables:

```text
CLERK_ISSUER_URL=
```

Keep real secrets only in local environment files or your deployment provider. Do not commit `.env`, `.env.local`, old env backups, private keys, tokens, dumps, or credential files. Only `.env.example` files should be committed.

## Install Dependencies

```bash
cd frontend
npm install

cd ../backend
npm install
```

## Run Locally

Start the Convex backend:

```bash
cd backend
npm run dev
```

Start the Next.js frontend in another terminal:

```bash
cd frontend
npm run dev
```

The frontend usually runs at `http://localhost:3000`.

## Useful Scripts

Frontend:

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
```

Backend:

```bash
npm run dev
npm run deploy
npm run typecheck
```

## Authentication and Authorization

Authentication uses Clerk with Convex JWT integration. After Clerk login, `/post-login` resolves the application user from Convex and routes users by the server-resolved role. Middleware protects unauthenticated navigation, while Convex authorization remains authoritative for protected operations.

The first administrator should be provisioned through an operator-controlled seed process. There should not be a public "make me admin" endpoint or any client-selected role during login.

## Git Hygiene

The root `.gitignore` excludes dependency folders, build output, caches, logs, local env files, credential files, database dumps, and OS/editor noise. If ignored files were already staged before this file was added, remove them from the index without deleting local copies:

```bash
git rm -r --cached frontend/node_modules backend/node_modules frontend/.next
git rm --cached frontend/.env.local backend/.env.local backend/.env.local.old frontend/tsconfig.tsbuildinfo
```

Then verify:

```bash
git status --short
```
