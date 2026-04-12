import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Task } from "@/lib/models/Task";

export async function GET(req: Request) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const householdId = searchParams.get("householdId");
  const query = householdId ? { householdId } : {};
  const tasks = await Task.find(query).sort({ createdAt: 1 }).lean();
  return NextResponse.json({ data: tasks });
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, householdId, weight, frequency, timeOfDay } = body;

    if (!name?.trim()) return NextResponse.json({ error: "Task name is required." }, { status: 400 });
    if (!householdId) return NextResponse.json({ error: "householdId is required." }, { status: 400 });

    const task = await Task.create({
      name: name.trim(),
      householdId,
      weight: Number(weight) || 1,
      frequency: Number(frequency) || 7,
      timeOfDay: timeOfDay || "any",
    });
    return NextResponse.json({ data: task }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
