/**
 * Roommate Chore Scheduler — Constraint-Based Scheduling Algorithm
 *
 * Strategy:
 *   1. Parse constraints into fast lookup structures.
 *   2. Apply all "fixed" assignments first.
 *   3. Determine which days each task must run (based on frequency and
 *      already-fixed days).
 *   4. Sort remaining task-day slots by ascending eligibility count
 *      (most-constrained-first heuristic).
 *   5. Greedy assignment: pick the eligible person with lowest current
 *      effort points, boosted by preferences.
 *   6. If a slot has no eligible person, record a warning.
 *   7. Return the schedule, effort totals, feasibility flag, and warnings.
 */

import type {
  IPerson,
  ITask,
  IConstraint,
  IAssignment,
  IEffortEntry,
  SchedulerInput,
  SchedulerOutput,
  DayOfWeek,
} from "../types";

import { DAYS_OF_WEEK } from "../types";

// ─── Internal state ───────────────────────────────────────────────────────

interface State {
  effortPoints: Map<string, number>;       // personId → total effort
  taskCountPerPerson: Map<string, number>; // `${personId}_${taskId}` → count
  tasksPerDayPerPerson: Map<string, number>; // `${personId}_${day}` → count
  assignments: IAssignment[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function spreadDays(available: DayOfWeek[], count: number): DayOfWeek[] {
  if (count <= 0) return [];
  if (count >= available.length) return [...available];

  const step = available.length / count;
  const selected: DayOfWeek[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < count; i++) {
    const idx = Math.min(Math.round(i * step), available.length - 1);
    const day = available[idx];
    if (!seen.has(day)) {
      seen.add(day);
      selected.push(day);
    }
  }

  // Fill up if rounding produced duplicates
  if (selected.length < count) {
    for (const d of available) {
      if (selected.length >= count) break;
      if (!seen.has(d)) {
        seen.add(d);
        selected.push(d);
      }
    }
  }

  return selected;
}

// ─── Main scheduler function ──────────────────────────────────────────────

export function generateSchedule(input: SchedulerInput): SchedulerOutput {
  const { people, tasks, constraints } = input;

  if (people.length === 0) {
    return { assignments: [], effortPoints: [], feasible: false, warnings: ["No people defined."] };
  }
  if (tasks.length === 0) {
    return { assignments: [], effortPoints: [], feasible: false, warnings: ["No tasks defined."] };
  }

  // ── Build constraint lookup tables ────────────────────────────────────
  // fixed: taskId_day → personId
  const fixedMap = new Map<string, string>();

  // restrictions: Set of "personId_taskId" or "personId_taskId_day"
  const restrictionSet = new Set<string>();

  // day-off: Set of "personId_day"
  const dayOffSet = new Set<string>();

  // frequency limits: "personId_taskId" → maxTimesPerWeek
  const freqLimitMap = new Map<string, number>();

  // preferences: "personId_taskId" or "personId_taskId_day" → weight boost
  const preferenceMap = new Map<string, number>();

  for (const c of constraints) {
    const pid = c.personId.toString();
    const tid = c.taskId ? c.taskId.toString() : "";

    switch (c.type) {
      case "fixed":
        if (tid && c.day) fixedMap.set(`${tid}_${c.day}`, pid);
        break;

      case "restriction":
        if (tid) {
          if (c.day) {
            restrictionSet.add(`${pid}_${tid}_${c.day}`);
          } else {
            restrictionSet.add(`${pid}_${tid}`);
          }
        }
        break;

      case "day_off":
        if (c.day) dayOffSet.add(`${pid}_${c.day}`);
        break;

      case "frequency":
        if (tid && c.value !== undefined) {
          freqLimitMap.set(`${pid}_${tid}`, c.value);
        }
        break;

      case "preference":
        if (tid) {
          const key = c.day ? `${pid}_${tid}_${c.day}` : `${pid}_${tid}`;
          preferenceMap.set(key, (preferenceMap.get(key) ?? 0) + 1);
        }
        break;
    }
  }

  // ── Build task lookup ─────────────────────────────────────────────────
  const taskById = new Map<string, ITask>();
  for (const t of tasks) taskById.set(t._id.toString(), t);

  // ── Initialise mutable state ──────────────────────────────────────────
  const state: State = {
    effortPoints: new Map(people.map((p) => [p._id.toString(), 0])),
    taskCountPerPerson: new Map(),
    tasksPerDayPerPerson: new Map(),
    assignments: [],
  };

  // ── Eligibility check (uses mutable state) ────────────────────────────
  function isEligible(personId: string, taskId: string, day: DayOfWeek): boolean {
    if (dayOffSet.has(`${personId}_${day}`)) return false;
    if (restrictionSet.has(`${personId}_${taskId}`)) return false;
    if (restrictionSet.has(`${personId}_${taskId}_${day}`)) return false;

    const freqKey = `${personId}_${taskId}`;
    const maxFreq = freqLimitMap.get(freqKey);
    if (maxFreq !== undefined) {
      const current = state.taskCountPerPerson.get(freqKey) ?? 0;
      if (current >= maxFreq) return false;
    }

    // Soft cap: no more than 3 tasks per person per day
    const dayLoad = state.tasksPerDayPerPerson.get(`${personId}_${day}`) ?? 0;
    if (dayLoad >= 3) return false;

    return true;
  }

  function assign(day: DayOfWeek, personId: string, taskId: string): void {
    const task = taskById.get(taskId)!;
    state.assignments.push({ day, personId, taskId });
    state.effortPoints.set(personId, (state.effortPoints.get(personId) ?? 0) + task.weight);
    const fcKey = `${personId}_${taskId}`;
    state.taskCountPerPerson.set(fcKey, (state.taskCountPerPerson.get(fcKey) ?? 0) + 1);
    const dayKey = `${personId}_${day}`;
    state.tasksPerDayPerPerson.set(dayKey, (state.tasksPerDayPerPerson.get(dayKey) ?? 0) + 1);
  }

  // ── Step 1: Apply fixed assignments ───────────────────────────────────
  const fixedSlots = new Set<string>(); // `${taskId}_${day}`

  for (const [key, personId] of Array.from(fixedMap)) {
    const [taskId, day] = key.split(/_(.+)/); // split on first underscore
    if (!taskById.has(taskId)) continue;
    const validDay = day as DayOfWeek;
    assign(validDay, personId, taskId);
    fixedSlots.add(key);
  }

  // ── Step 2: Determine which days each task must run ───────────────────
  const pendingSlots: { taskId: string; day: DayOfWeek }[] = [];

  for (const task of tasks) {
    const tid = task._id.toString();
    const alreadyAssigned = DAYS_OF_WEEK.filter((d) => fixedSlots.has(`${tid}_${d}`));
    const remaining = Math.max(0, task.frequency - alreadyAssigned.length);
    const available = DAYS_OF_WEEK.filter((d) => !alreadyAssigned.includes(d));
    const chosenDays = spreadDays(available, remaining);

    for (const d of chosenDays) {
      pendingSlots.push({ taskId: tid, day: d });
    }
  }

  // ── Step 3: Sort by ascending eligibility count (most constrained first)
  pendingSlots.sort((a, b) => {
    const eligA = people.filter((p) => isEligible(p._id.toString(), a.taskId, a.day)).length;
    const eligB = people.filter((p) => isEligible(p._id.toString(), b.taskId, b.day)).length;
    return eligA - eligB;
  });

  // ── Step 4: Greedy assignment ─────────────────────────────────────────
  const warnings: string[] = [];

  for (const slot of pendingSlots) {
    const { taskId, day } = slot;
    const task = taskById.get(taskId)!;

    const eligible = people.filter((p) => isEligible(p._id.toString(), taskId, day));

    if (eligible.length === 0) {
      warnings.push(
        `No eligible person for "${task.name}" on ${day}. ` +
          `Check restrictions and day-off constraints.`
      );
      continue;
    }

    // Score each eligible person
    // Lower effort points → higher score; preference boosts score
    const scored = eligible.map((p) => {
      const pid = p._id.toString();
      const prefBoost =
        (preferenceMap.get(`${pid}_${taskId}_${day}`) ?? 0) +
        (preferenceMap.get(`${pid}_${taskId}`) ?? 0);
      const effort = state.effortPoints.get(pid) ?? 0;
      return { pid, score: -effort + prefBoost * 0.5 };
    });

    scored.sort((a, b) => b.score - a.score);
    assign(day, scored[0].pid, taskId);
  }

  // ── Step 5: Compile effort totals ─────────────────────────────────────
  const effortPoints: IEffortEntry[] = Array.from(state.effortPoints.entries()).map(
    ([personId, points]) => ({ personId, points: Math.round(points * 100) / 100 })
  );

  // ── Step 6: Calculate fairness metrics & append to warnings ───────────
  if (effortPoints.length > 1) {
    const pts = effortPoints.map((e) => e.points);
    const mean = pts.reduce((s, v) => s + v, 0) / pts.length;
    const variance = pts.reduce((s, v) => s + (v - mean) ** 2, 0) / pts.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev > mean * 0.3) {
      warnings.push(
        `Effort distribution may be uneven (σ=${stdDev.toFixed(2)}, mean=${mean.toFixed(2)}). ` +
          `Consider adjusting task weights or constraints.`
      );
    }
  }

  return {
    assignments: state.assignments,
    effortPoints,
    feasible: warnings.filter((w) => w.startsWith("No eligible")).length === 0,
    warnings,
  };
}

// ─── Fairness statistics ──────────────────────────────────────────────────

export interface FairnessStats {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  maxDeviation: number; // max - min
  fairnessScore: number; // 0-100, higher is fairer
}

export function computeFairness(effortPoints: IEffortEntry[]): FairnessStats {
  if (effortPoints.length === 0) {
    return { mean: 0, stdDev: 0, min: 0, max: 0, maxDeviation: 0, fairnessScore: 100 };
  }

  const pts = effortPoints.map((e) => e.points);
  const mean = pts.reduce((s, v) => s + v, 0) / pts.length;
  const variance = pts.reduce((s, v) => s + (v - mean) ** 2, 0) / pts.length;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const maxDeviation = max - min;

  // Fairness score: 100 if stdDev = 0, drops as stdDev increases
  const fairnessScore = mean > 0 ? Math.max(0, 100 - (stdDev / mean) * 100) : 100;

  return {
    mean: Math.round(mean * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    maxDeviation: Math.round(maxDeviation * 100) / 100,
    fairnessScore: Math.round(fairnessScore),
  };
}
