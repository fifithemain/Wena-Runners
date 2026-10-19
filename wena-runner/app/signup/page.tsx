import Link from "next/link";
import SignupForm from "./signup-form";
import { RunnerScene } from "../landing-artwork";

export default function Signup() {
  const clerkConfigured = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );

  return (
    <main className="auth-layout">
      <aside className="auth-aside">
        <Link href="/" className="brand" aria-label="WENA Runners home">
          <span className="brand-symbol" aria-hidden="true">w</span>
          <span className="brand-wordmark">wena<span>runners</span></span>
        </Link>
        <div className="auth-aside-copy">
          <h2>Make room for what matters.</h2>
          <p>Ask for a hand nearby, or earn by helping your community.</p>
        </div>
        <div className="auth-scene"><RunnerScene /></div>
      </aside>
      <section className="panel auth-panel">
        <h1>Create your account.</h1>
        <p className="muted">Request errands, earn as a Runner, or do both.</p>
        {clerkConfigured ? (
          <SignupForm />
        ) : (
          <p className="error">
            Clerk is not configured. Add the Clerk publishable and secret keys to the app environment.
          </p>
        )}
        <p className="muted" style={{ marginTop: 18 }}><Link href="/demo">Explore the interactive demo</Link></p>
      </section>
    </main>
  );
}
