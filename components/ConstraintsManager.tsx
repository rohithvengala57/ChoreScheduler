"use client";

import { useState, useMemo } from "react";
import { Trash2, Plus, Filter, X } from "lucide-react";
import type { IConstraint, IPerson, ITask, ConstraintType, DayOfWeek } from "@/lib/types";
import { DAYS_OF_WEEK } from "@/lib/types";
import { apiFetch } from "@/lib/hooks";

interface Props {
  householdId: string;
  people: IPerson[];
  tasks: ITask[];
  constraints: IConstraint[];
  onChange: () => void;
}

const CONSTRAINT_TYPES: { value: ConstraintType; label: string; desc: string }[] = [
  { value: "fixed", label: "Fixed", desc: "Person MUST do task on day" },
  { value: "restriction", label: "Restriction", desc: "Person CANNOT do task" },
  { value: "preference", label: "Preference", desc: "Person PREFERS task" },
  { value: "frequency", label: "Frequency", desc: "Person does task N times/week" },
  { value: "day_off", label: "Day Off", desc: "Person has day off (no tasks)" },
];

const TYPE_COLORS: Record<ConstraintType, string> = {
  fixed: "bg-blue-100 text-blue-700",
  restriction: "bg-red-100 text-red-700",
  preference: "bg-green-100 text-green-700",
  frequency: "bg-purple-100 text-purple-700",
  day_off: "bg-amber-100 text-amber-700",
};

interface FormState {
  type: ConstraintType;
  personId: string;
  taskId: string;
  day: DayOfWeek | "";
  value: string;
  note: string;
}

const emptyForm = (): FormState => ({
  type: "restriction",
  personId: "",
  taskId: "",
  day: "",
  value: "1",
  note: "",
});

