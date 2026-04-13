import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      householdId: user.householdId,
    },
  });
}
