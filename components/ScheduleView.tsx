"use client";

import { useState } from "react";
import { RefreshCw, AlertTriangle, CheckCircle2, Edit2 } from "lucide-react";
import type { ISchedule, IPerson, ITask } from "@/lib/types";
import { DAYS_OF_WEEK } from "@/lib/types";
import { apiFetch } from "@/lib/hooks";

interface Props {
  householdId: string;
  schedule: ISchedule | null;
  people: IPerson[];
  tasks: ITask[];
  onGenerate: () => void;
  onScheduleChange: (s: ISchedule) => void;
}

export default function ScheduleView({
  householdId,
  schedule,
  people,
  tasks,
  onGenerate,
  onScheduleChange,
}: Props) {
  const [generating, setGenerating] = useState(false);
  const [editCell, setEditCell] = useState<{ day: string; taskId: string } | null>(null);
  const [error, setError] = useState("");

  const personMap = new Map(people.map((p) => [p._id.toString(), p]));
  const taskMap = new Map(tasks.map((t) => [t._id.toString(), t]));

  async function generate() {
    setGenerating(true); setError("");
    try {
      await apiFetch("/api/schedule/generate", {
        method: "POST",
        body: JSON.stringify({ householdId }),
      });
      onGenerate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate schedule.");
    } finally {
      setGenerating(false);
    }
  }

  async function updateAssignment(day: string, taskId: string, personId: string | null) {
    if (!schedule) return;

    const taskWeights: Record<string, number> = {};
    for (const t of tasks) taskWeights[t._id.toString()] = t.weight;

    try {
      const res = await apiFetch<ISchedule>(`/api/schedule/${schedule._id}`, {
        method: "PUT",
        body: JSON.stringify({
          action: "update_assignment",
          day,
          taskId,
          personId,
          taskWeights,
        }),
      });
      if (res.data) onScheduleChange(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error updating assignment");
    } finally {
      setEditCell(null);
    }
  }

  function getAssignment(day: string, taskId: string): IPerson | null {
    if (!schedule) return null;
    const a = schedule.assignments.find(
      (a) => a.day === day && a.taskId.toString() === taskId
    );
    return a ? (personMap.get(a.personId.toString()) ?? null) : null;
  }

  const warnings = schedule?.warnings?.filter((w) => !w.includes("σ=")) ?? [];
  const fairnessWarnings = schedule?.warnings?.filter((w) => w.includes("σ=")) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <h2 className="text-xl font-bold text-gray-800">Weekly Schedule</h2>
        <div className="flex gap-3 items-center">
          {schedule?.isManuallyEdited && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
              Manually edited
            </span>
          )}
          <button
            onClick={generate}
            disabled={generating}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={16} className={generating ? "animate-spin" : ""} />
            {generating ? "Generating…" : schedule ? "Regenerate" : "Generate Schedule"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm mb-1">
            <AlertTriangle size={16} />
            Scheduling Warnings
          </div>
          {warnings.map((w, i) => (
            <p key={i} className="text-sm text-amber-600">{w}</p>
          ))}
        </div>
      )}

      {schedule?.feasible === true && warnings.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-green-700 text-sm font-medium">
          <CheckCircle2 size={16} />
          All constraints satisfied — schedule is feasible!
        </div>
      )}

      {/* Fairness note */}
      {fairnessWarnings.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-700 text-sm">
          <strong>Fairness note:</strong> {fairnessWarnings[0]}
        </div>
      )}

      {!schedule ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <p className="text-gray-400 mb-4">No schedule generated yet.</p>
          <button
            onClick={generate}
            disabled={generating}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700"
          >
            {generating ? "Generating…" : "Generate Schedule"}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 w-28">Day</th>
                {tasks.map((t) => (
                  <th key={t._id} className="text-left px-4 py-3 font-semibold text-gray-600">
                    <div>{t.name}</div>
                    <div className="text-xs font-normal text-gray-400">wt: {t.weight}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS_OF_WEEK.map((day, dayIdx) => (
                <tr
                  key={day}
                  className={`border-b border-gray-100 ${dayIdx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                >
                  <td className="px-4 py-3 font-medium text-gray-700">{day}</td>
                  {tasks.map((task) => {
                    const person = getAssignment(day, task._id.toString());
                    const isEditing =
                      editCell?.day === day && editCell?.taskId === task._id.toString();

                    return (
                      <td key={task._id} className="px-4 py-3">
                        {isEditing ? (
                          <select
                            autoFocus
                            defaultValue={person?._id ?? ""}
                            onChange={(e) =>
                              updateAssignment(day, task._id.toString(), e.target.value || null)
                            }
                            onBlur={() => setEditCell(null)}
                            className="border border-indigo-400 rounded-lg px-2 py-1 text-xs focus:outline-none"
                          >
                            <option value="">— Unassign —</option>
                            {people.map((p) => (
                              <option key={p._id} value={p._id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            onClick={() =>
                              setEditCell({ day, taskId: task._id.toString() })
                            }
                            title="Click to edit"
                            className="group flex items-center gap-1.5 w-full"
                          >
                            {person ? (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-xs font-medium"
                                style={{ background: person.color }}
                              >
                                {person.name}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs italic">—</span>
                            )}
                            <Edit2
                              size={11}
                              className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Person legend */}
      {people.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {people.map((p) => (
            <span
              key={p._id}
              className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full text-white font-medium"
              style={{ background: p.color }}
            >
              {p.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
