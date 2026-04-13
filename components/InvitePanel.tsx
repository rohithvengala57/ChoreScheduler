"use client";

import { useState, useEffect, useCallback } from "react";
import { Mail, CheckCircle, XCircle, Clock, Send, Copy } from "lucide-react";
import { apiFetch } from "@/lib/hooks";
import toast from "react-hot-toast";

interface Invite {
  _id: string;
  email: string;
  status: "pending" | "accepted" | "approved" | "rejected";
  createdAt: string;
}

interface Props { householdId: string; }

const STATUS_BADGE: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  pending:  { label: "Sent",     cls: "bg-yellow-100 text-yellow-700", icon: <Clock size={12} /> },
  accepted: { label: "Accepted", cls: "bg-blue-100 text-blue-700",    icon: <Clock size={12} /> },
  approved: { label: "Approved", cls: "bg-green-100 text-green-700",  icon: <CheckCircle size={12} /> },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-700",      icon: <XCircle size={12} /> },
};

export default function InvitePanel({ householdId }: Props) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastLink, setLastLink] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await apiFetch("/api/invite");
      setInvites(r.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function sendInvite() {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const r = await apiFetch("/api/invite", { method: "POST", body: JSON.stringify({ email }) });
      toast.success(`Invite sent to ${email}`);
      setLastLink(r.inviteLink || "");
      setEmail("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send invite");
    } finally {
      setLoading(false);
    }
  }

  async function decide(id: string, action: "approve" | "reject") {
    try {
      await apiFetch(`/api/invite/${id}`, { method: "POST", body: JSON.stringify({ action }) });
      toast.success(action === "approve" ? "Member approved!" : "Invite rejected");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  }

  return (
    <div className="space-y-6">
      {/* Send invite */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><Mail size={16} />Invite a Member</h3>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendInvite()}
            placeholder="member@example.com"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            onClick={sendInvite}
            disabled={loading || !email.trim()}
            className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Send size={14} /> Send
          </button>
        </div>
        {lastLink && (
          <div className="mt-3 flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
            <span className="text-xs text-indigo-600 truncate flex-1">{lastLink}</span>
            <button onClick={() => { navigator.clipboard.writeText(lastLink); toast.success("Link copied!"); }}
              className="text-indigo-500 hover:text-indigo-700 flex-shrink-0">
              <Copy size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Invite list */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-700 text-sm">Invite History</h3>
        {invites.length === 0 && <p className="text-gray-400 text-sm text-center py-6">No invites sent yet.</p>}
        {invites.map((inv) => {
          const badge = STATUS_BADGE[inv.status];
          return (
            <div key={inv._id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{inv.email}</p>
                <p className="text-xs text-gray-400">{new Date(inv.createdAt).toLocaleDateString()}</p>
              </div>
              <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>
                {badge.icon} {badge.label}
              </span>
              {inv.status === "accepted" && (
                <div className="flex gap-1">
                  <button onClick={() => decide(inv._id, "approve")}
                    className="text-xs bg-green-600 text-white px-2.5 py-1 rounded-lg hover:bg-green-700 transition-colors">Approve</button>
                  <button onClick={() => decide(inv._id, "reject")}
                    className="text-xs bg-red-500 text-white px-2.5 py-1 rounded-lg hover:bg-red-600 transition-colors">Reject</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
