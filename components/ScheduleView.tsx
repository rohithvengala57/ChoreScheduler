"use client";

import { useState, useRef } from "react";
import { RefreshCw, AlertTriangle, CheckCircle2, Edit2, GripVertical } from "lucide-react";
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

interface DragInfo {
  day: string;
  taskId: string;
  personId: string | null;
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

  // ── Drag-and-drop state ──────────────────────────────────────────────
  const dragSource = useRef<DragInfo | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null); // `${day}_${taskId}`

  const personMap = new Map(people.map((p) => [p._id.toString(), p]));

  // ── API helpers ──────────────────────────────────────────────────────
  async function generate() {
    setGenerating(true);
    setError("");
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

  function buildTaskWeights() {
    const tw: Record<string, number> = {};
    for (const t of tasks) tw[t._id.toString()] = t.weight;
    return tw;
  }

  async function updateAssignment(day: string, taskId: string, personId: string | null) {
    if (!schedule) return;
    try {
      const res = await apiFetch<ISchedule>(`/api/schedule/${schedule._id}`, {
        method: "PUT",
        body: JSON.stringify({
          action: "update_assignment",
          day,
          taskId,
          personId,
          taskWeights: buildTaskWeights(),
        }),
      });
      if (res.data) onScheduleChange(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error updating assignment");
    } finally {
      setEditCell(null);
    }
  }

  async function swapAssignments(src: DragInfo, tgt: DragInfo) {
    if (!schedule) return;
    // No-op: same cell
    if (src.day === tgt.day && src.taskId === tgt.taskId) return;

    try {
      const res = await apiFetch<ISchedule>(`/api/schedule/${schedule._id}`, {
        method: "PUT",
        body: JSON.stringify({
          action: "swap_assignments",
          slot1: { day: src.day, taskId: src.taskId, personId: src.personId },
          slot2: { day: tgt.day, taskId: tgt.taskId, personId: tgt.personId },
          taskWeights: buildTaskWeights(),
        }),
      });
      if (res.data) onScheduleChange(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error swapping assignments");
    }
  }

  // ── Drag handlers ────────────────────────────────────────────────────
  function onDragStart(day: string, taskId: string, personId: string | null, e: React.DragEvent) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${day}|${taskId}|${personId ?? ""}`);
    dragSource.current = { day, taskId, personId };
  }

  function onDragOver(day: string, taskId: string, e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverKey(`${day}_${taskId}`);
  }

  function onDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverKey(null);
    }
  }

  async function onDrop(targetDay: string, targetTaskId: string, e: React.DragEvent) {
    e.preventDefault();
    setDragOverKey(null);

    const src = dragSource.current;
    if (!src || !schedule) {
      dragSource.current = null;
      return;
    }

    // Resolve target person from current schedule
    const tgtAssignment = schedule.assignments.find(
      (a) => a.day === targetDay && a.taskId.toString() === targetTaskId
    );
    const tgt: DragInfo = {
      day: targetDay,
      taskId: targetTaskId,
      personId: tgtAssignment?.personId?.toString() ?? null,
    };

    dragSource.current = null;
    await swapAssignments(src, tgt);
  }

  function onDragEnd() {
    dragSource.current = null;
    setDragOverKey(null);
  }

  // ── Rendering helpers ─────────────────────────────────────────────────
  function getAssignment(day: string, taskId: string): IPerson | null {
    if (!schedule) return null;
    const a = schedule.assignments.find(
      (a) => a.day === day && a.taskId.toString() === taskId
    );
    return a ? (personMap.get(a.personId.toString()) ?? null) : null;
  }

  function getPersonId(day: string, taskId: string): string | null {
    if (!schedule) return null;
    const a = schedule.assignments.find(
      (a) => a.day === day && a.taskId.toString() === taskId
    );
    return a?.personId?.toString() ?? null;
  }

  const warnings = schedule?.warnings?.filter((w) => !w.includes("σ=")) ?? [];
  const fairnessWarnings = schedule?.warnings?.filter((w) => w.includes("σ=")) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Weekly Schedule</h2>
          {schedule && (
            <p className="text-xs text-gray-400 mt-0.5">
              Drag cells to swap members · Click to reassign
            </p>
          )}
        </div>
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
        <>
          {/* Drag hint banner */}
          <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
            <GripVertical size={13} />
            <span>
              <strong className="text-gray-600">Drag</strong> any name chip to another cell to
              swap members.&nbsp;
              <strong className="text-gray-600">Click</strong> a cell to reassign via dropdown.
            </span>
          </div>

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
                      const taskId = task._id.toString();
                      const person = getAssignment(day, taskId);
                      const personId = getPersonId(day, taskId);
                      const isEditing =
                        editCell?.day === day && editCell?.taskId === taskId;
                      const isDragOver = dragOverKey === `${day}_${taskId}`;

                      return (
                        <td
                          key={taskId}
                          className={`px-3 py-2.5 transition-colors ${
                            isDragOver
                              ? "bg-indigo-50 outline outline-2 outline-indigo-300 outline-offset-[-2px]"
                              : ""
                          }`}
                          onDragOver={(e) => onDragOver(day, taskId, e)}
                          onDragLeave={onDragLeave}
                          onDrop={(e) => onDrop(day, taskId, e)}
                        >
                          {isEditing ? (
                            /* ── Dropdown reassign ── */
                            <select
                              autoFocus
                              defaultValue={personId ?? ""}
                              onChange={(e) =>
                                updateAssignment(day, taskId, e.target.value || null)
                              }
                              onBlur={() => setEditCell(null)}
                              className="border border-indigo-400 rounded-lg px-2 py-1 text-xs focus:outline-none w-full"
                            >
                              <option value="">— Unassign —</option>
                              {people.map((p) => (
                                <option key={p._id} value={p._id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            /* ── Draggable chip + click-to-edit ── */
                            <div className="flex items-center gap-1 group">
                              <div
                                draggable
                                onDragStart={(e) => onDragStart(day, taskId, personId, e)}
                                onDragEnd={onDragEnd}
                                className="cursor-grab active:cursor-grabbing"
                              >
                                {person ? (
                                  <span
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-xs font-medium select-none"
                                    style={{ background: person.color }}
                                    title="Drag to swap · Click pencil to reassign"
                                  >
                                    <GripVertical
                                      size={10}
                                      className="opacity-60 flex-shrink-0"
                                    />
                                    {person.name}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 text-xs italic select-none">
                                    —
                                  </span>
                                )}
                              </div>
                              {/* Pencil opens dropdown */}
                              <button
                                onClick={() => setEditCell({ day, taskId })}
                                title="Reassign via dropdown"
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-gray-300 hover:text-indigo-500"
                              >
                                <Edit2 size={11} />
                              </button>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Legend */}
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
