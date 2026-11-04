"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next";

const CONSENT_KEY = "wena-cookie-consent";

export default function CookieConsent() {
  const [choice, setChoice] = useState<"accepted" | "essential" | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setChoice(window.localStorage.getItem(CONSENT_KEY) as "accepted" | "essential" | null);
    setReady(true);
  }, []);

  function choose(value: "accepted" | "essential") {
    window.localStorage.setItem(CONSENT_KEY, value);
    setChoice(value);
  }

  if (!ready) return null;
  return (
    <>
      {choice === "accepted" && <Analytics />}
      {choice === null && (
        <aside aria-label="Cookie preferences" style={{ position: "fixed", zIndex: 100, inset: "auto 16px 16px", margin: "auto", maxWidth: 760, padding: 20, border: "1px solid #dce9e3", borderRadius: 16, background: "#fff", color: "#102f38", boxShadow: "0 14px 40px rgba(16,47,56,.2)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 18 }}>
            <div style={{ flex: "1 1 340px" }}>
              <strong style={{ fontFamily: "Sora, Arial, sans-serif" }}>Your privacy choices</strong>
              <p style={{ margin: "6px 0 0", color: "#35535a", fontSize: 13, lineHeight: 1.5 }}>Essential storage keeps sign-in and security working. With your permission, we also use Vercel Analytics to understand site visits. You can choose essential only.</p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button type="button" onClick={() => choose("essential")} style={{ minHeight: 42, padding: "9px 13px", border: "1px solid #bfd8ca", borderRadius: 10, background: "#fff", color: "#064c39", fontWeight: 700 }}>Essential only</button>
              <button type="button" onClick={() => choose("accepted")} style={{ minHeight: 42, padding: "9px 13px", border: 0, borderRadius: 10, background: "#008b57", color: "#fff", fontWeight: 700 }}>Accept analytics</button>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
