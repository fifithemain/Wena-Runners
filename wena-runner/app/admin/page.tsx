"use client";

import { useEffect, useState, useCallback } from "react";

type Runner = {
  id: string;
  name: string;
  phone: string;
  zone: string;
  status: string;
  completed_jobs: number;
  id_number: string | null;
  payout_method: string | null;
  payout_account_name: string | null;
  payout_account_details: string | null;
  totalEarned: number;
  totalPaid: number;
  balance: number;
};

type Job = {
  id: string;
  store_name: string;
  tier: string;
  shopper_fee: number;
  courier_fee: number;
  fulfillment_type: string;
  status: string;
  payment_status: string;
  is_flagged: boolean;
  flag_reason: string | null;
  customer_name: string;
  customer_phone: string;
  runners: { name: string; phone: string } | null;
  created_at: string;
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [payoutDraft, setPayoutDraft] = useState<Record<string, string>>({});

  const load = useCallback(async (pw: string) => {
    const [rRes, jRes] = await Promise.all([
      fetch("/api/admin/runners", { headers: { "x-admin-password": pw } }),
      fetch("/api/admin/jobs", { headers: { "x-admin-password": pw } }),
    ]);
    if (!rRes.ok || !jRes.ok) {
      setError("Wrong password");
      setAuthed(false);
      return;
    }
    setRunners((await rRes.json()).runners || []);
    setJobs((await jRes.json()).jobs || []);
    setAuthed(true);
    setError(null);
  }, []);

  function tryLogin(e: React.FormEvent) {
    e.preventDefault();
    sessionStorage.setItem("wena_admin_pw", password);
    load(password);
  }

  useEffect(() => {
    const saved = sessionStorage.getItem("wena_admin_pw");
    if (saved) {
      setPassword(saved);
      load(saved);
    }
  }, [load]);

  async function setRunnerStatus(runnerId: string, status: string) {
    await fetch("/api/admin/runners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ runnerId, status }),
    });
    load(password);
  }

  async function jobAction(jobId: string, action: string) {
    await fetch("/api/jobs/status", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ jobId, action }),
    });
    load(password);
  }

  async function viewDoc(runnerId: string, type: "id" | "selfie") {
    const res = await fetch(`/api/admin/runner-document?runnerId=${runnerId}&type=${type}`, {
      headers: { "x-admin-password": password },
    });
    const data = await res.json();
    if (res.ok && data.url) window.open(data.url, "_blank");
    else alert(data.error || "Could not open document");
  }

  async function viewSlip(jobId: string) {
    const res = await fetch(`/api/jobs/slip?jobId=${jobId}`, { headers: { "x-admin-password": password } });
    const data = await res.json();
    if (res.ok && data.url) window.open(data.url, "_blank");
    else alert(data.error || "Could not open the slip");
  }

  async function recordPayout(runnerId: string) {
    const amount = Number(payoutDraft[runnerId]);
    if (!amount || amount <= 0) return;
    await fetch("/api/admin/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ runnerId, amount }),
    });
    setPayoutDraft((d) => ({ ...d, [runnerId]: "" }));
    load(password);
  }

  if (!authed) {
    return (
      <main className="min-h-screen bg-asphalt text-bone px-6 py-12 flex items-center justify-center">
        <form onSubmit={tryLogin} className="max-w-sm w-full space-y-4">
          <h1 className="font-display text-3xl">Admin</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            className="w-full bg-steel border border-bone/20 px-4 py-3 font-body focus:outline-none focus:border-hustlegold"
          />
          {error && <p className="font-body text-sm text-runnerred">{error}</p>}
          <button className="w-full bg-runnerred text-bone font-body font-bold px-6 py-3">Enter</button>
        </form>
      </main>
    );
  }

  const pending = runners.filter((r) => r.status === "pending");
  const approved = runners.filter((r) => r.status === "approved");
  const disputed = jobs.filter((j) => j.status === "disputed");
  const active = jobs.filter((j) => j.status !== "disputed");

  return (
    <main className="min-h-screen bg-asphalt text-bone px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-12">
        <h1 className="font-display text-4xl">Admin</h1>

        {disputed.length > 0 && (
          <section>
            <h2 className="font-body font-bold text-runnerred text-sm tracking-wide mb-3">
              FLAGGED / DISPUTED ({disputed.length})
            </h2>
            <div className="space-y-2">
              {disputed.map((j) => (
                <div key={j.id} className="bg-steel border-2 border-runnerred p-4">
                  <p className="font-body font-semibold">{j.store_name} — {j.customer_name}</p>
                  <p className="font-body text-sm text-bone/60">Runner: {j.runners?.name || "—"}</p>
                  <p className="font-body text-sm text-runnerred mt-1">Reason: {j.flag_reason}</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => viewSlip(j.id)} className="border border-hustlegold text-hustlegold font-body px-3 py-2 text-xs">
                      View slip
                    </button>
                    <button onClick={() => jobAction(j.id, "reopen")} className="bg-hustlegold text-asphalt font-body font-bold px-3 py-2 text-xs">
                      Reopen job
                    </button>
                    <button onClick={() => jobAction(j.id, "cancel")} className="border border-runnerred text-runnerred font-body px-3 py-2 text-xs">
                      Cancel job
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="font-body font-bold text-hustlegold text-sm tracking-wide mb-3">
            PENDING RUNNERS ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map((r) => (
              <div key={r.id} className="bg-steel border border-bone/10 p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-body font-semibold">{r.name}</p>
                    <p className="font-body text-sm text-bone/60">{r.phone} · {r.zone} · ID {r.id_number}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => viewDoc(r.id, "id")} className="border border-hustlegold text-hustlegold font-body px-3 py-2 text-sm">
                      View ID
                    </button>
                    <button onClick={() => viewDoc(r.id, "selfie")} className="border border-hustlegold text-hustlegold font-body px-3 py-2 text-sm">
                      View selfie
                    </button>
                    <button onClick={() => setRunnerStatus(r.id, "approved")} className="bg-hustlegold text-asphalt font-body font-bold px-4 py-2 text-sm">
                      Approve
                    </button>
                    <button onClick={() => setRunnerStatus(r.id, "blocked")} className="border border-runnerred text-runnerred font-body px-4 py-2 text-sm">
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {pending.length === 0 && <p className="font-body text-sm text-bone/50">No pending sign-ups.</p>}
          </div>
        </section>

        <section>
          <h2 className="font-body font-bold text-hustlegold text-sm tracking-wide mb-3">
            APPROVED RUNNERS ({approved.length})
          </h2>
          <div className="space-y-3">
            {approved.map((r) => (
              <div key={r.id} className="bg-steel border border-bone/10 p-4">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <div>
                    <p className="font-body font-semibold">{r.name}</p>
                    <p className="font-body text-sm text-bone/60">
                      {r.phone} · {r.zone} · {r.completed_jobs} jobs done
                    </p>
                    <p className="font-body text-xs text-bone/40 mt-1">
                      {r.payout_method
                        ? `${r.payout_method} — ${r.payout_account_name} (${r.payout_account_details})`
                        : "No payout method set yet"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => viewDoc(r.id, "id")} className="border border-hustlegold text-hustlegold font-body px-3 py-2 text-xs">
                      ID
                    </button>
                    <button onClick={() => viewDoc(r.id, "selfie")} className="border border-hustlegold text-hustlegold font-body px-3 py-2 text-xs">
                      Selfie
                    </button>
                    <button onClick={() => setRunnerStatus(r.id, "blocked")} className="border border-runnerred text-runnerred font-body px-3 py-2 text-xs">
                      Block
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-asphalt border border-bone/10 p-3 mt-2 flex-wrap gap-2">
                  <div className="font-body text-sm">
                    Earned <span className="text-hustlegold">R{r.totalEarned}</span> · Paid <span>R{r.totalPaid}</span> · Balance{" "}
                    <span className="text-hustlegold font-bold">R{r.balance}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      placeholder="Amount"
                      value={payoutDraft[r.id] || ""}
                      onChange={(e) => setPayoutDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                      className="w-24 bg-steel border border-bone/20 px-2 py-2 font-body text-sm"
                    />
                    <button onClick={() => recordPayout(r.id)} className="bg-hustlegold text-asphalt font-body font-bold px-3 py-2 text-sm">
                      Record payout
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-body font-bold text-hustlegold text-sm tracking-wide mb-3">JOBS</h2>
          <div className="space-y-2">
            {active.map((j) => (
              <div key={j.id} className="bg-steel border border-bone/10 p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-body font-semibold">{j.store_name} — {j.customer_name}</p>
                    <p className="font-body text-sm text-bone/60">
                      {j.customer_phone} · Runner: {j.runners?.name || "unclaimed"} · R{j.shopper_fee} shopper + R{j.courier_fee} courier · payment: {j.payment_status}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-body text-xs uppercase text-hustlegold">{j.status}</span>
                    {(j.status === "claimed" || j.status === "open") && (
                      <button onClick={() => viewSlip(j.id)} className="border border-hustlegold text-hustlegold font-body px-3 py-2 text-xs">
                        Slip
                      </button>
                    )}
                    {j.status === "claimed" && (
                      <button onClick={() => jobAction(j.id, "completed")} className="bg-hustlegold text-asphalt font-body font-bold px-3 py-2 text-xs">
                        Force complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
