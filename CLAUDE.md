# CLAUDE.md

## Project Overview

ChoreScheduler is a full-stack Next.js 14 application for constraint-aware chore scheduling in shared households. Roommates join a household via a 6-character code, define tasks with effort weights and frequencies, set availability constraints, and generate a fair weekly schedule via a greedy algorithm. Manual overrides, effort-point visualisation, and CSV/ICS exports are included.

## Tech Stack

- **Framework:** Next.js 14 (App Router, React 18)
- **Language:** TypeScript 5 (strict mode)
- **Styling:** Tailwind CSS 3 with a custom green (`primary-*`) palette
- **Database:** MongoDB via Mongoose 8
- **Notifications:** React Hot Toast
- **Icons:** Lucide React
- **Exports:** `ics` (calendar), `date-fns` (date helpers), `uuid`

## Commands

```bash
npm run dev        # development server → http://localhost:3000
npm run build      # production build
npm start          # production server
npm run lint       # ESLint (next lint)
npm run seed       # seed sample household into MongoDB
```

## Environment Setup

```bash
cp .env.local.example .env.local
# then set MONGODB_URI in .env.local
```

Required variable:

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string (local or Atlas) |

Optional:

| Variable | Description |
|---|---|
| `NEXTAUTH_URL` | Public base URL (defaults to `http://localhost:3000`) |

## Project Structure

```
app/
  api/                    # Next.js Route Handlers (REST API)
    constraints/          # CRUD + delete by ID
    export/csv|ics/       # Schedule export endpoints
    households/           # CRUD, join by code
    people/               # CRUD
    schedule/generate/    # POST to run scheduler algorithm
    schedule/[id]/        # GET/PUT (manual override)
    tasks/                # CRUD
  dashboard/page.tsx      # Main tabbed UI (client component)
  layout.tsx              # Root layout + Toaster
  page.tsx                # Landing page (create/join household)
  globals.css             # Tailwind directives + custom keyframes

components/
  ConstraintsManager.tsx  # Add/remove all constraint types
  EffortPoints.tsx        # Per-person fairness metrics (mean, σ)
  ExportPanel.tsx         # CSV + ICS download UI
  PeopleManager.tsx       # Roommate CRUD with colour picker
  ScheduleView.tsx        # Day×Task grid, click-to-reassign
  TaskManager.tsx         # Task CRUD (weight, frequency, time-of-day)

lib/
  db.ts                   # Mongoose connection singleton (cached in global)
  hooks.ts                # useAsync + apiFetch client helpers
  types.ts                # Shared TypeScript interfaces
  models/                 # Mongoose schemas: Household, Person, Task, Constraint, Schedule
  scheduler/index.ts      # Core scheduling algorithm

scripts/
  seed.ts                 # Sample data seeder (7 people, 4 tasks, several constraints)
```

## Architecture

### Frontend
- All pages and components are **client components** (`"use client"`).
- Household ID is persisted in **localStorage**; no auth layer.
- Data fetching uses the `apiFetch` helper from `lib/hooks.ts`, which wraps `fetch` and throws on non-OK responses.
- The `useAsync` hook manages loading/error state around any async operation.

### Backend (API Routes)
- Each resource lives under `app/api/<resource>/route.ts` (collection) and `app/api/<resource>/[id]/route.ts` (item).
- All handlers connect to MongoDB through the singleton in `lib/db.ts`.
- No authentication — household join codes are the only access control.

### Database Models

| Model | Key Fields |
|---|---|
| `Household` | `name`, `code` (6-char unique) |
| `Person` | `name`, `householdId`, `color` (hex) |
| `Task` | `name`, `householdId`, `weight`, `frequency` (1–7/week), `timeOfDay` |
| `Constraint` | `householdId`, `type` (fixed/restriction/preference/frequency/day_off), `personId`, `taskId?`, `day?`, `value?` |
| `Schedule` | `householdId`, `weekStart`, `assignments[]`, `effortPoints[]`, `feasible`, `warnings[]` |

### Scheduling Algorithm (`lib/scheduler/index.ts`)

1. Parse all constraints into fast lookup maps.
2. Apply **fixed** assignments first.
3. Spread each task's frequency across the week (even distribution).
4. Sort remaining task-day slots by eligibility count (most-constrained first).
5. Greedy assignment: score = `−currentEffortPoints + preferenceBoost`.
6. Hard constraints: restrictions, day-offs, per-person frequency caps.
7. Soft cap: max 3 tasks per person per day.
8. Return `feasible` flag and `warnings[]` for any infeasible slots.

## API Reference

| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/households` | List / create household |
| POST | `/api/households/join` | Join by 6-char code |
| GET/PUT/DELETE | `/api/households/[id]` | Single household |
| GET/POST | `/api/people?householdId=` | List / create person |
| PUT/DELETE | `/api/people/[id]` | Update / delete person |
| GET/POST | `/api/tasks?householdId=` | List / create task |
| PUT/DELETE | `/api/tasks/[id]` | Update / delete task |
| GET/POST | `/api/constraints?householdId=` | List / create constraint |
| DELETE | `/api/constraints/[id]` | Delete constraint |
| POST | `/api/schedule/generate` | Run scheduler (body: `{householdId, weekStart?}`) |
| GET/PUT | `/api/schedule/[id]` | Get schedule / manual override |
| GET | `/api/export/csv?scheduleId=&householdId=` | Download CSV |
| GET | `/api/export/ics?scheduleId=&personId=` | Download ICS calendar |

## Testing

No automated test suite is configured. Use `npm run lint` for static checks and `npm run seed` to populate a representative dataset for manual testing.

## Key Conventions

- TypeScript strict mode is on — avoid `any` and non-null assertions without justification.
- Tailwind utility classes only; do not add custom CSS unless extending `globals.css` with keyframes.
- Use the `apiFetch` helper for all client-side API calls — it handles `Content-Type`, JSON parsing, and error throwing uniformly.
- MongoDB connection uses a global singleton (`lib/db.ts`) — never open a new connection directly in a route handler.
- The seed script uses a separate `tsconfig.seed.json` (CommonJS output) because Next.js uses ESM.
