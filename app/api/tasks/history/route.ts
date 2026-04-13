import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { TaskLog } from "@/lib/models/TaskLog";

// GET /api/tasks/history?householdId=&personId=&limit=
export async function GET(req: Request) {
  try {
    await requireAuth();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get("householdId");
    const assignedTo = searchParams.get("personId");
    const limit = Math.min(Number(searchParams.get("limit") || 50), 200);

    if (!householdId) {
      return NextResponse.json({ error: "householdId required." }, { status: 400 });
    }

    const query: Record<string, unknown> = { householdId };
    if (assignedTo) query.assignedTo = assignedTo;

    const logs = await TaskLog.find(query).sort({ date: -1 }).limit(limit).lean();
    return NextResponse.json({ data: logs });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}
