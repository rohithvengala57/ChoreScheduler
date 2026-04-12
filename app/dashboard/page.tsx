"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  Users,
  ClipboardList,
  ShieldCheck,
  CalendarDays,
  BarChart3,
  Download,
  LogOut,
  Copy,
  CheckCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import type { IPerson, ITask, IConstraint, ISchedule } from "@/lib/types";
import { apiFetch } from "@/lib/hooks";
import PeopleManager from "@/components/PeopleManager";
import TaskManager from "@/components/TaskManager";
import ConstraintsManager from "@/components/ConstraintsManager";
import ScheduleView from "@/components/ScheduleView";
import EffortPoints from "@/components/EffortPoints";
import ExportPanel from "@/components/ExportPanel";

type Tab = "people" | "tasks" | "constraints" | "schedule" | "points" | "export";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "people", label: "Roommates", icon: <Users size={16} /> },
  { id: "tasks", label: "Tasks", icon: <ClipboardList size={16} /> },
  { id: "constraints", label: "Constraints", icon: <ShieldCheck size={16} /> },
  { id: "schedule", label: "Schedule", icon: <CalendarDays size={16} /> },
  { id: "points", label: "Effort Points", icon: <BarChart3 size={16} /> },
  { id: "export", label: "Export", icon: <Download size={16} /> },
];

export default function DashboardPage() {
  const router = useRouter();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [householdName, setHouseholdName] = useState("");
  const [householdCode, setHouseholdCode] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("people");
  const [codeCopied, setCodeCopied] = useState(false);

  const [people, setPeople] = useState<IPerson[]>([]);
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [constraints, setConstraints] = useState<IConstraint[]>([]);
  const [schedule, setSchedule] = useState<ISchedule | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // ── Load household from localStorage ──────────────────────────────────
  useEffect(() => {
    const id = localStorage.getItem("householdId");
    if (!id) { router.replace("/"); return; }
    setHouseholdId(id);
    setHouseholdName(localStorage.getItem("householdName") ?? "");
    setHouseholdCode(localStorage.getItem("householdCode") ?? "");
  }, [router]);

  // ── Fetch data ─────────────────────────────────────────────────────────
  const fetchPeople = useCallback(async (id: string) => {
    const res = await apiFetch<IPerson[]>(`/api/people?householdId=${id}`);
    if (res.data) setPeople(res.data);
  }, []);

  const fetchTasks = useCallback(async (id: string) => {
    const res = await apiFetch<ITask[]>(`/api/tasks?householdId=${id}`);
    if (res.data) setTasks(res.data);
  }, []);

  const fetchConstraints = useCallback(async (id: string) => {
    const res = await apiFetch<IConstraint[]>(`/api/constraints?householdId=${id}`);
    if (res.data) setConstraints(res.data);
  }, []);

  const fetchSchedule = useCallback(async (id: string) => {
    try {
      const res = await apiFetch<ISchedule>(`/api/schedule/${id}`);
      if (res.data) setSchedule(res.data);
    } catch {
      // no schedule yet — ignore
    }
  }, []);

  const fetchAll = useCallback(
    async (id: string) => {
      setLoadingData(true);
      try {
        await Promise.all([
          fetchPeople(id),
          fetchTasks(id),
          fetchConstraints(id),
          fetchSchedule(id),
        ]);
      } finally {
        setLoadingData(false);
      }
    },
    [fetchPeople, fetchTasks, fetchConstraints, fetchSchedule]
  );

  useEffect(() => {
    if (householdId) fetchAll(householdId);
  }, [householdId, fetchAll]);

  // ── Handlers ───────────────────────────────────────────────────────────
  function copyCode() {
    navigator.clipboard.writeText(householdCode).then(() => {
      setCodeCopied(true);
      toast.success("Code copied!");
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }

  function leave() {
    localStorage.removeItem("householdId");
    localStorage.removeItem("householdName");
    localStorage.removeItem("householdCode");
    router.replace("/");
  }

  function onPeopleChange() {
    if (householdId) {
      fetchPeople(householdId);
      fetchConstraints(householdId); // constraints may change
      toast.success("Roommate saved!");
    }
  }

  function onTasksChange() {
    if (householdId) {
      fetchTasks(householdId);
      fetchConstraints(householdId);
      toast.success("Task saved!");
    }
  }

  function onConstraintsChange() {
    if (householdId) {
      fetchConstraints(householdId);
      toast.success("Constraint saved!");
    }
  }

  function onScheduleGenerated() {
    if (householdId) {
      fetchSchedule(householdId);
      toast.success("Schedule generated!");
    }
  }

  if (!householdId) return null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Home size={16} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-800 text-sm sm:text-base leading-tight">
              {householdName}
            </h1>
            <button
              onClick={copyCode}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
            >
              Code: <span className="font-mono font-semibold">{householdCode}</span>
              {codeCopied ? (
                <CheckCheck size={12} className="text-green-500" />
              ) : (
                <Copy size={12} />
              )}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-4 text-sm text-gray-500">
          <span>{people.length} roommates</span>
          <span>·</span>
          <span>{tasks.length} tasks</span>
          <span>·</span>
          <span>{constraints.length} constraints</span>
        </div>

        <button
          onClick={leave}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors"
        >
          <LogOut size={15} />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </header>

      {/* ── Tab bar ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === "people" && people.length > 0 && (
                <span className="ml-1 text-xs bg-indigo-100 text-indigo-600 rounded-full px-1.5 py-0.5">
                  {people.length}
                </span>
              )}
              {tab.id === "tasks" && tasks.length > 0 && (
                <span className="ml-1 text-xs bg-indigo-100 text-indigo-600 rounded-full px-1.5 py-0.5">
                  {tasks.length}
                </span>
              )}
              {tab.id === "constraints" && constraints.length > 0 && (
                <span className="ml-1 text-xs bg-indigo-100 text-indigo-600 rounded-full px-1.5 py-0.5">
                  {constraints.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="flex-1 px-4 sm:px-6 py-6 max-w-5xl mx-auto w-full">
        {loadingData ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="animate-fade-in">
            {activeTab === "people" && (
              <PeopleManager
                householdId={householdId}
                people={people}
                onChange={onPeopleChange}
              />
            )}
            {activeTab === "tasks" && (
              <TaskManager
                householdId={householdId}
                tasks={tasks}
                onChange={onTasksChange}
              />
            )}
            {activeTab === "constraints" && (
              <ConstraintsManager
                householdId={householdId}
                people={people}
                tasks={tasks}
                constraints={constraints}
                onChange={onConstraintsChange}
              />
            )}
            {activeTab === "schedule" && (
              <ScheduleView
                householdId={householdId}
                schedule={schedule}
                people={people}
                tasks={tasks}
                onGenerate={onScheduleGenerated}
                onScheduleChange={setSchedule}
              />
            )}
            {activeTab === "points" && (
              <EffortPoints
                schedule={schedule}
                people={people}
                tasks={tasks}
              />
            )}
            {activeTab === "export" && (
              <ExportPanel
                schedule={schedule}
                people={people}
                householdId={householdId}
              />
            )}
          </div>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="py-4 text-center text-xs text-gray-400 border-t border-gray-200 bg-white">
        Roommate Chore Scheduler — Fair scheduling for happy households
      </footer>
    </div>
  );
}
