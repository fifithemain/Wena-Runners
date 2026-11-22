"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next";

const CONSENT_KEY = "wena-cookie-consent";
type Choice = "accepted" | "essential" | "referrals";

export default function CookieConsent() {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [ready, setReady] = useState(false);
  const [pendingReferral, setPendingReferral] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(CONSENT_KEY);
    setChoice(stored === "essential" ? "essential" : stored === "referrals" ? "referrals" : stored === "accepted" ? "accepted" : null);
    setPendingReferral(new URLSearchParams(window.location.search).has("wena_ref"));
    setReady(true);
  }, []);

  function clearReferralQuery() {
    const url = new URL(window.location.href);
    url.searchParams.delete("wena_ref");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    setPendingReferral(false);
  }

  function choose(value: Choice) {
    window.localStorage.setItem(CONSENT_KEY, value);
    if (value === "referrals") {
      document.cookie = "wena-referral-consent=granted; Path=/; Max-Age=31536000; SameSite=Lax" + (window.location.protocol === "https:" ? "; Secure" : "");
      const referralCode = new URLSearchParams(window.location.search).get("wena_ref");
      if (referralCode) {
        fetch("/api/marketing/attribution/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: referralCode }) })
          .then((response) => { if (response.ok) clearReferralQuery(); })
          .catch(() => undefined);
      } else {
        setPendingReferral(false);
      }
    } else {
      document.cookie = "wena-referral-consent=; Path=/; Max-Age=0; SameSite=Lax";
      document.cookie = "wena-referral-visitor=; Path=/; Max-Age=0; SameSite=Lax";
      clearReferralQuery();
    }
    setChoice(value);
  }

  if (!ready) return null;
  return (
    <>
      {choice !== null && choice !== "essential" && <Analytics />}
      {(choice === null || pendingReferral) && (
        <aside aria-label="Cookie preferences" style={{ position: "fixed", zIndex: 100, inset: "auto 16px 16px", margin: "auto", maxWidth: 800, padding: 20, border: "1px solid #dce9e3", borderRadius: 16, background: "#fff", color: "#102f38", boxShadow: "0 14px 40px rgba(16,47,56,.2)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 18 }}>
            <div style={{ flex: "1 1 340px" }}>
              <strong style={{ fontFamily: "Sora, Arial, sans-serif" }}>Your privacy choices</strong>
              <p style={{ margin: "6px 0 0", color: "#35535a", fontSize: 13, lineHeight: 1.5 }}>Essential storage keeps sign-in and security working. Optional analytics help us understand site visits. If you also allow referral measurement, WENA can remember which partner link brought you here for up to 30 days. We do not store your IP address for this attribution.</p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button type="button" onClick={() => choose("essential")} style={{ minHeight: 42, padding: "9px 13px", border: "1px solid #bfd8ca", borderRadius: 10, background: "#fff", color: "#064c39", fontWeight: 700 }}>Essential only</button>
              <button type="button" onClick={() => choose("accepted")} style={{ minHeight: 42, padding: "9px 13px", border: "1px solid #bfd8ca", borderRadius: 10, background: "#fff", color: "#064c39", fontWeight: 700 }}>Analytics only</button>
              <button type="button" onClick={() => choose("referrals")} style={{ minHeight: 42, padding: "9px 13px", border: 0, borderRadius: 10, background: "#008b57", color: "#fff", fontWeight: 700 }}>Allow referral measurement</button>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
