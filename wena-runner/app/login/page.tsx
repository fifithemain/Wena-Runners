import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function Login() {
  const clerkConfigured = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
  );

  return (
    <main className="formwrap">
      <Link href="/" className="brand">
        WENA <span>RUNNERS</span>
      </Link>
      <section className="panel" style={{ marginTop: 24 }}>
        <h1>Welcome back.</h1>
        {clerkConfigured ? (
          <SignIn routing="hash" signUpUrl="/signup" />
        ) : (
          <p className="error">
            Clerk is not configured. Add the Clerk publishable and secret keys to the app environment.
          </p>
        )}
      </section>
    </main>
  );
}
