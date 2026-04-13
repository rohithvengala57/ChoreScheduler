import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "./db";
import { User, IUser } from "./models/User";

const JWT_SECRET = process.env.JWT_SECRET || "chore-scheduler-dev-secret-change-in-prod";
const COOKIE_NAME = "auth_token";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface JWTPayload {
  userId: string;
  email: string;
  role: "admin" | "member";
  householdId: string | null;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: MAX_AGE });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/** Read & verify the auth cookie on the server. Returns null if missing/invalid. */
export async function getSessionUser(): Promise<(IUser & { _id: string }) | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    await connectDB();
    const user = await User.findById(payload.userId).lean() as (IUser & { _id: string }) | null;
    if (!user || user.status !== "active") return null;
    return user;
  } catch {
    return null;
  }
}

/** Require an authenticated, active user. Throws a Response on failure. */
export async function requireAuth(): Promise<IUser & { _id: string }> {
  const user = await getSessionUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorised" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

/** Require the user to be an admin. Throws a Response on failure. */
export async function requireAdmin(): Promise<IUser & { _id: string }> {
  const user = await requireAuth();
  if (user.role !== "admin") {
    throw new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

export function cookieOptions(maxAge = MAX_AGE) {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
