# Role-Based Authentication & Test Account Setup Guide

CampusNest utilizes **Clerk** for authentication (identity, password handling, JWT tokens, session management) and **Convex** for role-based authorization (`ADMIN`, `WARDEN`, `STUDENT`) and database storage.

---

## 1. Unified Portal Login Flow

1. Any user clicks **Portal Login** or **Access Portal** on the landing page (`http://localhost:3000`).
2. The user arrives at [`/login`](http://localhost:3000/login) and enters their email and password.
3. The user is **never** asked to choose a role manually.
4. Upon successful authentication, Clerk redirects to [`/post-login`](http://localhost:3000/post-login).
5. The centralized post-login router queries `api.auth.currentUser` to identify the user's role from Convex:
   * **ADMIN** &rarr; Automatically redirected to [`/admin/dashboard`](http://localhost:3000/admin/dashboard)
   * **WARDEN** &rarr; Automatically redirected to [`/warden/dashboard`](http://localhost:3000/warden/dashboard)
   * **STUDENT** &rarr; Automatically redirected to [`/student/dashboard`](http://localhost:3000/student/dashboard)
   * **Unprovisioned Account** &rarr; Routed to [`/pending-access`](http://localhost:3000/pending-access) with options to sign out or switch accounts.
   * **Deactivated Account** &rarr; Routed to [`/account-inactive`](http://localhost:3000/account-inactive).

---

## 2. Setting Up Real Test Accounts

### Account 1: ADMIN
* **Existing Seeded Account:**
  * **Email:** `vijju24199@gmail.com`
  * **Clerk ID (`identitySubject`):** `user_3KAWcQfsQrWCwFgRfvlPofSXuTb`
  * **Role in Convex:** `ADMIN` (Status: `ACTIVE`)
  * **Login Flow:** Log in via `/login` with this account &rarr; Immediately routed to `/admin/dashboard`.

---

### Account 2: WARDEN
* **Step 1 — Create User in Clerk:**
  * In the [Clerk Dashboard](https://dashboard.clerk.com) (or via Sign Up at `/login`), create a test warden user (e.g. `warden@test.com`).
  * Note the generated Clerk **User ID** (e.g., `user_2...`).
* **Step 2 — Provision Warden Profile:**
  * **Option A (Via Admin UI):**
    1. Log in as Admin (`vijju24199@gmail.com`).
    2. Go to **Wardens** (`/admin/wardens`) &rarr; Click **Add Warden**.
    3. Click **+ Provision by Clerk User ID**.
    4. Enter the Clerk User ID (`user_...`), Full Name (`Prof. Rajesh Warden`), Email (`warden@test.com`), Employee ID (`EMP-W001`), and select the assigned hostel (`harshini`).
    5. Click **Register Warden**.
  * **Option B (Via Convex CLI):**
    Run from `backend/`:
    ```bash
    npx convex run users:provisionByAdmin '{"identitySubject": "<CLERK_USER_ID>", "name": "Prof. Rajesh Warden", "email": "warden@test.com", "role": "WARDEN"}' --identity '{"subject": "user_3KAWcQfsQrWCwFgRfvlPofSXuTb"}'
    ```
    And link to the hostel:
    ```bash
    npx convex run admin:createWarden '{"userId": "<USER_ID_FROM_ABOVE>", "employeeId": "EMP-W001", "assignedHostelIds": ["js76kp28h8vep43k93r3ew6sks8fjejh"]}' --identity '{"subject": "user_3KAWcQfsQrWCwFgRfvlPofSXuTb"}'
    ```
* **Step 3 — Test Login:**
  * Sign in as `warden@test.com` at `/login` &rarr; Automatically routed to `/warden/dashboard`.

---

### Account 3: STUDENT
* **Step 1 — Create User in Clerk:**
  * In Clerk Dashboard, create a test student user (e.g. `student@test.com`).
  * Note the generated Clerk **User ID** (e.g., `user_2...`).
* **Step 2 — Provision Student Profile:**
  * Run from `backend/`:
    ```bash
    npx convex run users:provisionByAdmin '{"identitySubject": "<CLERK_STUDENT_ID>", "name": "Rahul Verma", "email": "student@test.com", "role": "STUDENT"}' --identity '{"subject": "user_3KAWcQfsQrWCwFgRfvlPofSXuTb"}'
    ```
  * Create the student directory record linking to that `userId`:
    Create a file `student.json` containing:
    ```json
    [
      {
        "userId": "<USER_ID_FROM_ABOVE>",
        "firstName": "Rahul",
        "lastName": "Verma",
        "studentId": "STU2026001",
        "rollNumber": "CS-2026-001",
        "department": "Computer Science & Engineering",
        "program": "B.Tech",
        "year": 3,
        "semester": 6,
        "academicYear": "2025-2026",
        "email": "student@test.com",
        "phone": "+91 98765 43210",
        "status": "ACTIVE",
        "createdAt": 1791000000000,
        "updatedAt": 1791000000000
      }
    ]
    ```
    And import:
    ```bash
    npx convex import --table students student.json --append
    ```
* **Step 3 — Test Login:**
  * Sign in as `student@test.com` at `/login` &rarr; Automatically routed to `/student/dashboard`.

---

## 3. Security & Boundary Verification

* **Route-Level Protection:** Every dashboard route wraps its view in `<RoleGate role="...">`. Attempting to load an unauthorized URL immediately kicks the user to `/unauthorized`.
* **Server-Side Enforcement:** Every protected backend function calls `requireAdmin(ctx)`, `requireWarden(ctx)`, or `requireStudent(ctx)`. API calls cannot be forged or bypassed.
* **No Direct Role Selection:** Roles are never passed from the client during login; they are loaded directly from the indexed `users` database table.

