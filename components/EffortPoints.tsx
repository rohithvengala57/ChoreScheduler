"use client";

import type { ISchedule, IPerson, ITask } from "@/lib/types";
import { computeFairness } from "@/lib/scheduler";

interface Props {
  schedule: ISchedule | null;
  people: IPerson[];
  tasks: ITask[];
}

export default function EffortPoints({ schedule, people, tasks }: Props) {
  if (!schedule || schedule.effortPoints.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
        Generate a schedule to see effort points.
      </div>
    );
  }

  const personMap = new Map(people.map((p) => [p._id.toString(), p]));
  const taskMap = new Map(tasks.map((t) => [t._id.toString(), t]));

  const fairness = computeFairness(schedule.effortPoints);

  const sorted = [...schedule.effortPoints].sort((a, b) => b.points - a.points);
  const maxPoints = sorted[0]?.points || 1;

  // Build per-person task breakdown
  const breakdown: Record<string, Record<string, number>> = {};
  for (const a of schedule.assignments) {
    const pid = a.personId.toString();
    const tid = a.taskId.toString();
    const task = taskMap.get(tid);
    if (!breakdown[pid]) breakdown[pid] = {};
    breakdown[pid][tid] = (breakdown[pid][tid] || 0) + (task?.weight || 1);
  }

  const fairnessColor =
    fairness.fairnessScore >= 80
      ? "text-green-600"
      : fairness.fairnessScore >= 60
      ? "text-amber-600"
      : "text-red-600";

  const fairnessBg =
    fairness.fairnessScore >= 80
      ? "bg-green-50 border-green-200"
      : fairness.fairnessScore >= 60
      ? "bg-amber-50 border-amber-200"
      : "bg-red-50 border-red-200";

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Effort Points</h2>

      {/* Fairness summary */}
      <div className={`rounded-xl border p-5 ${fairnessBg}`}>
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Fairness Score</p>
            <p className={`text-3xl font-bold ${fairnessColor}`}>{fairness.fairnessScore}/100</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Average Points</p>
            <p className="text-3xl font-bold text-gray-700">{fairness.mean}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Std. Deviation</p>
            <p className="text-3xl font-bold text-gray-700">{fairness.stdDev}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Max Gap (pts)</p>
            <p className="text-3xl font-bold text-gray-700">{fairness.maxDeviation}</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          {fairness.fairnessScore >= 80
            ? "Great distribution! Effort is well-balanced."
            : fairness.fairnessScore >= 60
            ? "Moderate balance. Consider adjusting task weights or constraints."
            : "Uneven distribution detected. Review constraints and task frequencies."}
        </p>
      </div>

      {/* Per-person bars */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
        <h3 className="font-semibold text-gray-700">Points per Person</h3>
        {sorted.map((entry) => {
          const person = personMap.get(entry.personId.toString());
          if (!person) return null;
          const pct = (entry.points / maxPoints) * 100;
          const taskBreakdown = breakdown[entry.personId.toString()] || {};

          return (
            <div key={entry.personId}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: person.color }}
                  >
                    {person.name.charAt(0)}
                  </div>
                  <span className="font-medium text-gray-700 text-sm">{person.name}</span>
                </div>
                <span className="font-bold text-gray-800 text-sm">{entry.points} pts</span>
              </div>

              {/* Progress bar */}
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: person.color }}
                />
              </div>

              {/* Task breakdown chips */}
              {Object.keys(taskBreakdown).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {Object.entries(taskBreakdown).map(([tid, pts]) => {
                    const task = taskMap.get(tid);
                    if (!task) return null;
                    return (
                      <span key={tid} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {task.name}: {pts}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Table view */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Person</th>
              {tasks.map((t) => (
                <th key={t._id} className="text-left px-4 py-3 font-semibold text-gray-600">
                  {t.name}
                </th>
              ))}
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Total</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry, idx) => {
              const person = personMap.get(entry.personId.toString());
              if (!person) return null;
              const taskBreakdown = breakdown[entry.personId.toString()] || {};

              return (
                <tr key={entry.personId} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex-shrink-0"
                        style={{ background: person.color }}
                      />
                      <span className="font-medium text-gray-700">{person.name}</span>
                    </div>
                  </td>
                  {tasks.map((t) => (
                    <td key={t._id} className="px-4 py-3 text-gray-600">
                      {taskBreakdown[t._id.toString()]?.toFixed(1) ?? "—"}
                    </td>
                  ))}
                  <td className="px-4 py-3 font-bold text-gray-800">{entry.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
