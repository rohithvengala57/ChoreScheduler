import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Person } from "@/lib/models/Person";
import { Constraint } from "@/lib/models/Constraint";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const body = await req.json();
    const person = await Person.findByIdAndUpdate(
      params.id,
      { name: body.name, color: body.color },
      { new: true, runValidators: true }
    );
    if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
    return NextResponse.json({ data: person });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await connectDB();
  // Cascade-delete constraints for this person
  await Constraint.deleteMany({ personId: params.id });
  await Person.findByIdAndDelete(params.id);
  return NextResponse.json({ data: { deleted: true } });
}
