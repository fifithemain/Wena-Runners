"use client";

import { useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { useState } from "react";

type WorkspaceSection = "jobs" | "messages" | "account" | "earnings";

function SignOutButton({ onError }: { onError: (message: string) => void }) {
  const { signOut } = useClerk();
  return (
    <button className="workspace-signout" type="button" onClick={async () => {
      try {
        await signOut({ redirectUrl: "/" });
      } catch (cause) {
        onError(cause instanceof Error ? cause.message : "Could not sign out. Please try again.");
      }
    }}>
      Sign out
    </button>
  );
}

export default function WorkspaceShell({
  active,
  role,
  name,
  signedIn,
  children,
}: {
  active: WorkspaceSection;
  role?: string;
  name?: string;
  signedIn?: boolean;
  children: React.ReactNode;
}) {
  const [error, setError] = useState("");
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const hasSession = signedIn ?? Boolean(name || role);
  const displayName = name || "Your account";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "W";
  const links: { id: WorkspaceSection; label: string; icon: string }[] = [
    { id: "jobs", label: role === "runner" ? "Runner marketplace" : role === "both" ? "Errand workspace" : "My errands", icon: "▤" },
    { id: "messages", label: "Messages", icon: "◌" },
    { id: "account", label: "Account", icon: "◎" },
    ...(role === "runner" || role === "both"
      ? [{ id: "earnings" as const, label: "Runner wallet", icon: "R" }]
      : []),
  ];

  return (
    <main className="workspace-app">
      <header className="workspace-header">
        <Link href="/" className="brand" aria-label="WENA Runners home">
          <span className="brand-symbol" aria-hidden="true">w</span>
          <span className="brand-wordmark">wena<span>runners</span></span>
        </Link>
        <div className="workspace-user">
          <span className="workspace-avatar" aria-hidden="true">{initials}</span>
          <span className="workspace-user-copy">
            <strong>{displayName}</strong>
            <small>{role ? role.replaceAll("_", " ") : "WENA account"}</small>
          </span>
          {clerkConfigured && hasSession
            ? <SignOutButton onError={setError} />
            : <Link className="workspace-signout" href="/login">Sign in</Link>}
        </div>
      </header>
      {error && <p className="error workspace-shell-error" role="alert">{error}</p>}
      <div className="workspace-layout">
        <nav className="workspace-sidebar" aria-label="Workspace">
          <p className="workspace-nav-label">WORKSPACE</p>
          {links.map((link) => (
            <Link
              key={link.id}
              href={link.id === "jobs" ? "/jobs" : `/${link.id}`}
              className={`workspace-nav-item${active === link.id ? " selected" : ""}`}
              aria-current={active === link.id ? "page" : undefined}
            >
              <span aria-hidden="true">{link.icon}</span>{link.label}
            </Link>
          ))}
        </nav>
        <section className="workspace-content">{children}</section>
      </div>
    </main>
  );
}
