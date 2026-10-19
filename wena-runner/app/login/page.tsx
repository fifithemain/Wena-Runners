import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { RunnerScene } from "../landing-artwork";

export default function Login() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <main className="auth-layout">
      <aside className="auth-aside">
        <Link href="/" className="brand" aria-label="WENA Runners home">
          <span className="brand-symbol" aria-hidden="true">w</span>
          <span className="brand-wordmark">wena<span>runners</span></span>
        </Link>
        <div className="auth-aside-copy">
          <h2>Your time, back in your hands.</h2>
          <p>Get your errands done with trusted local Runners.</p>
        </div>
        <div className="auth-scene"><RunnerScene /></div>
      </aside>
      <section className="panel auth-panel">
        <h1>Welcome back.</h1>
        <p className="muted">Sign in to manage errands, Runner offers, and your account.</p>
        {clerkConfigured ? (
          <div style={{ marginTop: 20, minHeight: 360 }}>
            <SignIn
              routing="hash"
              signUpUrl="/signup"
              fallbackRedirectUrl="/auth/complete?flow=login"
              signUpFallbackRedirectUrl="/auth/complete?flow=signup"
              appearance={{
                elements: {
                  rootBox: { width: "100%" },
                  card: { boxShadow: "none", border: "none", background: "transparent", width: "100%" },
                },
              }}
            />
          </div>
        ) : (
          <p className="error">
            Sign-in is temporarily unavailable because authentication is not configured.
          </p>
        )}
        <p className="muted" style={{ marginTop: 20 }}>
          New to WENA Runners? <Link href="/signup">Create an account</Link>
        </p>
        <p className="muted"><Link href="/demo">Explore the interactive demo</Link></p>
      </section>
    </main>
  );
}
