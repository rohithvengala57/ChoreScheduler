import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { Household } from "@/lib/models/Household";
import { Invite } from "@/lib/models/Invite";
import { signToken, cookieOptions } from "@/lib/auth";
import { nanoid } from "@/app/api/households/helpers";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { name, email, password, inviteToken } = await req.json();

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return NextResponse.json({ error: "Email already registered." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Invite-based signup: member joining via invite link
    if (inviteToken) {
      const invite = await Invite.findOne({ token: inviteToken, status: "pending" });
      if (!invite) {
        return NextResponse.json({ error: "Invalid or expired invite link." }, { status: 400 });
      }

      const user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role: "member",
        householdId: invite.householdId,
        status: "pending", // admin must approve
      });

      await Invite.findByIdAndUpdate(invite._id, { status: "accepted" });

      const token = signToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        householdId: user.householdId?.toString() ?? null,
      });

      const res = NextResponse.json({ data: { _id: user._id, name: user.name, email: user.email, role: user.role, status: user.status } });
      res.cookies.set({ ...cookieOptions(), value: token });
      return res;
    }

    // Direct signup: creates a new household and becomes admin
    const code = nanoid(6);
    const household = await Household.create({ name: `${name.trim()}'s Household`, code });

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: "admin",
      householdId: household._id,
      status: "active",
    });

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      householdId: household._id.toString(),
    });

    const res = NextResponse.json({
      data: { _id: user._id, name: user.name, email: user.email, role: user.role, householdId: household._id, householdCode: household.code },
    });
    res.cookies.set({ ...cookieOptions(), value: token });
    return res;
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}
