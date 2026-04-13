"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
  Users, ClipboardList, ShieldCheck, Calendar,
  BarChart2, CheckSquare, Mail, LogOut, Home, Loader2,
} from "lucide-react";
import { apiFetch } from "@/lib/hooks";

import PeopleManager from "@/components/PeopleManager";
import TaskManager from "@/components/TaskManager";
import ConstraintsManager from "@/components/ConstraintsManager";
import ScheduleView from "@/components/ScheduleView";
import EffortPoints from "@/components/EffortPoints";
import ExportPanel from "@/components/ExportPanel";
import InvitePanel from "@/components/InvitePanel";
import ConstraintApprovalPanel from "@/components/ConstraintApprovalPanel";
import TaskLogPanel from "@/components/TaskLogPanel";
import PerformanceDashboard from "@/components/PerformanceDashboard";
import type { IPerson, ITask, IConstraint, ISchedule } from "@/lib/types";

interface AuthUser {
  _id: string; name: string; email: string;
  role: "admin" | "member"; status: string; householdId: string;
}
interface HouseholdInfo { name: string; code: string; }

const ADMIN_TABS = [
  { id: "people",      label: "Roommates",  icon: <Users size={15} /> },
  { id: "tasks",       label: "Tasks",       icon: <ClipboardList size={15} /> },
  { id: "constraints", label: "Constraints", icon: <ShieldCheck size={15} /> },
  { id: "approvals",   label: "Approvals",   icon: <ShieldCheck size={15} /> },
  { id: "schedule",    label: "Schedule",    icon: <Calendar size={15} /> },
  { id: "tasklog",     label: "Task Log",    icon: <CheckSquare size={15} /> },
  { id: "performance", label: "Performance", icon: <BarChart2 size={15} /> },
  { id: "invites",     label: "Invites",     icon: <Mail size={15} /> },
] as const;

const MEMBER_TABS = [
  { id: "schedule",    label: "Schedule",   icon: <Calendar size={15} /> },
  { id: "constraints", label: "Constraints",icon: <ShieldCheck size={15} /> },
  { id: "tasklog",     label: "Task Log",   icon: <CheckSquare size={15} /> },
  { id: "performance", label: "My Stats",   icon: <BarChart2 size={15} /> },
] as const;

type Tab = string;

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser]         = useState<AuthUser | null>(null);
  const [household, setHousehold] = useState<HouseholdInfo | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab]           = useState<Tab>("schedule");
  const [people, setPeople]     = useState<IPerson[]>([]);
  const [tasks, setTasks]       = useState<ITask[]>([]);
  const [constraints, setConstraints] = useState<IConstraint[]>([]);
  const [schedule, setSchedule] = useState<ISchedule | null>(null);
  const [schedLoading, setSchedLoading] = useState(false);

  // auth check
  useEffect(() => {
    apiFetch("/api/auth/me")
      .then((r) => {
        const u: AuthUser = r.data;
        setUser(u);
        setTab(u.role === "admin" ? "people" : "schedule");
      })
      .catch(() => router.push("/login"))
      .finally(() => setAuthLoading(false));
  }, [router]);

  const loadPeople      = useCallback(async (hid: string) => { const r = await apiFetch(`/api/people?householdId=${hid}`);      setPeople(r.data); }, []);
  const loadTasks       = useCallback(async (hid: string) => { const r = await apiFetch(`/api/tasks?householdId=${hid}`);       setTasks(r.data); }, []);
  const loadConstraints = useCallback(async (hid: string) => { const r = await apiFetch(`/api/constraints?householdId=${hid}`); setConstraints(r.data); }, []);
  const loadSchedule    = useCallback(async (hid: string) => { try { const r = await apiFetch(`/api/schedule/${hid}`); setSchedule(r.data); } catch { setSchedule(null); } }, []);
  const loadHousehold   = useCallback(async (hid: string) => { const r = await apiFetch(`/api/households/${hid}`); setHousehold(r.data); }, []);

  useEffect(() => {
    if (!user?.householdId) return;
    const hid = user.householdId;
    loadHousehold(hid); loadPeople(hid); loadTasks(hid); loadConstraints(hid); loadSchedule(hid);
  }, [user, loadHousehold, loadPeople, loadTasks, loadConstraints, loadSchedule]);

  async function generateSchedule() {
    if (!user?.householdId) return;
    setSchedLoading(true);
    try {
      const r = await apiFetch("/api/schedule/generate", { method: "POST", body: JSON.stringify({ householdId: user.householdId }) });
      setSchedule(r.data);
      if (r.warnings?.length) toast(`⚠️ ${r.warnings.length} warning(s) — some slots unfilled`);
      else toast.success("Schedule generated!");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSchedLoading(false); }
  }

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;
  if (!user) return null;

  const isAdmin = user.role === "admin";
  const tabs = isAdmin ? ADMIN_TABS : MEMBER_TABS;
  const hid = user.householdId;

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="bg-indigo-600 p-1.5 rounded-lg"><Home size={18} className="text-white" /></div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 text-sm truncate">{household?.name ?? "Loading…"}</h1>
            <p className="text-xs text-gray-400">
              Code: <span className="font-mono font-semibold tracking-widest">{household?.code}</span>
              {" · "}<span className={isAdmin ? "text-indigo-600" : "text-gray-500"}>{isAdmin ? "Admin" : "Member"}</span>
              {" · "}{user.name}
            </p>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <nav className="flex gap-1 overflow-x-auto pb-1 mb-6">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${tab === t.id ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        {tab === "people" && isAdmin && (
          <PeopleManager householdId={hid} people={people} onChange={() => loadPeople(hid)} />
        )}

        {tab === "tasks" && isAdmin && (
          <TaskManager householdId={hid} tasks={tasks} onChange={() => loadTasks(hid)} />
        )}

        {tab === "constraints" && (
          <ConstraintsManager householdId={hid} people={people} tasks={tasks} constraints={constraints} onChange={() => loadConstraints(hid)} />
        )}

        {tab === "approvals" && isAdmin && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Pending Constraint Approvals</h2>
            <ConstraintApprovalPanel people={people} tasks={tasks} />
          </div>
        )}

        {tab === "schedule" && (
          <div className="space-y-4">
            {isAdmin && (
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={generateSchedule} disabled={schedLoading}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {schedLoading ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
                  {schedule ? "Regenerate Schedule" : "Generate Schedule"}
                </button>
                {schedule && <ExportPanel schedule={schedule} householdId={hid} people={people} />}
              </div>
            )}
            {schedule ? (
              <>
                <ScheduleView householdId={hid} schedule={schedule} people={people} tasks={tasks} onUpdate={() => loadSchedule(hid)} readOnly={!isAdmin} />
                <EffortPoints schedule={schedule} people={people} tasks={tasks} />
              </>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
                {isAdmin ? 'Click "Generate Schedule" to create this week\'s plan.' : "The admin hasn't generated a schedule yet."}
              </div>
            )}
          </div>
        )}

        {tab === "tasklog" && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Task Log</h2>
            <TaskLogPanel householdId={hid} people={people} tasks={tasks} isAdmin={isAdmin} />
          </div>
        )}

        {tab === "performance" && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">{isAdmin ? "Household Performance" : "My Stats"}</h2>
            <PerformanceDashboard householdId={hid} />
          </div>
        )}

        {tab === "invites" && isAdmin && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Member Invitations</h2>
            <InvitePanel householdId={hid} />
          </div>
        )}
      </div>
    </div>
  );
}
