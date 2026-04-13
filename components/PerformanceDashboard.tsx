"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/hooks";
import { Star, TrendingUp } from "lucide-react";

interface PersonStats {
  personId: string;
  name: string;
  color: string;
  totalAssigned: number;
  totalCompleted: number;
  totalPoints: number;
  completionRate: number;
  rating: number;
}

interface Props {
  householdId: string;
  focusPersonId?: string; // if set, only show this person
}

function Stars({ count }: { count: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={13} className={i < count ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"} />
      ))}
    </span>
  );
}

export default function PerformanceDashboard({ householdId, focusPersonId }: Props) {
  const [stats, setStats] = useState<PersonStats[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const url = `/api/performance?householdId=${householdId}${focusPersonId ? `&personId=${focusPersonId}` : ""}`;
      const r = await apiFetch(url);
      setStats(r.data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [householdId, focusPersonId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-gray-400 text-sm text-center py-8">Loading stats…</p>;
  if (stats.length === 0) {
    return <p className="text-gray-400 text-sm text-center py-8">No task logs yet. Start logging completions in the Task Log tab.</p>;
  }

  const totalHousehold = stats.reduce((s, p) => s + p.totalCompleted, 0);
  const totalAssigned = stats.reduce((s, p) => s + p.totalAssigned, 0);
  const houseRate = totalAssigned > 0 ? Math.round((totalHousehold / totalAssigned) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Household summary */}
      {!focusPersonId && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Assigned", value: totalAssigned },
            { label: "Total Completed", value: totalHousehold },
            { label: "Household Rate", value: `${houseRate}%` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-indigo-600">{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Per-person table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
          <TrendingUp size={15} className="text-indigo-500" />
          <h3 className="font-semibold text-gray-700 text-sm">
            {focusPersonId ? "My Performance" : "Member Performance"}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-center px-3 py-3">Assigned</th>
                <th className="text-center px-3 py-3">Done</th>
                <th className="text-center px-3 py-3">Rate</th>
                <th className="text-center px-3 py-3">Points</th>
                <th className="text-center px-3 py-3">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.map((s, i) => (
                <tr key={s.personId} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                      <span className="font-medium text-gray-800">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center text-gray-600">{s.totalAssigned}</td>
                  <td className="px-3 py-3 text-center text-green-600 font-medium">{s.totalCompleted}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`font-semibold ${s.completionRate >= 75 ? "text-green-600" : s.completionRate >= 50 ? "text-amber-500" : "text-red-500"}`}>
                      {s.completionRate}%
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center text-indigo-600 font-semibold">{s.totalPoints}</td>
                  <td className="px-3 py-3 text-center"><Stars count={s.rating} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
