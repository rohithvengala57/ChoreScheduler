"use client";

import Link from "next/link";
import { Clock } from "lucide-react";

export default function PendingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-10 text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-amber-100 p-4 rounded-full">
            <Clock size={32} className="text-amber-500" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Awaiting Approval</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          Your account has been created. The household admin needs to approve your request before you can access the dashboard.
        </p>
        <p className="text-gray-400 text-xs mt-4">
          Once approved, sign in again to get started.
        </p>
        <Link href="/login"
          className="mt-6 inline-block bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
