"use client";

import Link from "next/link";
import { useState } from "react";

type PayoutRequest = {
  id: string;
  runner_id: string;
  amount: number;
  method: string;
  account_details: string;
  status: string;
  admin_note?: string | null;
  created_at: string;
  runner?: { full_name?: string; email?: string; phone?: string; zone?: string | null } | null;
};

export default function Admin() {
  const [password, setPassword] = useState("");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function load() {
    setError("");
    try {
      const response = await fetch("/api/admin", { headers: { "x-admin-password": password }, cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not open admin desk.");
      setData(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not open admin desk.");
    }
  }

  async function act(path: string, body: any) {
    setError("");
    setBusyId(String(body.id || body.runner_id || "action"));
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Action failed.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed.");
    } finally {
      setBusyId("");
    }
  }

  const money = (value: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(value || 0));
  const payoutRequests: PayoutRequest[] = data?.payoutRequests || [];

  return (
    <main>
      <nav className="shell nav">
        <Link href="/" className="brand" aria-label="WENA Runners home"><span className="brand-symbol" aria-hidden="true">w</span><span className="brand-wordmark">wena<span>runners</span></span></Link>
        <Link href="/jobs">Errand board</Link>
      </nav>
      <section className="shell">
        <header className="pagehead">
          <h1>Admin desk</h1>
          <p className="muted">Review Runner approvals, payout requests, and disputed errands.</p>
        </header>

        {!data && (
          <div className="panel" style={{ maxWidth: 450 }}>
            <div className="field">
              <label htmlFor="admin-password">Admin password</label>
              <input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
            </div>
            <button className="btn" onClick={load}>Open admin</button>
          </div>
        )}

        {data && (
          <>
            <div className="market-head">
              <div><h2>Payout requests</h2><p className="muted">Verify the payment details before marking a transfer as paid. Paid requests are added to the payout ledger.</p></div>
            </div>
            <div className="joblist">
              {payoutRequests.length === 0 && <div className="panel"><strong>No payout requests yet</strong><p className="muted">New Runner withdrawals will appear here.</p></div>}
              {payoutRequests.map((request) => (
                <article className="jobcard" key={request.id}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <h3>{request.runner?.full_name || "Runner"} · {money(request.amount)}</h3>
                      <span className={`pill status-${request.status}`}>{request.status.replaceAll("_", " ")}</span>
                    </div>
                    <p className="muted">{request.runner?.email || "No email"} · {request.runner?.phone || "No phone"} · {request.runner?.zone || "No zone"}</p>
                    <p><strong>Method:</strong> {request.method === "bank_transfer" ? "Bank transfer" : "Mobile money"}</p>
                    <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}><strong>Payment details:</strong> {request.account_details}</p>
                    <p className="small">Requested {new Date(request.created_at).toLocaleString("en-ZA")}</p>
                    {request.admin_note && <p className="small"><strong>Admin note:</strong> {request.admin_note}</p>}
                    {["pending", "processing"].includes(request.status) && (
                      <div style={{ display: "grid", gap: 8, maxWidth: 520, marginTop: 12 }}>
                        <div className="field">
                          <label htmlFor={`note-${request.id}`}>Internal note (optional)</label>
                          <input id={`note-${request.id}`} maxLength={500} value={notes[request.id] || ""} onChange={(event) => setNotes({ ...notes, [request.id]: event.target.value })} placeholder="Transfer reference or reason for rejection" />
                        </div>
                        <div className="form-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {request.status === "pending" && <button className="btn ghost" disabled={!!busyId} onClick={() => act("/api/admin/payout-requests", { id: request.id, status: "processing", admin_note: notes[request.id] || "" })}>Mark processing</button>}
                          <button className="btn" disabled={!!busyId} onClick={() => { if (window.confirm("Confirm the bank or mobile-money transfer has actually been sent?")) act("/api/admin/payout-requests", { id: request.id, status: "paid", admin_note: notes[request.id] || "" }); }}>Mark paid</button>
                          <button className="btn ghost" disabled={!!busyId} onClick={() => act("/api/admin/payout-requests", { id: request.id, status: "rejected", admin_note: notes[request.id] || "Rejected by admin" })}>Reject</button>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>

            <div className="market-head"><div><h2>Runner approvals</h2><p className="muted">Verify Runner accounts before they can make offers.</p></div></div>
            <div className="joblist">
              {data.runners.map((runner: any) => (
                <article className="jobcard" key={runner.id}>
                  <div><h3>{runner.full_name}</h3><p className="muted">{runner.email} · {runner.phone} · {runner.zone || "No zone"}</p></div>
                  <button className="btn" disabled={!!busyId} onClick={() => act("/api/admin/runners", { id: runner.id, is_verified: !runner.is_verified })}>{runner.is_verified ? "Revoke verification" : "Approve Runner"}</button>
                </article>
              ))}
            </div>

            <div className="market-head"><div><h2>Flagged errands</h2><p className="muted">Resolve disputed tasks.</p></div></div>
            <div className="joblist">
              {data.jobs.filter((job: any) => job.status === "disputed").map((job: any) => (
                <article className="jobcard" key={job.id}>
                  <div><h3>{job.description}</h3><p className="muted">{job.flag_reason}</p></div>
                  <div className="form-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn" disabled={!!busyId} onClick={() => act("/api/admin/jobs", { id: job.id, status: "posted" })}>Reopen</button>
                    <button className="btn ghost" disabled={!!busyId} onClick={() => act("/api/admin/jobs", { id: job.id, status: "cancelled" })}>Cancel</button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
        {error && <p className="error" role="alert">{error}</p>}
      </section>
    </main>
  );
}
