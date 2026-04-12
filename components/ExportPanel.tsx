"use client";

import { useState } from "react";
import { Download, FileText, Calendar, FileSpreadsheet } from "lucide-react";
import type { ISchedule, IPerson } from "@/lib/types";

interface Props {
  schedule: ISchedule | null;
  people: IPerson[];
  householdId: string;
}

export default function ExportPanel({ schedule, people, householdId }: Props) {
  const [personFilter, setPersonFilter] = useState("");

  if (!schedule) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
        Generate a schedule to enable exports.
      </div>
    );
  }

  const scheduleId = schedule._id;

  function downloadCsv() {
    const url = `/api/export/csv?scheduleId=${scheduleId}`;
    triggerDownload(url, "chore-schedule.csv");
  }

  function downloadIcs(personId?: string) {
    const url = personId
      ? `/api/export/ics?scheduleId=${scheduleId}&personId=${personId}`
      : `/api/export/ics?scheduleId=${scheduleId}`;
    triggerDownload(url, "chore-schedule.ics");
  }

  function triggerDownload(url: string, filename: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Export & Calendar</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* CSV */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <FileSpreadsheet size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">CSV Export</h3>
              <p className="text-xs text-gray-500">Full weekly table + effort points</p>
            </div>
          </div>
          <button
            onClick={downloadCsv}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <Download size={16} />
            Download CSV
          </button>
        </div>

        {/* ICS - All */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Calendar size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Calendar (.ics)</h3>
              <p className="text-xs text-gray-500">All roommates — import into any calendar</p>
            </div>
          </div>
          <button
            onClick={() => downloadIcs()}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Download size={16} />
            Download All (.ics)
          </button>
        </div>
      </div>

      {/* Per-person ICS */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-3">Personal Calendar (.ics)</h3>
        <p className="text-sm text-gray-500 mb-4">
          Download a calendar file for a specific roommate — only their assigned chores.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((p) => (
            <button
              key={p._id}
              onClick={() => downloadIcs(p._id)}
              className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left"
            >
              <div
                className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                style={{ background: p.color }}
              >
                {p.name.charAt(0)}
              </div>
              <span className="font-medium text-gray-700">{p.name}</span>
              <Download size={13} className="ml-auto text-gray-400" />
            </button>
          ))}
        </div>
      </div>

      {/* Quick summary */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-sm text-gray-600">
        <div className="flex items-start gap-2">
          <FileText size={16} className="mt-0.5 text-gray-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-gray-700 mb-1">How to use the .ics file</p>
            <ul className="space-y-0.5 text-xs text-gray-500 list-disc list-inside">
              <li>Google Calendar: Settings → Import → Choose file</li>
              <li>Apple Calendar: File → Import</li>
              <li>Outlook: File → Open & Export → Import/Export → iCalendar file</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
