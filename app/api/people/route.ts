import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Person } from "@/lib/models/Person";

const PERSON_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444",
  "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6",
  "#f97316", "#84cc16",
];

export async function GET(req: Request) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const householdId = searchParams.get("householdId");
  const query = householdId ? { householdId } : {};
  const people = await Person.find(query).sort({ createdAt: 1 }).lean();
  return NextResponse.json({ data: people });
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, householdId, color } = body;

    if (!name?.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    if (!householdId) return NextResponse.json({ error: "householdId is required." }, { status: 400 });

    // Auto-assign a color if none provided
    const existingCount = await Person.countDocuments({ householdId });
    const assignedColor = color || PERSON_COLORS[existingCount % PERSON_COLORS.length];

    const person = await Person.create({ name: name.trim(), householdId, color: assignedColor });
    return NextResponse.json({ data: person }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
