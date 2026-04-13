"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/hooks";
import { Home, Loader2 } from "lucide-react";

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [invite, setInvite] = useState<{ email: string; householdName: string; status: string } | null>(null);
  const [tokenError, setTokenError] = useState("");
  const [form, setForm] = useState({ name: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setTokenError("No invite token found in the link."); return; }
    apiFetch(`/api/invite/accept?token=${token}`)
      .then((r) => setInvite(r.data))
      .catch((e) => setTokenError(e.message));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name: form.name, email: invite!.email, password: form.password, inviteToken: token }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  if (tokenError) {
    return (
      <div className="text-center">
        <p className="text-red-500 mb-4">{tokenError}</p>
        <Link href="/login" className="text-indigo-600 hover:underline text-sm">Go to login</Link>
      </div>
    );
  }

  if (!invite) {
    return <div className="flex justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;
  }

  if (done) {
    return (
      <div className="text-center space-y-3">
        <div className="text-4xl">🎉</div>
        <h2 className="font-bold text-gray-800">Account created!</h2>
        <p className="text-sm text-gray-500">
          Your request to join <strong>{invite.householdName}</strong> is pending admin approval.
          You&apos;ll be able to sign in once approved.
        </p>
        <Link href="/login" className="block mt-4 text-indigo-600 hover:underline text-sm">Go to login</Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm">
        <p className="text-gray-600">Invited to join <strong>{invite.householdName}</strong></p>
        <p className="text-gray-400 text-xs mt-0.5">{invite.email}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required autoFocus
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Jane Smith"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={invite.email} disabled
            className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-gray-400 font-normal">(min 6 chars)</span></label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required minLength={6}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Creating account…" : "Accept Invitation"}
        </button>
      </form>
    </>
  );
}

export default function JoinPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-indigo-600 p-2.5 rounded-xl">
            <Home size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Chore Scheduler</h1>
            <p className="text-sm text-gray-500">Accept your invitation</p>
          </div>
        </div>
        <Suspense fallback={<div className="flex justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>}>
          <JoinForm />
        </Suspense>
      </div>
    </div>
  );
}
