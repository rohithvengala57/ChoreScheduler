import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Household } from "@/lib/models/Household";
import { nanoid } from "./helpers";

export async function GET() {
  await connectDB();
  const households = await Household.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ data: households });
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { name } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Household name is required." }, { status: 400 });
    }

    const code = nanoid(6);
    const household = await Household.create({ name: name.trim(), code });
    return NextResponse.json({ data: household }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
