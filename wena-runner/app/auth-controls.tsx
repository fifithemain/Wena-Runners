"use client";

import { useAuth, UserButton } from "@clerk/nextjs";
import Link from "next/link";

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
  if (!isLoaded) return null;
  if (!isSignedIn) return <SignedOutLinks />;

  return (
    <>
      <Link href="/jobs">My errands</Link>
      <Link href="/messages">Messages</Link>
      <Link href="/earnings">Wallet</Link>
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
