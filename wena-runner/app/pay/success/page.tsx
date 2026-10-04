"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function PaySuccessInner() {
  const params = useSearchParams();
  const jobId = params.get("job");
  const [pin, setPin] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    if (!jobId) {
      setWaiting(false);
      return;
    }
    let tries = 0;
    const tick = async () => {
      tries++;
      const res = await fetch(`/api/jobs/pin?jobId=${jobId}`);
      if (res.ok) {
        const data = await res.json();
        setPin(data.collectionPin);
        setWaiting(false);
        return;
      }
      if (tries < 8) setTimeout(tick, 1500);
      else setWaiting(false);
    };
    tick();
  }, [jobId]);

  return (
    <main style={{ minHeight: "100vh", background: "#F1E9D2", color: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 380, textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#FFBD59", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 26 }}>✓</div>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Payment received</h1>
        <p style={{ fontSize: 14, color: "#6b6455", marginBottom: 20 }}>
          Your request is now live on the Runner board.
        </p>

        {waiting && <p style={{ fontSize: 13, color: "#6b6455" }}>Confirming with Yoco...</p>}

        {!waiting && pin && (
          <div style={{ padding: 16, background: "#fff", border: "2px solid #1A1A1A", marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>YOUR HAND-OFF PIN</p>
            <p style={{ fontFamily: "Anton, sans-serif", fontSize: 32 }}>{pin}</p>
            <p style={{ fontSize: 12, color: "#6b6455" }}>
              Only give this to your Runner once you've received your order.
            </p>
          </div>
        )}

        {!waiting && !pin && (
          <p style={{ fontSize: 13, color: "#6b6455", marginBottom: 20 }}>
            Still confirming your payment — check your WhatsApp shortly for your hand-off PIN.
          </p>
        )}

        <Link href="/" style={{ fontWeight: 700, textDecoration: "underline" }}>Back to home</Link>
      </div>
    </main>
  );
}

export default function PaySuccess() {
  return (
    <Suspense fallback={null}>
      <PaySuccessInner />
    </Suspense>
  );
}
