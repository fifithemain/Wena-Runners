import Link from "next/link";

export default function PayCancelled() {
  return (
    <main style={{ minHeight: "100vh", background: "#F1E9D2", color: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 380, textAlign: "center" }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Payment not completed</h1>
        <p style={{ fontSize: 14, color: "#6b6455", marginBottom: 20 }}>
          No charge was made. You can try requesting again whenever you're ready.
        </p>
        <Link href="/" style={{ fontWeight: 700, textDecoration: "underline" }}>Back to home</Link>
      </div>
    </main>
  );
}
