# Roommate Chore Scheduler

A full-stack, constraint-aware weekly chore scheduler for roommates.  
Built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, and **MongoDB**.

---

## Features

| Feature | Details |
|---|---|
| **Households** | Create or join a household via a 6-character code |
| **People** | Add roommates with custom colors |
| **Tasks** | Configure tasks with weights, frequencies, and time-of-day |
| **Constraints Engine** | Fixed, restriction, preference, frequency, day-off |
| **Smart Scheduling** | Greedy + most-constrained-first algorithm |
| **Effort Points** | Per-person totals, fairness score, std-deviation |
| **Manual Overrides** | Click any cell in the schedule table to reassign |
| **CSV Export** | Full schedule + effort summary as CSV |
| **ICS Export** | Calendar files per person (Google Cal, Apple Cal, Outlook) |

---

## Tech Stack

- **Frontend**: React 18 + Next.js 14 App Router
- **Styling**: Tailwind CSS
- **Backend**: Next.js API routes (Node.js)
- **Database**: MongoDB + Mongoose
- **Language**: TypeScript

---

## Prerequisites

- Node.js 18+
- MongoDB (local or [Atlas](https://www.mongodb.com/atlas))

---

## Setup

### 1. Clone & install

```bash
git clone <repo-url>
cd ChoreScheduler
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/chore-scheduler

# Or MongoDB Atlas
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/chore-scheduler
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. (Optional) Seed sample data

```bash
npm run seed
```

This creates a **"Sample Household"** pre-loaded with:

**People:** Shravani, Rohith, Pawan, Sreeya, Raviteja, Honey, Tony

**Tasks:**
| Task | Weight | Frequency | Time |
|---|---|---|---|
| Cooking | 2.0 | 7×/week | Morning |
| Dishes | 1.0 | 7×/week | Evening |
| Sweep/Mop | 1.0 | 3×/week | Any |
| Trash | 0.5 | 3×/week | Evening |

**Constraints:**
- Rohith **must** cook on Wednesday (fixed)
- Sreeya has **Friday off** (day-off)
- Honey **cannot cook** (restriction)
- Sreeya does trash at most **2×/week** (frequency)
- Raviteja cooks at most **2×/week** (frequency)
- Pawan **prefers dishes** on Wednesday (preference)

The seed script prints the join code — use it on the landing page.

---

## Usage

### 1. Create or join a household
Visit the landing page, create a new household, or join one with a 6-character code.

### 2. Add roommates
Go to the **Roommates** tab → add names and pick colors.

### 3. Configure tasks
Go to the **Tasks** tab → add tasks with:
- **Weight** — effort units (e.g., Cooking=2, Dishes=1, Trash=0.5)
- **Frequency** — how many times per week (1–7)
- **Time of day** — affects `.ics` event times

### 4. Add constraints
Go to the **Constraints** tab → use the form or JSON editor:

| Type | Effect |
|---|---|
| `fixed` | Person **must** do task on specific day |
| `restriction` | Person **cannot** do task (optionally on a specific day) |
| `preference` | Person **prefers** task (optionally on a day) — boosts priority |
| `frequency` | Person does task exactly N times/week |
| `day_off` | Person cannot do **any** task on a day |

**JSON editor example:**
```json
[
  { "type": "restriction", "personId": "<id>", "taskId": "<id>" },
  { "type": "fixed", "personId": "<id>", "taskId": "<id>", "day": "Wednesday" },
  { "type": "day_off", "personId": "<id>", "day": "Friday" },
  { "type": "frequency", "personId": "<id>", "taskId": "<id>", "value": 2 }
]
```

### 5. Generate schedule
Go to the **Schedule** tab → click **Generate Schedule**.  
Click any cell to manually reassign — effort points update instantly.

### 6. View effort points
Go to the **Effort Points** tab for:
- Per-person breakdown bars
- Fairness score (0–100)
- Standard deviation and mean

### 7. Export
Go to the **Export** tab:
- **CSV** — full schedule table + effort summary
- **ICS (all)** — one calendar file for all roommates
- **ICS (per person)** — individual calendar files

---

## Scheduling Algorithm

```
Input:  people, tasks (weight + frequency), constraints
Output: weekly assignments, effort points, warnings

1. Parse constraints into lookup tables (O(c))
2. Apply all "fixed" assignments first
3. Determine which days each task runs:
   - Remaining = frequency - already-fixed days
   - Evenly space remaining days across the week
4. Sort unassigned task-day slots by ascending eligibility
   (most-constrained-first heuristic)
5. Greedy assignment loop:
   - Find eligible people (pass restriction/day-off/frequency checks)
   - Score: −effortPoints + preferenceBoost
   - Assign highest-scoring person
6. Record warnings for infeasible slots
7. Compute fairness metrics (mean, σ, score)
```

**Guarantees:**
- All fixed constraints are always honoured
- Restrictions, day-offs, and frequency caps are always respected
- Preferences influence but don't override hard constraints
- Soft cap: no more than 3 tasks per person per day

---

## Project Structure

```
ChoreScheduler/
├── app/
│   ├── api/
│   │   ├── households/         # CRUD + join by code
│   │   ├── people/             # CRUD
│   │   ├── tasks/              # CRUD
│   │   ├── constraints/        # CRUD
│   │   ├── schedule/
│   │   │   ├── generate/       # POST — run algorithm
│   │   │   └── [id]/           # GET + PUT (manual override)
│   │   └── export/
│   │       ├── csv/            # GET — download CSV
│   │       └── ics/            # GET — download .ics
│   ├── dashboard/page.tsx      # Main app
│   └── page.tsx                # Landing page
├── components/
│   ├── PeopleManager.tsx
│   ├── TaskManager.tsx
│   ├── ConstraintsManager.tsx
│   ├── ScheduleView.tsx
│   ├── EffortPoints.tsx
│   └── ExportPanel.tsx
├── lib/
│   ├── types.ts                # Shared TypeScript interfaces
│   ├── db.ts                   # MongoDB connection singleton
│   ├── hooks.ts                # Shared fetch helper
│   ├── models/                 # Mongoose models
│   └── scheduler/
│       └── index.ts            # Core scheduling algorithm
└── scripts/
    └── seed.ts                 # Sample data seeder
```

---

## API Reference

| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/households` | List / create |
| POST | `/api/households/join` | Join by code |
| GET/PUT/DELETE | `/api/households/:id` | Single household |
| GET/POST | `/api/people?householdId=` | List / create |
| PUT/DELETE | `/api/people/:id` | Update / delete |
| GET/POST | `/api/tasks?householdId=` | List / create |
| PUT/DELETE | `/api/tasks/:id` | Update / delete |
| GET/POST | `/api/constraints?householdId=` | List / create |
| DELETE | `/api/constraints/:id` | Delete |
| POST | `/api/schedule/generate` | Generate schedule |
| GET/PUT | `/api/schedule/:id` | Get / manual override |
| GET | `/api/export/csv?scheduleId=` | CSV download |
| GET | `/api/export/ics?scheduleId=&personId=` | ICS download |

---

## License

MIT
