# CLAUDE.md

## Project Overview

ChoreScheduler is a full-stack Next.js 14 application for constraint-aware chore scheduling in shared households. Users sign up, create or join a household, define tasks with effort weights and frequencies, set availability constraints (subject to admin approval), and generate a fair weekly schedule via a greedy algorithm. The app includes JWT authentication, role-based access (admin / member), an invitation system, task completion logging, and a performance/rating dashboard.

## Tech Stack

- **Framework:** Next.js 14 (App Router, React 18)
- **Language:** TypeScript 5 (strict mode)
- **Styling:** Tailwind CSS 3
- **Database:** MongoDB via Mongoose 8
- **Auth:** JWT (jsonwebtoken) + bcryptjs, stored in an httpOnly cookie
- **Email:** Nodemailer (console fallback in dev; SMTP in prod)
- **Notifications:** React Hot Toast
- **Icons:** Lucide React
- **Exports:** `ics` (calendar), `date-fns` (date helpers), `uuid`

## Commands

```bash
npm run dev        # development server → http://localhost:3000
npm run build      # production build
npm start          # production server
npm run lint       # ESLint (next lint)
npm run seed       # seed sample household + admin user into MongoDB
```

## Environment Setup

```bash
cp .env.local.example .env.local
# edit .env.local — set at minimum MONGODB_URI and JWT_SECRET
```

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB connection string (local or Atlas) |
| `JWT_SECRET` | ✅ | Secret for signing JWT tokens (use a long random string in prod) |
| `NEXTAUTH_URL` | — | Public base URL (defaults to `http://localhost:3000`) |
| `SMTP_HOST` | — | SMTP server host for invite emails |
| `SMTP_PORT` | — | SMTP port (default `587`) |
| `SMTP_SECURE` | — | `"true"` for TLS (port 465) |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASS` | — | SMTP password |
| `SMTP_FROM` | — | From address for invite emails |

> **Dev email:** When `SMTP_HOST` is not set, invite links are printed to the server console instead of emailed.

## Project Structure

```
app/
  api/
    auth/signup|login|me|logout/  # JWT auth endpoints
    constraints/                  # CRUD, pending list, approve/reject
    export/csv|ics/               # Schedule export endpoints
    households/                   # CRUD, join by code
    invite/                       # Send, list, accept, approve invites
    people/                       # CRUD
    performance/                  # Per-person stats aggregation
    schedule/generate/            # POST — run scheduler (admin only)
    schedule/[id]/                # GET/PUT — view / manual override
    tasks/                        # CRUD
    tasks/log|history/            # Task completion logging
  dashboard/page.tsx              # Role-aware tabbed dashboard
  join/page.tsx                   # Accept invite + create account
  login/page.tsx                  # Sign-in form
  pending/page.tsx                # Awaiting admin approval
  signup/page.tsx                 # Create account + household
  layout.tsx                      # Root layout + Toaster
  globals.css                     # Tailwind directives + custom keyframes

components/
  ConstraintApprovalPanel.tsx     # Admin: approve/reject pending constraints
  ConstraintsManager.tsx          # Add/view all constraint types
  EffortPoints.tsx                # Per-person fairness metrics (mean, σ)
  ExportPanel.tsx                 # CSV + ICS download UI
  InvitePanel.tsx                 # Admin: send invites, manage invite list
  PerformanceDashboard.tsx        # Star ratings + completion stats table
  PeopleManager.tsx               # Roommate CRUD with colour picker
  ScheduleView.tsx                # Day×Task grid, drag-to-swap (admin only)
  TaskLogPanel.tsx                # Check-off task completions by day
  TaskManager.tsx                 # Task CRUD (weight, frequency, time-of-day)

lib/
  auth.ts                         # signToken, verifyToken, requireAuth, requireAdmin
  db.ts                           # Mongoose connection singleton (cached in global)
  email.ts                        # Nodemailer invite emails (console fallback in dev)
  hooks.ts                        # useAsync + apiFetch client helpers
  types.ts                        # Shared TypeScript interfaces
  models/
    Constraint.ts                 # + submittedBy, status (approved|pending|rejected)
    Household.ts
    Invite.ts                     # email, householdId, token, status workflow
    Person.ts
    Schedule.ts
    Task.ts
    TaskLog.ts                    # Per-assignment completion records
    User.ts                       # name, email, passwordHash, role, status
  scheduler/index.ts              # Core scheduling algorithm

scripts/
  seed.ts                         # Seeds household + admin user + 7 people + 4 tasks
