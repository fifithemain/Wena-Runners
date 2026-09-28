"use client";

import { useEffect, useState, useCallback } from "react";

type Runner = {
  id: string;
  name: string;
  phone: string;
  zone: string;
  status: string;
  completed_jobs: number;
};

type Job = {
  id: string;
  store_name: string;
  tier: string;
  shopper_fee: number;
  courier_fee: number;
  fulfillment_type: string;
  status: string;
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
    const rData = await rRes.json();
    const jData = await jRes.json();
    setRunners(rData.runners || []);
    setJobs(jData.jobs || []);
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

  async function completeJob(jobId: string) {
    await fetch("/api/jobs/status", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ jobId, action: "completed" }),
    });
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
          <button className="w-full bg-runnerred text-bone font-body font-bold px-6 py-3">
            Enter
          </button>
        </form>
      </main>
    );
  }

  const pending = runners.filter((r) => r.status === "pending");
  const approved = runners.filter((r) => r.status === "approved");

  return (
    <main className="min-h-screen bg-asphalt text-bone px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-12">
        <h1 className="font-display text-4xl">Admin</h1>

        <section>
          <h2 className="font-body font-bold text-hustlegold text-sm tracking-wide mb-3">
            PENDING RUNNERS ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between bg-steel border border-bone/10 p-4"
              >
                <div>
                  <p className="font-body font-semibold">{r.name}</p>
                  <p className="font-body text-sm text-bone/60">
                    {r.phone} · {r.zone}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRunnerStatus(r.id, "approved")}
                    className="bg-hustlegold text-asphalt font-body font-bold px-4 py-2 text-sm"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setRunnerStatus(r.id, "blocked")}
                    className="border border-runnerred text-runnerred font-body px-4 py-2 text-sm"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
            {pending.length === 0 && (
              <p className="font-body text-sm text-bone/50">No pending sign-ups.</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="font-body font-bold text-hustlegold text-sm tracking-wide mb-3">
            APPROVED RUNNERS ({approved.length})
          </h2>
          <div className="space-y-2">
            {approved.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between bg-steel border border-bone/10 p-4"
              >
                <div>
                  <p className="font-body font-semibold">{r.name}</p>
                  <p className="font-body text-sm text-bone/60">
                    {r.phone} · {r.zone} · {r.completed_jobs} jobs done
                  </p>
                </div>
                <button
                  onClick={() => setRunnerStatus(r.id, "blocked")}
                  className="border border-runnerred text-runnerred font-body px-4 py-2 text-sm"
                >
                  Block
                </button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-body font-bold text-hustlegold text-sm tracking-wide mb-3">
            JOBS
          </h2>
          <div className="space-y-2">
            {jobs.map((j) => (
              <div key={j.id} className="bg-steel border border-bone/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-body font-semibold">
                      {j.store_name} — {j.customer_name}
                    </p>
                    <p className="font-body text-sm text-bone/60">
                      {j.customer_phone} · Runner: {j.runners?.name || "unclaimed"} · R
                      {j.shopper_fee} shopper + R{j.courier_fee} courier
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-body text-xs uppercase text-hustlegold">
                      {j.status}
                    </span>
                    {j.status === "bought" && (
                      <button
                        onClick={() => completeJob(j.id)}
                        className="bg-hustlegold text-asphalt font-body font-bold px-3 py-2 text-sm"
                      >
                        Mark completed
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
