import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Schedule } from "@/lib/models/Schedule";
import type { DayOfWeek } from "@/lib/types";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  await connectDB();

  // Support fetching by scheduleId OR householdId
  let schedule;
  if (params.id.length === 24) {
    schedule = await Schedule.findById(params.id).lean();
  }
  if (!schedule) {
    schedule = await Schedule.findOne({ householdId: params.id })
      .sort({ generatedAt: -1 })
      .lean();
  }

  if (!schedule) return NextResponse.json({ error: "Schedule not found." }, { status: 404 });
  return NextResponse.json({ data: schedule });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const body = await req.json();

    // Manual override: update a single assignment slot
    const { day, personId, taskId, action } = body;

    const schedule = await Schedule.findById(params.id);
    if (!schedule) return NextResponse.json({ error: "Schedule not found." }, { status: 404 });

    if (action === "update_assignment") {
      // Remove existing assignment for that task+day, then add new one
      schedule.assignments = schedule.assignments.filter(
        (a) => !(a.day === (day as DayOfWeek) && a.taskId.toString() === taskId)
      );
      if (personId) {
        schedule.assignments.push({ day: day as DayOfWeek, personId, taskId });
      }
      schedule.isManuallyEdited = true;

      // Recalculate effort points
      // We need task weights — store them or accept them from client
      const effortMap: Record<string, number> = {};
      const taskWeights: Record<string, number> = body.taskWeights || {};
      for (const a of schedule.assignments) {
        const tid = a.taskId.toString();
        const pid = a.personId.toString();
        effortMap[pid] = (effortMap[pid] || 0) + (taskWeights[tid] || 1);
      }
      schedule.effortPoints = Object.entries(effortMap).map(([personId, points]) => ({
        personId: new (require("mongoose").Types.ObjectId)(personId),
        points: Math.round(points * 100) / 100,
      }));
    }

    await schedule.save();
    return NextResponse.json({ data: schedule });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
