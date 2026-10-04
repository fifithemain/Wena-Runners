"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./landing.css";
import { TIERS, COURIER_FEE, totalForTier, PARTNER_STORES, STORE_PRESETS, TierKey, FulfillmentType } from "@/lib/tiers";

type Step = 1 | 2 | 3 | "success";

const FAQ = [
  {
    q: "Do I need to pay the store myself first?",
    a: "Yes — you pay the store directly (in person, by transfer, or however they take payment) and keep the receipt or slip. WENA only charges the Runner's service fee, never the price of your goods.",
  },
  {
    q: "What if nobody claims my request?",
    a: "Runners who know your store see it on the board. If nothing happens after a while, message us on WhatsApp and we'll chase it.",
  },
  {
    q: "Is my slip and address safe?",
    a: "Your payment slip, phone number, and drop-off details only unlock once a specific Runner has claimed your job, not before.",
  },
];

export default function Home() {
  const [step, setStep] = useState<Step>(1);
  const [store, setStore] = useState<string>(STORE_PRESETS[0]);
  const [storeOther, setStoreOther] = useState("");
  const [item, setItem] = useState("");
  const [tier, setTier] = useState<TierKey>("small");
  const [slip, setSlip] = useState<File | null>(null);
  const [fulfil, setFulfil] = useState<FulfillmentType>("delivery");
  const [landmark, setLandmark] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showSticky, setShowSticky] = useState(false);
  const [live, setLive] = useState<{ store_name: string; shopper_fee: number }[] | null>(null);
  const [pinForCustomer, setPinForCustomer] = useState<string | null>(null);

  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const storeName = store === "Other" ? storeOther.trim() : store;
  const partnerUrl = PARTNER_STORES.find((s) => s.name === store)?.url;
  const total = totalForTier(tier, fulfil);

  useEffect(() => {
    fetch("/api/board-preview")
      .then((r) => r.json())
      .then((d) => setLive(d.jobs || []))
      .catch(() => setLive([]));
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const el = document.getElementById("wizard");
      if (el) setShowSticky(el.getBoundingClientRect().top < 0);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  function next() {
    setError(null);
    if (step === 1) {
      if (!storeName || !item.trim()) {
        setError("Pick a store and describe your order.");
        return;
      }
      if (!slip) {
        setError("Upload your proof of payment to the store.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!name.trim() || !phone.trim() || (fulfil === "delivery" && !landmark.trim())) {
        setError("Please fill in your details.");
        return;
      }
      setStep(3);
    }
  }

  function back() {
    setError(null);
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  }

  function pinLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError("Couldn't get your location. The landmark is enough."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("customerName", name.trim());
      form.append("customerPhone", phone.trim());
      form.append("storeName", storeName);
      form.append("itemNote", item.trim());
      form.append("tier", tier);
      form.append("fulfillmentType", fulfil);
      form.append("deliveryLandmark", landmark.trim());
      if (coords) {
        form.append("deliveryLat", String(coords.lat));
        form.append("deliveryLng", String(coords.lng));
      }
      if (slip) form.append("slip", slip);

      const res = await fetch("/api/request", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setPinForCustomer(data.collectionPin || null);
      setStep("success");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const stepNum = step === "success" ? 4 : step;

  return (
    <div className="landing">
      <nav className="wrap">
        <div className="wordmark">
          WENA <span>RUNNER</span>
        </div>
        <div className="navright">
          <a href="#runners">Become a Runner</a>
          <Link href="/login" style={{ textDecoration: "underline" }}>Runner login</Link>
        </div>
      </nav>

      <section className="hero wrap">
        <h1>Already paid the store? We'll send someone to fetch it.</h1>
        <p>
          Pay the store directly and upload your slip. A Runner nearby collects it using your
          proof of payment and hands it off to you or a WENA courier.
        </p>
        <div className="cta-row">
          <button className="btn-primary" onClick={() => scrollTo("wizard")}>Request a collection</button>
          <button className="link-secondary" onClick={() => scrollTo("runners")}>Rather earn than spend?</button>
        </div>
        <p className="microtrust">No app to download. You only ever pay WENA the service fee.</p>

        <div className="tagfield">
          <div className="tag tag1">1–5 items<span className="amt">R{TIERS.small.runnerCut}</span></div>
          <div className="tag tag2">6–10 items<span className="amt">R{TIERS.medium.runnerCut}</span></div>
          <div className="tag tag3">Heavy items<span className="amt">R{TIERS.heavy.runnerCut}</span></div>
        </div>
        <p className="microtrust" style={{ marginTop: 8 }}>+R{COURIER_FEE} if you want it delivered rather than collecting yourself.</p>
      </section>

      <div className="wrap">
        <div className="livepanel">
          <div className="livehead"><span className="dot" /> Open on the board right now</div>
          {live === null && <div className="empty-live">Loading...</div>}
          {live && live.length === 0 && (
            <div className="empty-live">Nothing open yet. Post the first request below.</div>
          )}
          {live && live.map((j, i) => (
            <div className="row" key={i}>
              <span>{j.store_name}</span>
              <span className="fee">R{j.shopper_fee}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="wrap">
        <div className="wizard" id="wizard">
          {step !== "success" && (
            <div className="steps-tab">
              {[1, 2, 3].map((n) => (
                <div key={n} className={`steptab ${stepNum === n ? "active" : stepNum > n ? "done" : ""}`}>{n}</div>
              ))}
            </div>
          )}

          {step === 1 && (
            <div>
              <h3>What did you buy?</h3>
              <p className="stephint">Pick the store you paid, then upload your proof of payment.</p>
              <div className="field">
                <label>Which store?</label>
                <div className="chiprow">
                  {STORE_PRESETS.map((s) => (
                    <button type="button" key={s} className={`chip ${store === s ? "selected" : ""}`} onClick={() => setStore(s)}>{s}</button>
                  ))}
                </div>
                {partnerUrl && (
                  <a href={partnerUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 10, fontSize: 13, fontWeight: 600, textDecoration: "underline" }}>
                    See {store} on Facebook
                  </a>
                )}
                {store === "Other" && (
                  <input value={storeOther} onChange={(e) => setStoreOther(e.target.value)} placeholder="Name of the store" style={{ marginTop: 10 }} />
                )}
              </div>
              <div className="field">
                <label>What did you order</label>
                <textarea rows={2} value={item} onChange={(e) => setItem(e.target.value)} placeholder="e.g. 2 bags of maize meal, 1 case of cooldrink" />
              </div>
              <div className="field">
                <label>Proof of payment</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setSlip(e.target.files?.[0] || null)}
                />
                <p style={{ fontSize: 12, color: "#7a7364", marginTop: 6 }}>
                  A photo of your receipt, slip, or transfer confirmation. Only unlocked by the Runner who collects your order.
                </p>
              </div>
              <div className="field">
                <label>How many items?</label>
                <div className="tiergrid">
                  {(Object.entries(TIERS) as [TierKey, (typeof TIERS)[TierKey]][]).map(([k, t]) => (
                    <button type="button" key={k} className={`tierchip ${tier === k ? "selected" : ""}`} onClick={() => setTier(k)}>
                      {t.label}<span className="amt">R{t.runnerCut}</span>
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="fielderr">{error}</p>}
              <div className="stepnav"><span /><button className="btn-primary" onClick={next}>Continue</button></div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3>How should it reach you?</h3>
              <p className="stephint">Choose delivery or self-collect, then leave your details.</p>
              <div className="field">
                <div className="fulfilgrid">
                  <button type="button" className={`chip ${fulfil === "delivery" ? "selected" : ""}`} style={{ padding: 12 }} onClick={() => setFulfil("delivery")}>Deliver to me (+R{COURIER_FEE})</button>
                  <button type="button" className={`chip ${fulfil === "pickup" ? "selected" : ""}`} style={{ padding: 12 }} onClick={() => setFulfil("pickup")}>I'll collect from the Runner</button>
                </div>
              </div>
              {fulfil === "delivery" && (
                <div className="field">
                  <label>Landmark or address</label>
                  <input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="e.g. Blue gate, next to Ngangelizwe taxi rank" />
                  <button type="button" className="pinbtn" onClick={pinLocation}>
                    {coords ? "Location pinned (tap to update)" : "Add my current location too"}
                  </button>
                </div>
              )}
              <div className="field"><label>Your name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nomsa Dlamini" /></div>
              <div className="field"><label>Your phone number</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="071 234 5678" /></div>
              {error && <p className="fielderr">{error}</p>}
              <div className="stepnav">
                <button className="btn-ghost" onClick={back}>Back</button>
                <button className="btn-primary" onClick={next}>Review</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3>Confirm your request</h3>
              <div className="review-line"><span>Store</span><span>{storeName}</span></div>
              <div className="review-line"><span>Order</span><span>{item}</span></div>
              <div className="review-line"><span>Size</span><span>{TIERS[tier].label}</span></div>
              <div className="review-line"><span>Fulfilment</span><span>{fulfil === "delivery" ? "Delivery" : "Self-collect"}</span></div>
              <div className="review-total"><span>Service fee</span><span className="amt">R{total}</span></div>
              <p style={{ fontSize: 12, color: "#7a7364" }}>This is the Runner + courier fee only — not the price of your goods, which you've already paid the store.</p>
              {error && <p className="fielderr">{error}</p>}
              <div className="stepnav">
                <button className="btn-ghost" onClick={back}>Back</button>
                <button className="btn-primary" onClick={submit} disabled={submitting}>{submitting ? "Sending..." : "Continue to payment"}</button>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="success">
              <div className="checkmark">✓</div>
              <h3>Request sent</h3>
              <p>A Runner who knows {storeName} can now pick it up.</p>
              {pinForCustomer && (
                <div style={{ marginTop: 16, padding: 16, background: "#faf6ea", border: "2px solid #1A1A1A" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>YOUR HAND-OFF PIN</p>
                  <p style={{ fontFamily: "var(--font-anton)", fontSize: 32 }}>{pinForCustomer}</p>
                  <p style={{ fontSize: 12, color: "#7a7364" }}>
                    Only give this to your Runner once you've actually received your order — it's how they confirm the job and get paid.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="wrap faq">
        {FAQ.map((f, i) => (
          <div key={i} className={`faqitem ${openFaq === i ? "open" : ""}`}>
            <button className="faqq" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
              {f.q} <span>{openFaq === i ? "–" : "+"}</span>
            </button>
            <div className="faqa">{f.a}</div>
          </div>
        ))}
      </div>

      <div className="runnerstrip" id="runners">
        <div className="wrap">
          <h2>Already at the shops most days?</h2>
          <p>Collect pre-paid orders and get paid — no capital of your own needed. Sign up, get verified, and start claiming jobs.</p>
          <Link href="/signup"><button className="btn-gold">Become a Runner</button></Link>
        </div>
      </div>

      <footer className="wrap">WENA Runner Network. We go the extra mile for you.</footer>

      {whatsapp && (
        <a className="fab" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><path d="M17.6 6.3A8.9 8.9 0 0 0 12.1 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2a9 9 0 0 0 4.5 1.2h0a9 9 0 0 0 5.5-16.7zM12.1 19.6a7.5 7.5 0 0 1-3.8-1l-.3-.2-2.8.7.7-2.7-.2-.3a7.5 7.5 0 1 1 6.4 3.5zm4.1-5.6c-.2-.1-1.3-.7-1.5-.7s-.4-.1-.5.1-.6.7-.7.9-.3.2-.5.1a6.1 6.1 0 0 1-1.8-1.1 6.8 6.8 0 0 1-1.2-1.6c-.1-.2 0-.4.1-.5l.4-.4a1.6 1.6 0 0 0 .2-.4.4.4 0 0 0 0-.4c-.1-.1-.5-1.2-.7-1.7s-.4-.4-.5-.4h-.4a.9.9 0 0 0-.6.3 2.7 2.7 0 0 0-.8 2 4.6 4.6 0 0 0 1 2.5 10.6 10.6 0 0 0 4.1 3.6c.6.2 1 .4 1.4.5a3.3 3.3 0 0 0 1.5.1 2.5 2.5 0 0 0 1.6-1.1 2 2 0 0 0 .1-1.1c0-.1-.2-.2-.4-.3z" /></svg>
        </a>
      )}

      <div className={`stickybar ${showSticky ? "show" : ""}`}>
        <button onClick={() => scrollTo("wizard")}>Request a collection</button>
      </div>
    </div>
  );
}
