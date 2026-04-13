"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckSquare, Square } from "lucide-react";
import { apiFetch } from "@/lib/hooks";
import toast from "react-hot-toast";
import type { ITask } from "@/lib/types";

interface Assignment {
  day: string;
  taskId: string;
  personId: string;
}

interface Schedule {
  _id: string;
  weekStart: string;
  assignments: Assignment[];
}

interface Props {
  householdId: string;
  people: { _id: string; name: string; color: string }[];
  tasks: ITask[];
  isAdmin: boolean;
}

interface LogMap { [key: string]: boolean }

export default function TaskLogPanel({ householdId, people, tasks, isAdmin }: Props) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [logs, setLogs] = useState<LogMap>({});
  const [loading, setLoading] = useState(false);

  const personName = (id: string) => people.find((p) => p._id === id)?.name ?? "?";
  const taskName = (id: string) => tasks.find((t) => t._id === id)?.name ?? "?";
  const taskWeight = (id: string) => tasks.find((t) => t._id === id)?.weight ?? 1;

  const logKey = (a: Assignment) => `${a.day}:${a.taskId}:${a.personId}`;

  const load = useCallback(async () => {
    try {
      const [schRes, logRes] = await Promise.all([
        apiFetch(`/api/schedule/${householdId}`),
        apiFetch(`/api/tasks/history?householdId=${householdId}&limit=200`),
      ]);
      setSchedule(schRes.data);
      const map: LogMap = {};
      for (const l of logRes.data) {
        map[`${l.taskId}:${l.assignedTo}`] = l.completed;
      }
      setLogs(map);
    } catch { /* schedule may not exist yet */ }
  }, [householdId]);

  useEffect(() => { load(); }, [load]);

  async function toggle(a: Assignment) {
    if (!isAdmin) return;
    const key = logKey(a);
    const currentlyDone = logs[`${a.taskId}:${a.personId}`] ?? false;
    setLoading(true);
    try {
      const weekDate = schedule?.weekStart ? new Date(schedule.weekStart) : new Date();
      const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      const dayOffset = DAYS.indexOf(a.day);
      const date = new Date(weekDate);
      date.setDate(date.getDate() + dayOffset);

      await apiFetch("/api/tasks/log", {
        method: "POST",
        body: JSON.stringify({
          householdId,
          taskId: a.taskId,
          taskName: taskName(a.taskId),
          assignedTo: a.personId,
          date: date.toISOString(),
          completed: !currentlyDone,
          weight: taskWeight(a.taskId),
        }),
      });
      setLogs((prev) => ({ ...prev, [`${a.taskId}:${a.personId}`]: !currentlyDone }));
      toast.success(!currentlyDone ? "Marked as done!" : "Marked as not done");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (!schedule) {
    return <p className="text-gray-400 text-sm text-center py-8">Generate a schedule first to log task completions.</p>;
  }

  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const byDay = DAYS.map((day) => ({
    day,
    assignments: schedule.assignments.filter((a) => a.day === day),
  })).filter((d) => d.assignments.length > 0);

  return (
    <div className="space-y-4">
      {!isAdmin && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Only admins can mark tasks as complete.
        </p>
      )}
      {byDay.map(({ day, assignments }) => (
        <div key={day} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5">
            <h3 className="font-semibold text-gray-700 text-sm">{day}</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {assignments.map((a) => {
              const done = logs[`${a.taskId}:${a.personId}`] ?? false;
              return (
                <div key={logKey(a)}
                  className={`flex items-center gap-3 px-4 py-3 ${isAdmin ? "cursor-pointer hover:bg-gray-50" : ""} transition-colors`}
                  onClick={() => isAdmin && !loading && toggle(a)}
                >
                  {done ? (
                    <CheckSquare size={18} className="text-green-500 flex-shrink-0" />
                  ) : (
                    <Square size={18} className="text-gray-300 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <span className={`text-sm font-medium ${done ? "line-through text-gray-400" : "text-gray-800"}`}>
                      {taskName(a.taskId)}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">→ {personName(a.personId)}</span>
                  </div>
                  <span className="text-xs text-gray-400">wt {taskWeight(a.taskId)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
