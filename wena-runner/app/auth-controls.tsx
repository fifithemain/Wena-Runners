"use client";

import { useAuth, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";

function SignedOutLinks() {
  return (
    <>
      <a href="#errands">Explore errands</a>
      <a href="#how">How it works</a>
      <Link href="/signup">Become a Runner</Link>
      <Link href="/login">Log in</Link>
      <Link className="btn" href="/signup">
        Get started
      </Link>
    </>
  );
}

function ClerkControls() {
  const { isLoaded, isSignedIn } = useAuth();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    let active = true;
    fetch("/api/jobs")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active) setRole(data?.profile?.role ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isSignedIn]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <SignedOutLinks />;

  return (
    <>
      <Link href="/jobs">My errands</Link>
      <Link href="/messages">Messages</Link>
      {(role === "runner" || role === "both") && <Link href="/earnings">Wallet</Link>}
      <Link href="/account">Account</Link>
      <Link className="btn" href="/jobs?post=1">
        Post an errand
      </Link>
      <UserButton afterSignOutUrl="/" />
    </>
  );
}

export default function AuthControls({ clerkConfigured }: { clerkConfigured: boolean }) {
  return clerkConfigured ? <ClerkControls /> : <SignedOutLinks />;
}
