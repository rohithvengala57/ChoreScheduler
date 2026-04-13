import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Constraint } from "@/lib/models/Constraint";

// GET /api/constraints/pending — admin sees constraints awaiting approval
export async function GET() {
  try {
    const admin = await requireAdmin();
    await connectDB();

    const pending = await Constraint.find({
      householdId: admin.householdId,
      status: "pending",
    }).sort({ createdAt: 1 }).lean();

    return NextResponse.json({ data: pending });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}
