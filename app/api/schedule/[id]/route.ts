import { NextResponse } from "next/server";
import mongoose from "mongoose";
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

/** Recalculate effort points from current assignments + taskWeights map */
function recalcEffort(
  assignments: { taskId: mongoose.Types.ObjectId; personId: mongoose.Types.ObjectId }[],
  taskWeights: Record<string, number>
) {
  const effortMap: Record<string, number> = {};
  for (const a of assignments) {
    const tid = a.taskId.toString();
    const pid = a.personId.toString();
    effortMap[pid] = (effortMap[pid] || 0) + (taskWeights[tid] || 1);
  }
  return Object.entries(effortMap).map(([personId, points]) => ({
    personId: new mongoose.Types.ObjectId(personId),
    points: Math.round(points * 100) / 100,
  }));
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const body = await req.json();
    const { action } = body;
    const taskWeights: Record<string, number> = body.taskWeights || {};

    const schedule = await Schedule.findById(params.id);
    if (!schedule) return NextResponse.json({ error: "Schedule not found." }, { status: 404 });

    if (action === "update_assignment") {
      // Single-cell reassignment
      const { day, personId, taskId } = body;
      schedule.assignments = schedule.assignments.filter(
        (a) => !(a.day === (day as DayOfWeek) && a.taskId.toString() === taskId)
      );
      if (personId) {
        schedule.assignments.push({ day: day as DayOfWeek, personId, taskId });
      }
      schedule.isManuallyEdited = true;
      schedule.effortPoints = recalcEffort(schedule.assignments as never, taskWeights);
    } else if (action === "swap_assignments") {
      // Drag-and-drop swap: exchange people between slot1 and slot2
      const {
        slot1,
        slot2,
      }: {
        slot1: { day: DayOfWeek; taskId: string; personId: string | null };
        slot2: { day: DayOfWeek; taskId: string; personId: string | null };
      } = body;

      // Remove both slots
      schedule.assignments = schedule.assignments.filter(
        (a) =>
          !(a.day === slot1.day && a.taskId.toString() === slot1.taskId) &&
          !(a.day === slot2.day && a.taskId.toString() === slot2.taskId)
      );

      // Re-insert with swapped people
      if (slot2.personId) {
        schedule.assignments.push({
          day: slot1.day,
          personId: new mongoose.Types.ObjectId(slot2.personId),
          taskId: new mongoose.Types.ObjectId(slot1.taskId),
        });
      }
      if (slot1.personId) {
        schedule.assignments.push({
          day: slot2.day,
          personId: new mongoose.Types.ObjectId(slot1.personId),
          taskId: new mongoose.Types.ObjectId(slot2.taskId),
        });
      }

      schedule.isManuallyEdited = true;
      schedule.effortPoints = recalcEffort(schedule.assignments as never, taskWeights);
    }

    await schedule.save();
    return NextResponse.json({ data: schedule });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
