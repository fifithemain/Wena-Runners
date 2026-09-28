"use client";

import { useState } from "react";
import Link from "next/link";
import { TIERS, COURIER_FEE, STORE_PRESETS, TierKey, FulfillmentType } from "@/lib/tiers";

export default function RequestPage() {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [storeChoice, setStoreChoice] = useState(STORE_PRESETS[0]);
  const [storeOther, setStoreOther] = useState("");
  const [storeNote, setStoreNote] = useState("");
  const [itemNote, setItemNote] = useState("");
  const [tier, setTier] = useState<TierKey>("small");
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>("delivery");
  const [landmark, setLandmark] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const storeName = storeChoice === "Other" ? storeOther : storeChoice;
  const totalPrice = TIERS[tier].fee + (fulfillmentType === "delivery" ? COURIER_FEE : 0);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          storeName,
          storeNote,
          itemNote,
          tier,
          fulfillmentType,
          deliveryLandmark: landmark,
          deliveryLat: coords?.lat,
          deliveryLng: coords?.lng,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setResult({
        ok: true,
        message: "Request sent! A Runner near that store will pick it up shortly.",
      });
      setCustomerName("");
      setCustomerPhone("");
      setItemNote("");
      setLandmark("");
      setCoords(null);
    } catch (err: any) {
      setResult({ ok: false, message: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-asphalt text-bone px-6 py-12">
      <div className="mx-auto max-w-lg">
        <Link href="/" className="text-sm text-bone/50 underline underline-offset-4">
          &larr; Back
        </Link>
        <h1 className="font-display text-4xl mt-4 mb-2">Request a delivery</h1>
        <p className="font-body text-bone/60 mb-8">
          Tell us what you need and from where. A Runner familiar with that
          store will pick it up.
        </p>

        <form onSubmit={submit} className="space-y-6">
          <div>
            <label className="font-body text-sm text-hustlegold block mb-1">
              Your name
            </label>
            <input
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full bg-steel border border-bone/20 px-4 py-3 font-body focus:outline-none focus:border-hustlegold"
            />
          </div>

          <div>
            <label className="font-body text-sm text-hustlegold block mb-1">
              Your phone number
            </label>
            <input
              required
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="071 234 5678"
              className="w-full bg-steel border border-bone/20 px-4 py-3 font-body focus:outline-none focus:border-hustlegold"
            />
          </div>

          <div>
            <label className="font-body text-sm text-hustlegold block mb-1">
              Which store?
            </label>
            <div className="flex flex-wrap gap-2">
              {STORE_PRESETS.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setStoreChoice(s)}
                  className={`px-3 py-2 font-body text-sm border ${
                    storeChoice === s
                      ? "bg-hustlegold text-asphalt border-hustlegold"
                      : "border-bone/20 text-bone/70"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {storeChoice === "Other" && (
              <input
                required
                value={storeOther}
                onChange={(e) => setStoreOther(e.target.value)}
                placeholder="Name of the store"
                className="w-full bg-steel border border-bone/20 px-4 py-3 font-body mt-3 focus:outline-none focus:border-hustlegold"
              />
            )}
            <input
              value={storeNote}
              onChange={(e) => setStoreNote(e.target.value)}
              placeholder="Which branch or area? (optional)"
              className="w-full bg-steel border border-bone/20 px-4 py-3 font-body mt-3 focus:outline-none focus:border-hustlegold"
            />
          </div>

          <div>
            <label className="font-body text-sm text-hustlegold block mb-1">
              What do you need? (be specific)
            </label>
            <textarea
              required
              value={itemNote}
              onChange={(e) => setItemNote(e.target.value)}
              rows={3}
              placeholder="e.g. 2L milk, brown bread, a dozen eggs"
              className="w-full bg-steel border border-bone/20 px-4 py-3 font-body focus:outline-none focus:border-hustlegold"
            />
          </div>

          <div>
            <label className="font-body text-sm text-hustlegold block mb-2">
              How many items?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(TIERS) as [TierKey, (typeof TIERS)[TierKey]][]).map(
                ([key, t]) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setTier(key)}
                    className={`px-2 py-3 font-body text-xs border text-center ${
                      tier === key
                        ? "bg-runnerred text-bone border-runnerred"
                        : "border-bone/20 text-bone/70"
                    }`}
                  >
                    <span className="block">{t.label}</span>
                    <span className="block font-display text-lg mt-1">R{t.fee}</span>
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <label className="font-body text-sm text-hustlegold block mb-2">
              Deliver to me, or I'll collect?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFulfillmentType("delivery")}
                className={`px-3 py-3 font-body text-sm border ${
                  fulfillmentType === "delivery"
                    ? "bg-hustlegold text-asphalt border-hustlegold"
                    : "border-bone/20 text-bone/70"
                }`}
              >
                Deliver to me (+R{COURIER_FEE})
              </button>
              <button
                type="button"
                onClick={() => setFulfillmentType("pickup")}
                className={`px-3 py-3 font-body text-sm border ${
                  fulfillmentType === "pickup"
                    ? "bg-hustlegold text-asphalt border-hustlegold"
                    : "border-bone/20 text-bone/70"
                }`}
              >
                I'll collect from the store
              </button>
            </div>
          </div>

          {fulfillmentType === "delivery" && (
            <div>
              <label className="font-body text-sm text-hustlegold block mb-1">
                Landmark or address
              </label>
              <input
                required
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Blue gate, next to Ngangelizwe taxi rank"
                className="w-full bg-steel border border-bone/20 px-4 py-3 font-body focus:outline-none focus:border-hustlegold"
              />
              <button
                type="button"
                onClick={useMyLocation}
                className="mt-2 text-sm font-body text-hustlegold underline underline-offset-4"
              >
                {locating
                  ? "Getting your location..."
                  : coords
                  ? "Location pinned ✓ (tap to update)"
                  : "Use my current location too"}
              </button>
            </div>
          )}

          <div className="bg-steel border border-hustlegold/40 p-4 flex items-center justify-between">
            <span className="font-body text-bone/70 text-sm">Total price</span>
            <span className="font-display text-3xl text-hustlegold">R{totalPrice}</span>
          </div>

          {result && (
            <p
              className={`font-body text-sm ${
                result.ok ? "text-hustlegold" : "text-runnerred"
              }`}
            >
              {result.message}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-runnerred hover:bg-runnerred/90 disabled:opacity-50 text-bone font-body font-bold px-6 py-4"
          >
            {submitting ? "Sending..." : "Send request"}
          </button>
        </form>
      </div>
    </main>
  );
}
