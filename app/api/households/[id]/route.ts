import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Household } from "@/lib/models/Household";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  await connectDB();
  const hh = await Household.findById(params.id).lean();
  if (!hh) return NextResponse.json({ error: "Household not found." }, { status: 404 });
  return NextResponse.json({ data: hh });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const body = await req.json();
    const hh = await Household.findByIdAndUpdate(params.id, { name: body.name }, { new: true });
    if (!hh) return NextResponse.json({ error: "Household not found." }, { status: 404 });
    return NextResponse.json({ data: hh });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await connectDB();
  await Household.findByIdAndDelete(params.id);
  return NextResponse.json({ data: { deleted: true } });
}
