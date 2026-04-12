"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Users, ArrowRight, Hash } from "lucide-react";
import { apiFetch } from "@/lib/hooks";
import type { IHousehold } from "@/lib/types";

type Mode = "choose" | "create" | "join";

export default function LandingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [hhName, setHhName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createHousehold() {
    if (!hhName.trim()) { setError("Please enter a household name."); return; }
    setLoading(true); setError("");
    try {
      const res = await apiFetch<IHousehold>("/api/households", {
        method: "POST",
        body: JSON.stringify({ name: hhName.trim() }),
      });
      if (res.data) {
        localStorage.setItem("householdId", res.data._id);
        localStorage.setItem("householdName", res.data.name);
        localStorage.setItem("householdCode", res.data.code);
        router.push("/dashboard");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create household.");
    } finally {
      setLoading(false);
    }
  }

  async function joinHousehold() {
    if (!joinCode.trim()) { setError("Please enter a join code."); return; }
    setLoading(true); setError("");
    try {
      const res = await apiFetch<IHousehold>("/api/households/join", {
        method: "POST",
        body: JSON.stringify({ code: joinCode.trim() }),
      });
      if (res.data) {
        localStorage.setItem("householdId", res.data._id);
        localStorage.setItem("householdName", res.data.name);
        localStorage.setItem("householdCode", res.data.code);
        router.push("/dashboard");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join household.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Hero */}
      <div className="text-center mb-10 animate-fade-in">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Home size={32} className="text-white" />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
          Roommate Chore Scheduler
        </h1>
        <p className="text-gray-500 text-lg max-w-md mx-auto">
          Fair, constraint-aware weekly chore distribution for your household.
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 animate-slide-up">
        {mode === "choose" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Get Started</h2>
            <button
              onClick={() => setMode("create")}
              className="w-full flex items-center justify-between bg-indigo-600 text-white px-5 py-4 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Home size={20} />
                <span>Create a new household</span>
              </div>
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => setMode("join")}
              className="w-full flex items-center justify-between border-2 border-gray-200 text-gray-700 px-5 py-4 rounded-xl font-medium hover:border-indigo-400 hover:text-indigo-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users size={20} />
                <span>Join existing household</span>
              </div>
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {mode === "create" && (
          <div>
            <button
              onClick={() => { setMode("choose"); setError(""); }}
              className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1"
            >
              ← Back
            </button>
            <h2 className="text-xl font-bold text-gray-800 mb-6">Create Household</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Household Name
                </label>
                <input
                  type="text"
                  value={hhName}
                  onChange={(e) => setHhName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createHousehold()}
                  placeholder="e.g. 5th Street Apartment"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  autoFocus
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                onClick={createHousehold}
                disabled={loading}
                className="w-full bg-indigo-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? "Creating…" : "Create & Continue"}
                {!loading && <ArrowRight size={16} />}
              </button>
            </div>
          </div>
        )}

        {mode === "join" && (
          <div>
            <button
              onClick={() => { setMode("choose"); setError(""); }}
              className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1"
            >
              ← Back
            </button>
            <h2 className="text-xl font-bold text-gray-800 mb-6">Join Household</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Household Code
                </label>
                <div className="relative">
                  <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && joinHousehold()}
                    placeholder="XXXXXX"
                    maxLength={6}
                    className="w-full border border-gray-300 rounded-xl pl-9 pr-4 py-3 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-400 uppercase"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Ask your household admin for the 6-character code.</p>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                onClick={joinHousehold}
                disabled={loading}
                className="w-full bg-indigo-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? "Joining…" : "Join & Continue"}
                {!loading && <ArrowRight size={16} />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Feature highlights */}
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl w-full animate-fade-in">
        {[
          {
            icon: "⚖️",
            title: "Fair Distribution",
            desc: "Algorithm minimises effort-point variance across all roommates.",
          },
          {
            icon: "🔒",
            title: "Real-World Constraints",
            desc: "Fixed, restrictions, preferences, frequency limits, and day-offs.",
          },
          {
            icon: "📅",
            title: "Calendar Export",
            desc: "Download CSV or .ics files per person for any calendar app.",
          },
        ].map((f) => (
          <div key={f.title} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm text-center">
            <div className="text-3xl mb-2">{f.icon}</div>
            <h3 className="font-semibold text-gray-800 mb-1">{f.title}</h3>
            <p className="text-xs text-gray-500">{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
