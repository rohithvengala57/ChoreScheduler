import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { TaskLog } from "@/lib/models/TaskLog";

// POST /api/tasks/log — log or update a task completion
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    await connectDB();

    const { householdId, taskId, taskName, assignedTo, date, completed, weight } = await req.json();
    if (!householdId || !taskId || !assignedTo || !date) {
      return NextResponse.json({ error: "householdId, taskId, assignedTo, date are required." }, { status: 400 });
    }

    const logDate = new Date(date);
    logDate.setHours(0, 0, 0, 0);

    const existing = await TaskLog.findOne({ householdId, taskId, assignedTo, date: logDate });

    if (existing) {
      existing.completed = Boolean(completed);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      existing.completedBy = completed ? (user._id as any) : null;
      await existing.save();
      return NextResponse.json({ data: existing });
    }

    const log = await TaskLog.create({
      householdId,
      taskId,
      taskName: taskName || "Unknown task",
      assignedTo,
      date: logDate,
      completed: Boolean(completed),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      completedBy: completed ? (user._id as any) : null,
      weight: weight || 1,
    });

    return NextResponse.json({ data: log }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}