export default function ConstraintsManager({ householdId, people, tasks, constraints, onChange }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState("");

  // ── Filter state ──────────────────────────────────────────────────────
  const [filterType, setFilterType] = useState<ConstraintType | "">("");
  const [filterPersonId, setFilterPersonId] = useState("");
  const [filterDay, setFilterDay] = useState<DayOfWeek | "">("");

  const needsTask = form.type !== "day_off";
  const needsDay = form.type === "fixed" || form.type === "day_off";
  const needsValue = form.type === "frequency";

  async function addConstraint() {
    if (!form.personId) { setError("Select a person."); return; }
    if (needsTask && !form.taskId) { setError("Select a task."); return; }
    if (needsDay && !form.day) { setError("Select a day."); return; }
    if (needsValue && (!form.value || Number(form.value) <= 0)) {
      setError("Enter a valid frequency value.");
      return;
    }

    setLoading(true); setError("");
    try {
      await apiFetch("/api/constraints", {
        method: "POST",
        body: JSON.stringify({
          householdId,
          type: form.type,
          personId: form.personId,
          taskId: form.taskId || undefined,
          day: form.day || undefined,
          value: needsValue ? Number(form.value) : undefined,
          note: form.note || undefined,
        }),
      });
      setForm(emptyForm());
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function addFromJson() {
    setError("");
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setError("Invalid JSON");
      return;
    }
    const items = Array.isArray(parsed) ? parsed : [parsed];
    setLoading(true);
    try {
      for (const item of items) {
        await apiFetch("/api/constraints", {
          method: "POST",
          body: JSON.stringify({ ...item, householdId }),
        });
      }
      setJsonText("");
      setShowJson(false);
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error in JSON import");
    } finally {
      setLoading(false);
    }
  }

  async function deleteConstraint(id: string) {
    setLoading(true);
    try {
      await apiFetch(`/api/constraints/${id}`, { method: "DELETE" });
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  function describeConstraint(c: IConstraint): string {
    const person = people.find((p) => p._id === c.personId)?.name ?? "?";
    const task = tasks.find((t) => t._id === c.taskId)?.name ?? "";
    switch (c.type) {
      case "fixed": return `${person} MUST do ${task} on ${c.day}`;
      case "restriction": return c.day
        ? `${person} CANNOT do ${task} on ${c.day}`
        : `${person} CANNOT do ${task}`;
      case "preference": return c.day
        ? `${person} PREFERS ${task} on ${c.day}`
        : `${person} PREFERS ${task}`;
      case "frequency": return `${person} does ${task} exactly ${c.value}×/week`;
      case "day_off": return `${person} has day off on ${c.day}`;
      default: return JSON.stringify(c);
    }
  }

  const personMap = new Map(people.map((p) => [p._id, p]));

  // ── Filtered constraints ──────────────────────────────────────────────
  const filteredConstraints = useMemo(() => {
    return constraints.filter((c) => {
      if (filterType && c.type !== filterType) return false;
      if (filterPersonId && c.personId !== filterPersonId) return false;
      if (filterDay) {
        // day_off stores day directly; others may or may not have a day
        if (!c.day || c.day !== filterDay) return false;
      }
      return true;
    });
  }, [constraints, filterType, filterPersonId, filterDay]);

  const hasFilters = !!(filterType || filterPersonId || filterDay);

  function clearFilters() {
    setFilterType("");
    setFilterPersonId("");
    setFilterDay("");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Constraints</h2>
        <button
          onClick={() => setShowJson(!showJson)}
          className="text-sm text-indigo-600 hover:underline"
        >
          {showJson ? "Form mode" : "JSON editor"}
        </button>
      </div>

      {showJson ? (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-3">
            Paste a JSON array of constraint objects. Example:
          </p>
          <pre className="text-xs bg-gray-50 p-3 rounded-lg mb-3 overflow-auto text-gray-600">
{`[
  {"type":"restriction","personId":"...","taskId":"..."},
  {"type":"fixed","personId":"...","taskId":"...","day":"Wednesday"},
  {"type":"day_off","personId":"...","day":"Friday"}
]`}
          </pre>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={6}
            className="w-full font-mono text-sm border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Paste JSON here..."
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          <button
            onClick={addFromJson}
            disabled={loading}
            className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            Import
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Add Constraint</h3>

          {/* Type selection */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
            {CONSTRAINT_TYPES.map((ct) => (
              <button
                key={ct.value}
                onClick={() => setForm({ ...emptyForm(), type: ct.value, personId: form.personId })}
                title={ct.desc}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                  form.type === ct.value
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-400"
                }`}
              >
                {ct.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Person */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Person *</label>
              <select
                value={form.personId}
                onChange={(e) => setForm({ ...form, personId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">Select person</option>
                {people.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>

            {/* Task */}
            {needsTask && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Task *</label>
                <select
                  value={form.taskId}
                  onChange={(e) => setForm({ ...form, taskId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">Select task</option>
                  {tasks.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
            )}

            {/* Day */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Day {needsDay ? "*" : "(optional)"}
              </label>
              <select
                value={form.day}
                onChange={(e) => setForm({ ...form, day: e.target.value as DayOfWeek | "" })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">Any day</option>
                {DAYS_OF_WEEK.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Frequency value */}
            {needsValue && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Times per week *</label>
                <input
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  min={1}
                  max={7}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            )}

            {/* Note */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Note (optional)</label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="e.g. Allergy"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

          <button
            onClick={addConstraint}
            disabled={loading}
            className="mt-4 flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Plus size={16} />
            Add Constraint
          </button>
        </div>
      )}

      {/* ── Active Constraints ─────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold text-gray-700">
            Active Constraints
            <span className="ml-1.5 text-xs font-normal text-gray-400">
              ({filteredConstraints.length}
              {hasFilters ? ` of ${constraints.length}` : ""})
            </span>
          </h3>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
            >
              <X size={12} />
              Clear filters
            </button>
          )}
        </div>

        {/* Filter bar */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-wrap gap-2 items-center">
          <Filter size={14} className="text-gray-400 flex-shrink-0" />

          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ConstraintType | "")}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">All types</option>
            {CONSTRAINT_TYPES.map((ct) => (
              <option key={ct.value} value={ct.value}>{ct.label}</option>
            ))}
          </select>

          {/* Person filter */}
          <select
            value={filterPersonId}
            onChange={(e) => setFilterPersonId(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">All people</option>
            {people.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>

          {/* Day filter */}
          <select
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value as DayOfWeek | "")}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">All days</option>
            {DAYS_OF_WEEK.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Active filter chips */}
          <div className="flex flex-wrap gap-1 ml-auto">
            {filterType && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[filterType]}`}>
                {filterType}
                <button onClick={() => setFilterType("")} className="ml-1 opacity-60 hover:opacity-100">×</button>
              </span>
            )}
            {filterPersonId && (
              <span
                className="text-xs px-2 py-0.5 rounded-full text-white font-medium flex items-center gap-1"
                style={{ background: personMap.get(filterPersonId)?.color ?? "#999" }}
              >
                {personMap.get(filterPersonId)?.name}
                <button onClick={() => setFilterPersonId("")} className="opacity-70 hover:opacity-100">×</button>
              </span>
            )}
            {filterDay && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 font-medium flex items-center gap-1">
                {filterDay}
                <button onClick={() => setFilterDay("")} className="opacity-60 hover:opacity-100">×</button>
              </span>
            )}
          </div>
        </div>

        {/* List */}
        {constraints.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-6">No constraints yet.</p>
        )}
        {constraints.length > 0 && filteredConstraints.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-6">
            No constraints match the active filters.
          </p>
        )}
        {filteredConstraints.map((c) => {
          const person = personMap.get(c.personId);
          return (
            <div
              key={c._id}
              className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-4 py-3"
            >
              <div
                className="w-2 h-6 rounded-full flex-shrink-0"
                style={{ background: person?.color ?? "#999" }}
              />
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${TYPE_COLORS[c.type]}`}>
                {c.type}
              </span>
              <span className="text-sm text-gray-700 flex-1">{describeConstraint(c)}</span>
              {c.note && (
                <span className="text-xs text-gray-400 italic hidden sm:inline">{c.note}</span>
              )}
              <button
                onClick={() => deleteConstraint(c._id)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
