import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Constraint } from "@/lib/models/Constraint";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await connectDB();
  await Constraint.findByIdAndDelete(params.id);
  return NextResponse.json({ data: { deleted: true } });
}
