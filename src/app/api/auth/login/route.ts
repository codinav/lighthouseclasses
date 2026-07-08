import { NextResponse } from "next/server";

/**
 * POST /api/auth/login — demo endpoint showing the production contract.
 *
 * Production implementation (see docs/ARCHITECTURE.md):
 *  - Verify credentials against `users` (argon2id hash comparison)
 *  - Rate-limit by IP + email (5 attempts / 15 min)
 *  - Issue short-lived access JWT (15 min) + rotating refresh token (30 days)
 *    in httpOnly, Secure, SameSite=Lax cookies
 *  - Log the event to `auth_audit`
 */
export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Invalid JSON body." } }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: { code: "INVALID_EMAIL", message: "A valid email is required." } }, { status: 422 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." } }, { status: 401 });
  }

  const response = NextResponse.json({
    data: {
      user: { id: "usr_demo", name: email.split("@")[0], email, role: "student" },
    },
  });
  response.cookies.set("lh_session", "1", {
    httpOnly: false, // demo only — production uses an httpOnly signed JWT
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
