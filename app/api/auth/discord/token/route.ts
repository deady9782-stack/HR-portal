import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const expectedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  let originHost: string | undefined;
  try {
    originHost = origin ? new URL(origin).host : undefined;
  } catch {
    originHost = undefined;
  }
  if (!originHost || !expectedHost || originHost !== expectedHost) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const token = request.cookies.get("discord_firebase_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "The Discord sign-in session expired. Please try again." }, { status: 401 });
  }

  const response = NextResponse.json({ token }, {
    headers: { "Cache-Control": "no-store, private" },
  });
  response.cookies.set("discord_firebase_token", "", {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "strict",
    path: "/api/auth/discord/token",
    maxAge: 0,
  });
  return response;
}
