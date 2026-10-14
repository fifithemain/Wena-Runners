import Link from "next/link";
import SignupForm from "./signup-form";

export default function Signup() {
  const clerkConfigured = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );

  return (
    <main className="formwrap">
      <Link href="/" className="brand">
        WENA <span>RUNNERS</span>
      </Link>
      <section className="panel" style={{ marginTop: 24 }}>
        <h1>Create your account.</h1>
        <p className="muted">Request errands, earn as a Runner, or do both.</p>
        {clerkConfigured ? (
          <SignupForm />
        ) : (
          <p className="error">
            Clerk is not configured. Add the Clerk publishable and secret keys to the app environment.
          </p>
        )}
      </section>
    </main>
  );
}
