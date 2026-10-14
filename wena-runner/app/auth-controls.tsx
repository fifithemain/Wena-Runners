"use client";

import { useAuth, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function AuthControls({ clerkConfigured }: { clerkConfigured: boolean }) {
  if (!clerkConfigured) {
    return (
      <>
        <Link href="/login">Log in</Link>
        <Link className="btn" href="/signup">
          Get started
        </Link>
      </>
    );
  }

  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;

  if (isSignedIn) {
    return <UserButton afterSignOutUrl="/" />;
  }

  return (
    <>
      <Link href="/login">Log in</Link>
      <Link className="btn" href="/signup">
        Get started
      </Link>
    </>
  );
}
