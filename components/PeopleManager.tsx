"use client";

import { useState } from "react";
import { UserPlus, Trash2, Edit2, Check, X } from "lucide-react";
import type { IPerson } from "@/lib/types";
import { apiFetch } from "@/lib/hooks";

const COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444",
  "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6",
  "#f97316", "#84cc16",
];

interface Props {
  householdId: string;
  people: IPerson[];
  onChange: () => void;
}

export default function PeopleManager({ householdId, people, onChange }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function addPerson() {
    if (!name.trim()) { setError("Name cannot be empty."); return; }
    setLoading(true); setError("");
    try {
      await apiFetch("/api/people", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), householdId, color }),
      });
      setName("");
      setColor(COLORS[people.length % COLORS.length]);
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function savePerson(id: string) {
    if (!editName.trim()) return;
    setLoading(true);
    try {
      await apiFetch(`/api/people/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name: editName.trim(), color: editColor }),
      });
      setEditId(null);
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function deletePerson(id: string) {
    if (!confirm("Remove this person? Their constraints will also be removed.")) return;
    setLoading(true);
    try {
      await apiFetch(`/api/people/${id}`, { method: "DELETE" });
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Roommates</h2>

      {/* Add form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-4">Add Roommate</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPerson()}
            placeholder="Roommate name"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Color:</span>
            <div className="flex gap-1 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    color === c ? "border-gray-700 scale-125" : "border-transparent"
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <button
            onClick={addPerson}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <UserPlus size={16} />
            Add
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      {/* People list */}
      <div className="grid gap-3">
        {people.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">No roommates yet. Add one above!</p>
        )}
        {people.map((p) => (
          <div
            key={p._id}
            className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 shadow-sm"
          >
            <div
              className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm"
              style={{ background: p.color }}
            >
              {p.name.charAt(0).toUpperCase()}
            </div>

            {editId === p._id ? (
              <>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  autoFocus
                />
                <div className="flex gap-1">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setEditColor(c)}
                      className={`w-5 h-5 rounded-full border-2 transition-transform ${
                        editColor === c ? "border-gray-700 scale-125" : "border-transparent"
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => savePerson(p._id)}
                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => setEditId(null)}
                  className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 font-medium text-gray-800">{p.name}</span>
                <button
                  onClick={() => { setEditId(p._id); setEditName(p.name); setEditColor(p.color); }}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => deletePerson(p._id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
