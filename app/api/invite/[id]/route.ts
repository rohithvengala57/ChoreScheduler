import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Invite } from "@/lib/models/Invite";
import { User } from "@/lib/models/User";

// POST /api/invite/[id] — admin approves or rejects a pending invite
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    await connectDB();

    const { action } = await req.json(); // "approve" | "reject"
    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Action must be approve or reject." }, { status: 400 });
    }

    const invite = await Invite.findOne({ _id: params.id, householdId: admin.householdId });
    if (!invite) return NextResponse.json({ error: "Invite not found." }, { status: 404 });

    if (action === "approve") {
      invite.status = "approved";
      await invite.save();

      // Activate the user who accepted this invite
      await User.findOneAndUpdate(
        { email: invite.email, householdId: admin.householdId },
        { status: "active" }
      );
    } else {
      invite.status = "rejected";
      await invite.save();
    }

    return NextResponse.json({ data: invite });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}
