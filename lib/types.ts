// ─── Domain types ──────────────────────────────────────────────────────────

export type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export const DAYS_OF_WEEK: DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export type TimeOfDay = "morning" | "afternoon" | "evening" | "any";

export type ConstraintType =
  | "fixed"       // Person MUST do task on day
  | "restriction" // Person CANNOT do task (optionally on day)
  | "preference"  // Person PREFERS task (optionally on day)
  | "frequency"   // Person does task exactly N times/week
  | "day_off";    // Person cannot do ANY task on day

// ─── Database document types ─────────────────────────────────────────────

export interface IHousehold {
  _id: string;
  name: string;
  code: string;          // 6-char join code
  createdAt: string;
  updatedAt: string;
}

export interface IPerson {
  _id: string;
  name: string;
  householdId: string;
  color: string;         // hex color for UI
  createdAt: string;
}

export interface ITask {
  _id: string;
  name: string;
  householdId: string;
  weight: number;        // effort weight (0.5, 1, 2, …)
  frequency: number;     // times per week (1–7)
  timeOfDay: TimeOfDay;
  createdAt: string;
}

export interface IConstraint {
  _id: string;
  householdId: string;
  type: ConstraintType;
  personId: string;
  taskId?: string;       // required for all types except day_off
  day?: DayOfWeek;       // optional day qualifier
  value?: number;        // used by "frequency" type
  note?: string;
  createdAt: string;
}

// ─── Schedule types ───────────────────────────────────────────────────────

export interface IAssignment {
  day: DayOfWeek;
  personId: string;
  taskId: string;
}

export interface IEffortEntry {
  personId: string;
  points: number;
}

export interface ISchedule {
  _id: string;
  householdId: string;
  weekStart: string;     // ISO date string (Monday of the week)
  assignments: IAssignment[];
  effortPoints: IEffortEntry[];
  feasible: boolean;
  warnings: string[];
  generatedAt: string;
  isManuallyEdited: boolean;
}

// ─── Scheduler I/O ───────────────────────────────────────────────────────

export interface SchedulerInput {
  people: IPerson[];
  tasks: ITask[];
  constraints: IConstraint[];
}

export interface SchedulerOutput {
  assignments: IAssignment[];
  effortPoints: IEffortEntry[];
  feasible: boolean;
  warnings: string[];
}

// ─── API response helpers ─────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  warnings?: string[];
}
