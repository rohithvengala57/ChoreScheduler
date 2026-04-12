import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Schedule } from "@/lib/models/Schedule";
import { Person } from "@/lib/models/Person";
import { Task } from "@/lib/models/Task";
import { DAYS_OF_WEEK } from "@/lib/types";

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const scheduleId = searchParams.get("scheduleId");
    const householdId = searchParams.get("householdId");

    let schedule;
    if (scheduleId) {
      schedule = await Schedule.findById(scheduleId).lean();
    } else if (householdId) {
      schedule = await Schedule.findOne({ householdId }).sort({ generatedAt: -1 }).lean();
    }

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found." }, { status: 404 });
    }

    const [people, tasks] = await Promise.all([
      Person.find({ householdId: schedule.householdId }).lean(),
      Task.find({ householdId: schedule.householdId }).lean(),
    ]);

    const personMap = new Map(people.map((p) => [p._id.toString(), p.name]));
    const taskMap = new Map(tasks.map((t) => [t._id.toString(), t.name]));

    // Build header: Day | Task1 | Task2 | …
    const taskNames = tasks.map((t) => t.name);
    const header = ["Day", ...taskNames].join(",");

    const rows: string[] = [header];

    for (const day of DAYS_OF_WEEK) {
      const dayAssignments = schedule.assignments.filter((a) => a.day === day);
      const cols: string[] = [day];

      for (const task of tasks) {
        const tid = task._id.toString();
        const match = dayAssignments.find((a) => a.taskId.toString() === tid);
        cols.push(match ? (personMap.get(match.personId.toString()) ?? "?") : "-");
      }

      rows.push(cols.join(","));
    }

    // Effort points section
    rows.push("");
    rows.push("Effort Points Summary");
    rows.push("Person,Points");
    for (const entry of schedule.effortPoints) {
      const name = personMap.get(entry.personId.toString()) ?? "Unknown";
      rows.push(`${name},${entry.points}`);
    }

    const csv = rows.join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="chore-schedule.csv"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
