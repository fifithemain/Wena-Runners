import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function Login() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <main className="formwrap">
      <Link href="/" className="brand">
        WENA <span>RUNNERS</span>
      </Link>
      <section className="panel" style={{ marginTop: 24 }}>
        <h1>Welcome back.</h1>
        <p className="muted">Sign in to manage errands and your Runner wallet.</p>
        {clerkConfigured ? (
          <div style={{ marginTop: 20, minHeight: 360 }}>
            <SignIn
              routing="hash"
              signUpUrl="/signup"
              fallbackRedirectUrl="/"
              signUpFallbackRedirectUrl="/"
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
      </section>
    </main>
  );
}
