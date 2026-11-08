import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell" style={{ minHeight: "70vh", display: "grid", placeItems: "center", paddingBlock: 60 }}>
      <section className="panel" style={{ width: "min(100%, 560px)", padding: 36, textAlign: "center" }}>
        <p className="pill">404 · Page not found</p>
        <h1 style={{ margin: "16px 0 8px", fontFamily: "Sora, Arial, sans-serif", fontSize: "clamp(32px, 6vw, 48px)", letterSpacing: "-.06em" }}>Let’s get you back on track.</h1>
        <p className="muted">That page may have moved, or the address may be incorrect.</p>
        <Link className="btn" href="/" style={{ marginTop: 10 }}>Go to WENA Runners <span aria-hidden="true">→</span></Link>
      </section>
    </main>
  );
}
