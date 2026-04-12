import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Household } from "@/lib/models/Household";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: "Code is required." }, { status: 400 });

    const hh = await Household.findOne({ code: code.trim().toUpperCase() }).lean();
    if (!hh) return NextResponse.json({ error: "No household found with that code." }, { status: 404 });

    return NextResponse.json({ data: hh });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
