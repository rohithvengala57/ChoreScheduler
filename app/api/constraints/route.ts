import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Constraint } from "@/lib/models/Constraint";

export async function GET(req: Request) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const householdId = searchParams.get("householdId");
  const query = householdId ? { householdId } : {};
  const constraints = await Constraint.find(query).sort({ createdAt: 1 }).lean();
  return NextResponse.json({ data: constraints });
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { householdId, type, personId, taskId, day, value, note } = body;

    if (!householdId) return NextResponse.json({ error: "householdId is required." }, { status: 400 });
    if (!type) return NextResponse.json({ error: "Constraint type is required." }, { status: 400 });
    if (!personId) return NextResponse.json({ error: "personId is required." }, { status: 400 });

    // Validate type-specific requirements
    if (type !== "day_off" && !taskId) {
      return NextResponse.json(
        { error: "taskId is required for all constraint types except day_off." },
        { status: 400 }
      );
    }
    if (type === "frequency" && (value === undefined || value === null)) {
      return NextResponse.json({ error: "value is required for frequency constraints." }, { status: 400 });
    }
    if (["fixed", "day_off"].includes(type) && !day) {
      return NextResponse.json({ error: "day is required for fixed and day_off constraints." }, { status: 400 });
    }

    const constraint = await Constraint.create({
      householdId,
      type,
      personId,
      taskId: taskId || undefined,
      day: day || undefined,
      value: value !== undefined ? Number(value) : undefined,
      note: note?.trim() || undefined,
    });

    return NextResponse.json({ data: constraint }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
