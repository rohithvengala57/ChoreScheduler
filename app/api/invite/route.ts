import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Invite } from "@/lib/models/Invite";
import { Household } from "@/lib/models/Household";
import { sendInviteEmail } from "@/lib/email";

// POST /api/invite — admin sends an invite
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    await connectDB();

    const { email } = await req.json();
    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const householdId = admin.householdId?.toString();
    if (!householdId) {
      return NextResponse.json({ error: "Admin has no household." }, { status: 400 });
    }

    const household = await Household.findById(householdId).lean() as { name: string } | null;
    if (!household) {
      return NextResponse.json({ error: "Household not found." }, { status: 404 });
    }

    // Revoke any existing pending invite for this email+household
    await Invite.deleteMany({ email: email.toLowerCase().trim(), householdId, status: "pending" });

    const token = randomUUID();
    const invite = await Invite.create({
      email: email.toLowerCase().trim(),
      householdId,
      token,
    });

    const { link } = await sendInviteEmail(email.trim(), token, household.name);

    return NextResponse.json({ data: invite, inviteLink: link });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}

// GET /api/invite — admin lists all invites for their household
export async function GET() {
  try {
    const admin = await requireAdmin();
    await connectDB();

    const invites = await Invite.find({ householdId: admin.householdId }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ data: invites });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}
