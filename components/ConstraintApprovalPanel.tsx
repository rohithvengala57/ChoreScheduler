"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/hooks";
import toast from "react-hot-toast";

interface PendingConstraint {
  _id: string;
  type: string;
  personId: string;
  taskId?: string;
  day?: string;
  value?: number;
  note?: string;
  createdAt: string;
}

interface Props {
  people: { _id: string; name: string }[];
  tasks: { _id: string; name: string }[];
}

export default function ConstraintApprovalPanel({ people, tasks }: Props) {
  const [pending, setPending] = useState<PendingConstraint[]>([]);

  const personName = (id: string) => people.find((p) => p._id === id)?.name ?? id;
  const taskName = (id?: string) => id ? (tasks.find((t) => t._id === id)?.name ?? id) : "—";

  const load = useCallback(async () => {
    try {
      const r = await apiFetch("/api/constraints/pending");
      setPending(r.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function decide(id: string, action: "approve" | "reject") {
    try {
      await apiFetch(`/api/constraints/${id}/approve`, { method: "POST", body: JSON.stringify({ action }) });
      toast.success(action === "approve" ? "Constraint approved" : "Constraint rejected");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  }

  if (pending.length === 0) {
    return <p className="text-gray-400 text-sm text-center py-8">No pending constraints.</p>;
  }

  return (
    <div className="space-y-3">
      {pending.map((c) => (
        <div key={c._id} className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{c.type}</span>
                <span className="text-sm font-medium text-gray-800">{personName(c.personId)}</span>
              </div>
              <p className="text-xs text-gray-500">
                {c.taskId && <span>Task: <strong>{taskName(c.taskId)}</strong> · </span>}
                {c.day && <span>Day: <strong>{c.day}</strong> · </span>}
                {c.value != null && <span>Value: <strong>{c.value}</strong> · </span>}
                {c.note && <span>Note: {c.note}</span>}
              </p>
              <p className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button onClick={() => decide(c._id, "approve")}
                className="flex items-center gap-1 text-xs bg-green-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-green-700 transition-colors">
                <CheckCircle size={12} /> Approve
              </button>
              <button onClick={() => decide(c._id, "reject")}
                className="flex items-center gap-1 text-xs bg-red-500 text-white px-2.5 py-1.5 rounded-lg hover:bg-red-600 transition-colors">
                <XCircle size={12} /> Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
