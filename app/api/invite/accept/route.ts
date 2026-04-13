import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Invite } from "@/lib/models/Invite";
import { Household } from "@/lib/models/Household";

// GET /api/invite/accept?token=XYZ — validate token, return invite + household info
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Token required." }, { status: 400 });

    const invite = await Invite.findOne({ token }).lean() as { householdId: string; email: string; status: string } | null;
    if (!invite || invite.status === "rejected") {
      return NextResponse.json({ error: "Invalid or expired invite." }, { status: 404 });
    }
    if (invite.status === "approved") {
      return NextResponse.json({ error: "This invite has already been used." }, { status: 409 });
    }

    const household = await Household.findById(invite.householdId).lean() as { name: string; code: string } | null;
    return NextResponse.json({ data: { email: invite.email, householdName: household?.name, status: invite.status } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}
