"use client";

import { signInWithCustomToken } from "firebase/auth";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase";

export default function CompleteDiscordSignIn() {
  const started = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function finishSignIn() {
      try {
        const response = await fetch("/api/auth/discord/token", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        });
        const result = await response.json() as { token?: string; error?: string };
        if (!response.ok || !result.token) {
          throw new Error(result.error || "Discord sign-in could not be completed.");
        }
        await signInWithCustomToken(getFirebaseServices().auth, result.token);
        window.location.replace("/");
      } catch (signInError) {
        setError(signInError instanceof Error ? signInError.message : "Discord sign-in could not be completed.");
      }
    }

    void finishSignIn();
  }, []);

  return (
    <main className="setup-page">
      <section className="setup-card">
        <div className="brand-mark">D</div>
        <p className="eyebrow">DISCORD AUTHENTICATION</p>
        <h1>{error ? "Sign-in could not be completed" : "Finishing secure sign-in"}</h1>
        <p>{error || "Discord account connected. Preparing your personnel workspace…"}</p>
        {error && <Link className="primary-button" href="/">Return to sign in</Link>}
      </section>
    </main>
  );
}
