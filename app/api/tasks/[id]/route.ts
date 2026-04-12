import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Task } from "@/lib/models/Task";
import { Constraint } from "@/lib/models/Constraint";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const body = await req.json();
    const task = await Task.findByIdAndUpdate(
      params.id,
      {
        name: body.name,
        weight: Number(body.weight),
        frequency: Number(body.frequency),
        timeOfDay: body.timeOfDay,
      },
      { new: true, runValidators: true }
    );
    if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });
    return NextResponse.json({ data: task });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await connectDB();
  await Constraint.deleteMany({ taskId: params.id });
  await Task.findByIdAndDelete(params.id);
  return NextResponse.json({ data: { deleted: true } });
}
