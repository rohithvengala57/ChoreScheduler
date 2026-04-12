"use client";

import { useState } from "react";
import { ClipboardList, Trash2, Edit2, Check, X } from "lucide-react";
import type { ITask, TimeOfDay } from "@/lib/types";
import { apiFetch } from "@/lib/hooks";

const TIME_OPTIONS: { label: string; value: TimeOfDay }[] = [
  { label: "Any time", value: "any" },
  { label: "Morning", value: "morning" },
  { label: "Afternoon", value: "afternoon" },
  { label: "Evening", value: "evening" },
];

interface Props {
  householdId: string;
  tasks: ITask[];
  onChange: () => void;
}

const DEFAULT_TASKS = [
  { name: "Cooking", weight: 2, frequency: 7, timeOfDay: "morning" as TimeOfDay },
  { name: "Dishes", weight: 1, frequency: 7, timeOfDay: "evening" as TimeOfDay },
  { name: "Sweep/Mop", weight: 1, frequency: 3, timeOfDay: "any" as TimeOfDay },
  { name: "Trash", weight: 0.5, frequency: 2, timeOfDay: "evening" as TimeOfDay },
];

interface FormState {
  name: string;
  weight: string;
  frequency: string;
  timeOfDay: TimeOfDay;
}

const emptyForm = (): FormState => ({ name: "", weight: "1", frequency: "7", timeOfDay: "any" });

export default function TaskManager({ householdId, tasks, onChange }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function addTask() {
    if (!form.name.trim()) { setError("Task name is required."); return; }
    setLoading(true); setError("");
    try {
      await apiFetch("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ ...form, householdId }),
      });
      setForm(emptyForm());
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function saveTask(id: string) {
    setLoading(true);
    try {
      await apiFetch(`/api/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify(editForm),
      });
      setEditId(null);
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function deleteTask(id: string) {
    if (!confirm("Remove this task? Its constraints will also be removed.")) return;
    setLoading(true);
    try {
      await apiFetch(`/api/tasks/${id}`, { method: "DELETE" });
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function loadDefaults() {
    if (!confirm("Load default tasks (Cooking, Dishes, Sweep/Mop, Trash)?")) return;
    setLoading(true);
    try {
      for (const t of DEFAULT_TASKS) {
        await apiFetch("/api/tasks", {
          method: "POST",
          body: JSON.stringify({ ...t, householdId }),
        });
      }
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const weightBadgeColor = (w: number) => {
    if (w >= 2) return "bg-red-100 text-red-700";
    if (w >= 1) return "bg-amber-100 text-amber-700";
    return "bg-green-100 text-green-700";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Tasks</h2>
        {tasks.length === 0 && (
          <button
            onClick={loadDefaults}
            className="text-sm text-indigo-600 hover:underline font-medium"
          >
            Load defaults
          </button>
        )}
      </div>

      {/* Add form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-4">Add Task</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Task name"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <div>
            <label className="block text-xs text-gray-500 mb-1">Weight (effort)</label>
            <input
              type="number"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
              min={0.1}
              step={0.5}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Times/week (1–7)</label>
            <input
              type="number"
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
              min={1}
              max={7}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Time of day</label>
            <select
              value={form.timeOfDay}
              onChange={(e) => setForm({ ...form, timeOfDay: e.target.value as TimeOfDay })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <button
          onClick={addTask}
          disabled={loading}
          className="mt-4 flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <ClipboardList size={16} />
          Add Task
        </button>
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {tasks.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">No tasks yet.</p>
        )}
        {tasks.map((t) => (
          <div key={t._id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            {editId === t._id ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  autoFocus
                />
                <input
                  type="number"
                  value={editForm.weight}
                  onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                  min={0.1}
                  step={0.5}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  value={editForm.frequency}
                  onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value })}
                  min={1}
                  max={7}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <select
                  value={editForm.timeOfDay}
                  onChange={(e) => setEditForm({ ...editForm, timeOfDay: e.target.value as TimeOfDay })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <div className="flex gap-2 sm:col-span-4">
                  <button onClick={() => saveTask(t._id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Check size={16} /></button>
                  <button onClick={() => setEditId(null)} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg"><X size={16} /></button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 flex-wrap">
                <span className="font-medium text-gray-800 flex-1">{t.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${weightBadgeColor(t.weight)}`}>
                  weight: {t.weight}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                  {t.frequency}×/week
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {t.timeOfDay}
                </span>
                <button
                  onClick={() => { setEditId(t._id); setEditForm({ name: t.name, weight: String(t.weight), frequency: String(t.frequency), timeOfDay: t.timeOfDay }); }}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={() => deleteTask(t._id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
