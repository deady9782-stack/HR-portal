import { timingSafeEqual } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase-admin";

export const runtime = "nodejs";

type DiscordIdentity = {
  id: string;
  username: string;
  global_name?: string | null;
};

function redirectWithError(request: NextRequest, code: string) {
  const response = NextResponse.redirect(new URL(`/?authError=${code}`, request.url));
  response.cookies.set("discord_oauth_state", "", {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/api/auth/discord/callback",
    maxAge: 0,
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

function statesMatch(received: string, expected: string) {
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.has("error")) {
    return redirectWithError(request, "discord_cancelled");
  }

  const code = request.nextUrl.searchParams.get("code");
  const receivedState = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("discord_oauth_state")?.value;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!code || !receivedState || !expectedState || !statesMatch(receivedState, expectedState)) {
    return redirectWithError(request, "discord_failed");
  }
  if (!clientId || !clientSecret || !redirectUri) {
    return redirectWithError(request, "discord_not_configured");
  }

  try {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) return redirectWithError(request, "discord_failed");

    const tokenResult: { access_token?: string; token_type?: string } = await tokenResponse.json();
    if (!tokenResult.access_token || tokenResult.token_type?.toLowerCase() !== "bearer") {
      return redirectWithError(request, "discord_failed");
    }

    const identityResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenResult.access_token}` },
      cache: "no-store",
    });
    if (!identityResponse.ok) return redirectWithError(request, "discord_failed");
    const identity = await identityResponse.json() as DiscordIdentity;
    if (
      typeof identity.id !== "string"
      || !/^\d{17,20}$/.test(identity.id)
      || typeof identity.username !== "string"
      || !identity.username
    ) {
      return redirectWithError(request, "discord_failed");
    }

    const uid = `discord_${identity.id}`;
    const displayName = (
      typeof identity.global_name === "string" && identity.global_name
        ? identity.global_name
        : identity.username
    ).slice(0, 80);
    const auth = getAdminAuth();
    let account;
    try {
      account = await auth.getUser(uid);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "auth/user-not-found") {
        account = await auth.createUser({ uid, displayName });
      } else {
        throw error;
      }
    }

    const firestore = getAdminFirestore();
    const profileRef = firestore.collection("users").doc(uid);
    const profile = await profileRef.get();
    const profileData = {
      discordId: identity.id,
      displayName,
      lastSignInAt: FieldValue.serverTimestamp(),
    };
    if (profile.exists) {
      await profileRef.set(profileData, { merge: true });
    } else {
      await profileRef.set({
        ...profileData,
        staffStatus: "applicant",
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    const customToken = await auth.createCustomToken(uid, {
      ...account.customClaims,
      discordId: identity.id,
    });
    const response = NextResponse.redirect(new URL("/auth/complete", request.url));
    response.cookies.set("discord_oauth_state", "", {
      httpOnly: true,
      secure: new URL(redirectUri).protocol === "https:",
      sameSite: "lax",
      path: "/api/auth/discord/callback",
      maxAge: 0,
    });
    response.cookies.set("discord_firebase_token", customToken, {
      httpOnly: true,
      secure: new URL(redirectUri).protocol === "https:",
      sameSite: "lax",
      path: "/api/auth/discord/token",
      maxAge: 60,
    });
    return response;
  } catch (error) {
    console.error("Discord authentication callback failed:", error);
    return redirectWithError(request, "discord_failed");
  }
}
