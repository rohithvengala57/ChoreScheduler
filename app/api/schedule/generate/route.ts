import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Person } from "@/lib/models/Person";
import { Task } from "@/lib/models/Task";
import { Constraint } from "@/lib/models/Constraint";
import { Schedule } from "@/lib/models/Schedule";
import { generateSchedule } from "@/lib/scheduler";
import type { IPerson, ITask, IConstraint } from "@/lib/types";

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { householdId, weekStart } = body;

    if (!householdId) {
      return NextResponse.json({ error: "householdId is required." }, { status: 400 });
    }

    // Fetch household data — only use approved constraints
    const [people, tasks, constraints] = await Promise.all([
      Person.find({ householdId }).lean(),
      Task.find({ householdId }).lean(),
      Constraint.find({ householdId, status: { $in: ["approved", undefined] } }).lean(),
    ]);

    if (people.length === 0) {
      return NextResponse.json({ error: "Add at least one person before generating a schedule." }, { status: 400 });
    }
    if (tasks.length === 0) {
      return NextResponse.json({ error: "Add at least one task before generating a schedule." }, { status: 400 });
    }

    // Run the scheduling algorithm
    const result = generateSchedule({
      people: people as unknown as IPerson[],
      tasks: tasks as unknown as ITask[],
      constraints: constraints as unknown as IConstraint[],
    });

    // Persist the schedule
    const existing = await Schedule.findOne({ householdId, weekStart: new Date(weekStart || Date.now()) });
    let schedule;

    if (existing) {
      schedule = await Schedule.findByIdAndUpdate(
        existing._id,
        {
          assignments: result.assignments,
          effortPoints: result.effortPoints,
          feasible: result.feasible,
          warnings: result.warnings,
          generatedAt: new Date(),
          isManuallyEdited: false,
        },
        { new: true }
      );
    } else {
      schedule = await Schedule.create({
        householdId,
        weekStart: new Date(weekStart || Date.now()),
        assignments: result.assignments,
        effortPoints: result.effortPoints,
        feasible: result.feasible,
        warnings: result.warnings,
        generatedAt: new Date(),
        isManuallyEdited: false,
      });
    }

    return NextResponse.json({ data: schedule, warnings: result.warnings }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
