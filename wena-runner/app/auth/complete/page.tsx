"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function CompleteAuth() {
  const { signOut } = useClerk();
  const router = useRouter();
  const search = useSearchParams();
  const [message, setMessage] = useState("Checking your WENA account…");

  useEffect(() => {
    let active = true;
    (async () => {
      const flow = search.get("flow") === "signup" ? "signup" : "login";
      try {
        const response = await fetch("/api/auth/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ flow }),
          cache: "no-store",
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.profile) {
          await signOut();
          if (active) {
            setMessage("No WENA profile was found. Please create your WENA account first.");
            router.replace("/signup?notice=profile-required");
          }
          return;
        }
        if (active) router.replace("/jobs");
      } catch {
        await signOut();
        if (active) {
          setMessage("We couldn't verify your WENA profile. Please create an account or try again.");
          router.replace("/signup?notice=profile-required");
        }
      }
    })();
    return () => { active = false; };
  }, [router, search, signOut]);

  return <main className="formwrap"><section className="panel"><h1>Checking your account</h1><p className="muted">{message}</p></section></main>;
}

export default function AuthCompletePage() {
  return <Suspense fallback={<main className="formwrap"><section className="panel">Checking your WENA account…</section></main>}><CompleteAuth /></Suspense>;
}
