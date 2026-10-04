"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { storeDirectionsUrl, pinDirectionsUrl, landmarkDirectionsUrl } from "@/lib/maps";

type Job = {
  id: string;
  store_name: string;
  store_note: string | null;
  item_note: string | null;
  tier: string;
  shopper_fee: number;
  fulfillment_type: "delivery" | "pickup";
  courier_fee: number;
  status: "open" | "claimed" | "disputed";
  claimed_by: string | null;
  customer_name?: string;
  customer_phone?: string;
  delivery_landmark?: string | null;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
};

const TIER_LABEL: Record<string, string> = {
  small: "1 to 5 items",
  medium: "6 to 10 items",
  heavy: "Heavy items",
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pinDraft, setPinDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/jobs");
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    const data = await res.json();
    setJobs(data.jobs || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  async function claim(jobId: string) {
    setBusyId(jobId);
    setError(null);
    const res = await fetch("/api/jobs/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    await load();
    setBusyId(null);
  }

  async function viewSlip(jobId: string) {
    const res = await fetch(`/api/jobs/slip?jobId=${jobId}`);
    const data = await res.json();
    if (res.ok && data.url) window.open(data.url, "_blank");
    else setError(data.error || "Could not open the slip");
  }

  async function completeJob(jobId: string) {
    const pin = pinDraft[jobId];
    if (!pin) {
      setError("Enter the hand-off PIN the customer gives you");
      return;
    }
    setBusyId(jobId);
    setError(null);
    const res = await fetch("/api/jobs/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, action: "complete", pin }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    await load();
    setBusyId(null);
  }

  async function flagJob(jobId: string) {
    const reason = window.prompt("What's wrong with this slip?");
    if (!reason) return;
    setBusyId(jobId);
    const res = await fetch("/api/jobs/flag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, reason }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    await load();
    setBusyId(null);
  }

  const openJobs = jobs.filter((j) => j.status === "open");
  const myJobs = jobs.filter((j) => j.status !== "open");

  return (
    <main className="min-h-screen bg-asphalt text-bone px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-4xl">The board</h1>
          <div className="flex gap-4">
            <Link href="/earnings" className="text-sm text-hustlegold underline underline-offset-4">
              Earnings
            </Link>
            <Link href="/" className="text-sm text-bone/50 underline underline-offset-4">
              Home
            </Link>
          </div>
        </div>

        {error && (
          <p className="font-body text-sm text-runnerred mb-4 border border-runnerred p-3">{error}</p>
        )}

        {myJobs.length > 0 && (
          <section className="mb-10">
            <h2 className="font-body font-bold text-hustlegold text-sm tracking-wide mb-3">YOUR JOBS</h2>
            <div className="space-y-4">
              {myJobs.map((job) => (
                <div key={job.id} className="bg-steel border-2 border-hustlegold p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-body font-bold text-lg">{job.store_name}</p>
                      {job.store_note && <p className="font-body text-sm text-bone/60">{job.store_note}</p>}
                    </div>
                    <p className="font-display text-2xl text-hustlegold">R{job.shopper_fee}</p>
                  </div>
                  {job.item_note && (
                    <p className="font-body text-sm mt-2 text-bone/80">Order: "{job.item_note}"</p>
                  )}

                  <div className="flex flex-wrap gap-4 mt-3">
                    <a
                      href={storeDirectionsUrl(job.store_name, job.store_note)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-body text-hustlegold underline underline-offset-4"
                    >
                      Get directions to store
                    </a>
                    <button onClick={() => viewSlip(job.id)} className="text-sm font-body text-hustlegold underline underline-offset-4">
                      View payment slip
                    </button>
                  </div>

                  {job.status === "claimed" && (
                    <div className="mt-4 pt-4 border-t border-bone/10 space-y-1">
                      <p className="font-body text-sm text-bone/70">
                        Customer: {job.customer_name} — {job.customer_phone}
                      </p>
                      {job.fulfillment_type === "delivery" ? (
                        <>
                          <p className="font-body text-sm text-bone/70">Deliver to: {job.delivery_landmark}</p>
                          {job.delivery_lat && job.delivery_lng ? (
                            <a
                              href={pinDirectionsUrl(job.delivery_lat, job.delivery_lng)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block text-sm font-body text-hustlegold underline underline-offset-4"
                            >
                              Get directions to drop-off
                            </a>
                          ) : job.delivery_landmark ? (
                            <a
                              href={landmarkDirectionsUrl(job.delivery_landmark)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block text-sm font-body text-hustlegold underline underline-offset-4"
                            >
                              Get directions to drop-off
                            </a>
                          ) : null}
                        </>
                      ) : (
                        <p className="font-body text-sm text-bone/70">Customer will collect from you directly.</p>
                      )}

                      <div className="flex gap-2 mt-3">
                        <input
                          inputMode="numeric"
                          placeholder="Hand-off PIN"
                          value={pinDraft[job.id] || ""}
                          onChange={(e) => setPinDraft((d) => ({ ...d, [job.id]: e.target.value }))}
                          className="flex-1 bg-asphalt border border-bone/20 px-3 py-2 font-body text-sm"
                        />
                        <button
                          onClick={() => completeJob(job.id)}
                          disabled={busyId === job.id}
                          className="bg-hustlegold text-asphalt font-body font-bold px-4 py-2 text-sm disabled:opacity-50"
                        >
                          Complete
                        </button>
                      </div>
                      <button
                        onClick={() => flagJob(job.id)}
                        disabled={busyId === job.id}
                        className="text-xs font-body text-runnerred underline underline-offset-4 mt-2"
                      >
                        Slip looks wrong? Flag this job
                      </button>
                    </div>
                  )}
                  {job.status === "disputed" && (
                    <p className="font-body text-sm text-runnerred mt-4 text-center">
                      Flagged — WENA is looking into it
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="font-body font-bold text-hustlegold text-sm tracking-wide mb-3">OPEN JOBS</h2>
          {loading && <p className="font-body text-bone/50">Loading...</p>}
          {!loading && openJobs.length === 0 && (
            <p className="font-body text-bone/50">Nothing open right now. Check back soon.</p>
          )}
          <div className="space-y-4">
            {openJobs.map((job) => (
              <div key={job.id} className="bg-steel border border-bone/10 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-body font-bold text-lg">{job.store_name}</p>
                    {job.store_note && <p className="font-body text-sm text-bone/60">{job.store_note}</p>}
                    <p className="font-body text-xs text-bone/40 mt-1">
                      {TIER_LABEL[job.tier]} · {job.fulfillment_type === "delivery" ? "Delivery" : "Pickup"}
                    </p>
                  </div>
                  <p className="font-display text-2xl text-hustlegold">R{job.shopper_fee}</p>
                </div>
                {job.item_note && <p className="font-body text-sm mt-2 text-bone/80">Order: "{job.item_note}"</p>}
                <div className="flex items-center justify-between mt-4">
                  <a
                    href={storeDirectionsUrl(job.store_name, job.store_note)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-body text-hustlegold underline underline-offset-4"
                  >
                    Get directions
                  </a>
                  <button
                    onClick={() => claim(job.id)}
                    disabled={busyId === job.id}
                    className="bg-runnerred hover:bg-runnerred/90 disabled:opacity-50 text-bone font-body font-bold px-5 py-2"
                  >
                    {busyId === job.id ? "Claiming..." : "Claim"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
