import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Constraint } from "@/lib/models/Constraint";

// POST /api/constraints/[id]/approve — admin approves or rejects a constraint
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    await connectDB();

    const { action } = await req.json(); // "approve" | "reject"
    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Action must be approve or reject." }, { status: 400 });
    }

    const constraint = await Constraint.findOne({ _id: params.id, householdId: admin.householdId });
    if (!constraint) return NextResponse.json({ error: "Constraint not found." }, { status: 404 });

    constraint.status = action === "approve" ? "approved" : "rejected";
    await constraint.save();

    return NextResponse.json({ data: constraint });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}
