import Link from "next/link";
import AuthControls from "./auth-controls";

export default function Home() {
  const clerkConfigured = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );

  return (
    <main>
      <nav className="shell nav">
        <Link href="/" className="brand">
          WENA <span>RUNNERS</span>
        </Link>
        <div className="navlinks">
          <a href="#how">How it works</a>
          <Link href="/jobs">Errand board</Link>
          <AuthControls clerkConfigured={clerkConfigured} />
        </div>
      </nav>
      <section className="shell hero">
        <div>
          <span className="eyebrow">Your neighbourhood, in motion</span>
          <h1>
            Errands done.
            <br />
            Fair price. <span style={{ color: "var(--green)" }}>Your terms.</span>
          </h1>
          <p>
            Post what you need, set your budget, and negotiate directly with verified local Runners.
            No guesswork. No fixed tiers. Just people helping people.
          </p>
          <div className="actions">
            <Link className="btn lime" href="/jobs">
              Post an errand
            </Link>
            <Link className="btn ghost" href="/jobs">
              Explore the board
            </Link>
          </div>
          <p className="small">Secure hand-off PINs · Negotiable fares · Verified Runners</p>
        </div>
        <div className="hero-card">
          <span className="eyebrow" style={{ background: "#ffffff20", color: "white" }}>
            WENA v3 · Negotiable errands
          </span>
          <div>
            <div className="big">You agree.</div>
            <div className="big" style={{ color: "white" }}>
              We move.
            </div>
          </div>
          <p>Customers and Runners agree on a fair fare before a job is confirmed.</p>
        </div>
      </section>
      <section className="shell section" id="how">
        <h2>Built around trust, not guesswork.</h2>
        <p className="muted">Every step stays clear, from the first offer to the final hand-off.</p>
        <div className="cards">
          <article className="card">
            <h3>01 · Post your errand</h3>
            <p>
              Describe the task, add pickup and drop-off details, and set the budget you&apos;re
              comfortable with.
            </p>
          </article>
          <article className="card">
            <h3>02 · Agree a fare</h3>
            <p>
              Verified Runners can make offers. Compare prices and notes, then accept the one that
              works for you.
            </p>
          </article>
          <article className="card">
            <h3>03 · Confirm hand-off</h3>
            <p>Keep the hand-off PIN private until your errand is delivered. The PIN confirms completion.</p>
          </article>
        </div>
      </section>
      <section className="shell section">
        <div
          className="card"
          style={{
            background: "var(--lime)",
            border: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2>Know your neighbourhood?</h2>
            <p style={{ color: "var(--ink)" }}>
              Become a Runner and get paid for helping people nearby.
            </p>
          </div>
          <Link className="btn" href="/signup">
            Become a Runner
          </Link>
        </div>
      </section>
      <footer className="shell footer">
        <strong>WENA Runners</strong>
        <span>Local errands. Fair deals. Real people.</span>
        <span>© {new Date().getFullYear()} WENA</span>
      </footer>
    </main>
  );
}
