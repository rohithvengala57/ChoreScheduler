import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { TaskLog } from "@/lib/models/TaskLog";
import { Person } from "@/lib/models/Person";

function ratingStars(rate: number): number {
  if (rate >= 90) return 5;
  if (rate >= 75) return 4;
  if (rate >= 60) return 3;
  if (rate >= 40) return 2;
  return 1;
}

// GET /api/performance?householdId=&personId=
export async function GET(req: Request) {
  try {
    await requireAuth();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get("householdId");
    const personId = searchParams.get("personId");

    if (!householdId) {
      return NextResponse.json({ error: "householdId required." }, { status: 400 });
    }

    const query: Record<string, unknown> = { householdId };
    if (personId) query.assignedTo = personId;

    const [logs, people] = await Promise.all([
      TaskLog.find(query).lean(),
      Person.find({ householdId }).lean(),
    ]);

    const personMap = new Map(people.map((p) => [p._id.toString(), p]));

    // Aggregate per person
    const stats: Record<string, { totalAssigned: number; totalCompleted: number; totalPoints: number }> = {};

    for (const log of logs) {
      const pid = log.assignedTo.toString();
      if (!stats[pid]) stats[pid] = { totalAssigned: 0, totalCompleted: 0, totalPoints: 0 };
      stats[pid].totalAssigned += 1;
      if (log.completed) {
        stats[pid].totalCompleted += 1;
        stats[pid].totalPoints += log.weight || 1;
      }
    }

    const performance = Object.entries(stats).map(([personId, s]) => {
      const person = personMap.get(personId);
      const completionRate = s.totalAssigned > 0 ? Math.round((s.totalCompleted / s.totalAssigned) * 100) : 0;
      return {
        personId,
        name: person?.name ?? "Unknown",
        color: (person as { color?: string })?.color ?? "#6366f1",
        totalAssigned: s.totalAssigned,
        totalCompleted: s.totalCompleted,
        totalPoints: Math.round(s.totalPoints * 100) / 100,
        completionRate,
        rating: ratingStars(completionRate),
      };
    });

    // Sort by points desc
    performance.sort((a, b) => b.totalPoints - a.totalPoints);

    return NextResponse.json({ data: performance });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}