```

## Architecture

### Authentication
- JWT is signed with `JWT_SECRET` and stored as an **httpOnly cookie** (`auth_token`, 7-day expiry).
- `lib/auth.ts` exposes `requireAuth()` and `requireAdmin()` — both throw a `Response` on failure so route handlers can simply `await` them.
- `getSessionUser()` reads the cookie and returns the full user document (or `null`).

### Role-Based Access

| Action | Admin | Member |
|---|---|---|
| Create/edit people & tasks | ✅ | ❌ |
| Generate / regenerate schedule | ✅ | ❌ |
| Drag-to-swap schedule cells | ✅ | ❌ |
| Submit constraints | ✅ | ✅ (pending approval) |
| Approve/reject constraints | ✅ | ❌ |
| Send & approve invites | ✅ | ❌ |
| Mark tasks complete | ✅ | ❌ |
| View schedule & effort points | ✅ | ✅ (read-only) |
| View performance & ratings | ✅ (all) | ✅ (own) |

### Invitation Flow
1. Admin enters email → `POST /api/invite` → invite record created, email sent (or link logged in dev).
2. Member opens `/join?token=XYZ` → creates account with `status: pending`.
3. Admin sees **Accepted** badge in Invites tab → clicks **Approve** → `User.status` → `"active"`.

### Constraint Approval
- Constraints submitted by members start with `status: "pending"`.
- `POST /api/schedule/generate` filters to `status: "approved"` only.
- Admin reviews pending constraints in the **Approvals** tab.

### Backend (API Routes)
- Each resource lives under `app/api/<resource>/route.ts` (collection) and `app/api/<resource>/[id]/route.ts` (item).
- All handlers call `connectDB()` from `lib/db.ts` (global singleton — never open a new connection directly).
- Protected routes call `requireAuth()` or `requireAdmin()` at the top; thrown `Response`s bubble up naturally in Next.js route handlers.

### Database Models

| Model | Key Fields |
|---|---|
| `User` | `name`, `email`, `passwordHash`, `role` (admin\|member), `householdId`, `status` (active\|pending) |
| `Household` | `name`, `code` (6-char unique) |
| `Person` | `name`, `householdId`, `color` (hex) |
| `Task` | `name`, `householdId`, `weight`, `frequency` (1–7/week), `timeOfDay` |
| `Constraint` | `householdId`, `type`, `personId`, `taskId?`, `day?`, `value?`, `status` (approved\|pending\|rejected) |
| `Schedule` | `householdId`, `weekStart`, `assignments[]`, `effortPoints[]`, `feasible`, `warnings[]` |
| `Invite` | `email`, `householdId`, `token`, `status` (pending→accepted→approved\|rejected) |
| `TaskLog` | `householdId`, `date`, `taskId`, `taskName`, `assignedTo`, `completed`, `completedBy`, `weight` |

### Scheduling Algorithm (`lib/scheduler/index.ts`)

1. Parse all **approved** constraints into fast lookup maps.
2. Apply **fixed** assignments first.
3. Spread each task's frequency across the week (even distribution).
4. Sort remaining task-day slots by eligibility count (most-constrained first).
5. Greedy assignment: score = `−currentEffortPoints + preferenceBoost`.
6. Hard constraints: restrictions, day-offs, per-person frequency caps.
7. Soft cap: max 3 tasks per person per day.
8. Return `feasible` flag and `warnings[]` for any infeasible slots.

### Performance & Ratings (`/api/performance`)
Aggregates `TaskLog` records per person:
- **Completion rate** = `totalCompleted / totalAssigned × 100`
- **Star rating**: 90%+ = ⭐⭐⭐⭐⭐ · 75%+ = ⭐⭐⭐⭐ · 60%+ = ⭐⭐⭐ · 40%+ = ⭐⭐ · <40% = ⭐

## API Reference

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create account (+ household for admin, or via invite token) |
| POST | `/api/auth/login` | Validate credentials, set auth cookie |
| GET | `/api/auth/me` | Return current session user |
| POST | `/api/auth/logout` | Clear auth cookie |

### Invites
| Method | Path | Description |
|---|---|---|
| POST | `/api/invite` | Send invite email (admin) |
| GET | `/api/invite` | List all invites for household (admin) |
| GET | `/api/invite/accept?token=` | Validate invite token (public) |
| POST | `/api/invite/[id]` | Approve or reject invite (admin) |

### Households / People / Tasks
| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/households` | List / create |
| POST | `/api/households/join` | Join by 6-char code |
| GET/PUT/DELETE | `/api/households/[id]` | Single household |
| GET/POST | `/api/people?householdId=` | List / create person |
| PUT/DELETE | `/api/people/[id]` | Update / delete person |
| GET/POST | `/api/tasks?householdId=` | List / create task |
| PUT/DELETE | `/api/tasks/[id]` | Update / delete task |

### Constraints
| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/constraints?householdId=` | List / create constraint |
| DELETE | `/api/constraints/[id]` | Delete constraint |
| GET | `/api/constraints/pending` | List pending constraints (admin) |
| POST | `/api/constraints/[id]/approve` | Approve or reject constraint (admin) |

### Schedule / Exports / Performance
| Method | Path | Description |
|---|---|---|
| POST | `/api/schedule/generate` | Run scheduler — body: `{householdId, weekStart?}` |
| GET/PUT | `/api/schedule/[id]` | Get schedule / manual override |
| GET | `/api/export/csv?scheduleId=&householdId=` | Download CSV |
| GET | `/api/export/ics?scheduleId=&personId=` | Download ICS calendar |
| POST | `/api/tasks/log` | Log task completion |
| GET | `/api/tasks/history?householdId=&personId=` | Task log history |
| GET | `/api/performance?householdId=&personId=` | Per-person stats |

## Testing

No automated test suite is configured. Use `npm run lint` for static checks and `npm run seed` to populate a representative dataset for manual testing.

After seeding, sign in at `/login` with:
- **Email:** `admin@chorescheduler.local`
- **Password:** `password123`

## Key Conventions

- TypeScript strict mode — avoid `any` and non-null assertions without justification.
- Tailwind utility classes only; do not add custom CSS unless extending `globals.css` with keyframes.
- Use `apiFetch` for all client-side API calls — it handles `Content-Type`, JSON parsing, and error throwing uniformly.
- MongoDB connection uses a global singleton (`lib/db.ts`) — never open a new connection directly in a route handler.
- Protected API routes must call `requireAuth()` or `requireAdmin()` before any DB access; thrown `Response`s propagate automatically.
- The seed script uses a separate `tsconfig.seed.json` (CommonJS output) because Next.js uses ESM.
