"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Me = {
  runner: {
    name: string;
    phone: string;
    payout_method: string | null;
    payout_account_name: string | null;
    payout_account_details: string | null;
  };
  completedJobs: { id: string; store_name: string; shopper_fee: number; completed_at: string }[];
  payouts: { id: string; amount: number; note: string | null; paid_at: string }[];
  totalEarned: number;
  totalPaid: number;
  balance: number;
};

export default function EarningsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [method, setMethod] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountDetails, setAccountDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/runner/me");
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    const data = await res.json();
    setMe(data);
    setMethod(data.runner.payout_method || "");
    setAccountName(data.runner.payout_account_name || "");
    setAccountDetails(data.runner.payout_account_details || "");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function savePayoutMethod(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    const res = await fetch("/api/runner/payout-method", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payoutMethod: method, payoutAccountName: accountName, payoutAccountDetails: accountDetails }),
    });
    const data = await res.json();
    setSaveMsg(res.ok ? "Saved." : data.error);
    setSaving(false);
    if (res.ok) load();
  }

  if (!me) {
    return (
      <main className="min-h-screen bg-asphalt text-bone px-6 py-12">
        <p className="font-body text-bone/50">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-asphalt text-bone px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-4xl">Your earnings</h1>
          <Link href="/jobs" className="text-sm text-bone/50 underline underline-offset-4">
            Board
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-10">
          <div className="bg-steel border border-hustlegold/30 p-4">
            <p className="font-body text-xs text-bone/50">Earned</p>
            <p className="font-display text-3xl text-hustlegold">R{me.totalEarned}</p>
          </div>
          <div className="bg-steel border border-bone/10 p-4">
            <p className="font-body text-xs text-bone/50">Paid out</p>
            <p className="font-display text-3xl text-bone">R{me.totalPaid}</p>
          </div>
          <div className="bg-steel border-2 border-hustlegold p-4">
            <p className="font-body text-xs text-bone/50">Balance</p>
            <p className="font-display text-3xl text-hustlegold">R{me.balance}</p>
          </div>
        </div>

        <section className="mb-10">
          <h2 className="font-body font-bold text-hustlegold text-sm tracking-wide mb-3">
            PAYOUT METHOD
          </h2>
          <form onSubmit={savePayoutMethod} className="bg-steel border border-bone/10 p-5 space-y-4">
            <div>
              <label className="font-body text-sm text-hustlegold block mb-1">How should we pay you?</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full bg-asphalt border border-bone/20 px-4 py-3 font-body focus:outline-none focus:border-hustlegold"
              >
                <option value="">Choose one</option>
                <option value="Bank transfer">Bank transfer</option>
                <option value="eWallet">eWallet</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
            <div>
              <label className="font-body text-sm text-hustlegold block mb-1">Account holder name</label>
              <input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full bg-asphalt border border-bone/20 px-4 py-3 font-body focus:outline-none focus:border-hustlegold"
              />
            </div>
            <div>
              <label className="font-body text-sm text-hustlegold block mb-1">
                Account / eWallet number
              </label>
              <input
                value={accountDetails}
                onChange={(e) => setAccountDetails(e.target.value)}
                placeholder="Bank + account number, or eWallet number"
                className="w-full bg-asphalt border border-bone/20 px-4 py-3 font-body focus:outline-none focus:border-hustlegold"
              />
            </div>
            {saveMsg && <p className="font-body text-sm text-hustlegold">{saveMsg}</p>}
            <button
              disabled={saving}
              className="bg-runnerred text-bone font-body font-bold px-5 py-3 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save payout details"}
            </button>
          </form>
        </section>

        <section className="mb-10">
          <h2 className="font-body font-bold text-hustlegold text-sm tracking-wide mb-3">
            JOB HISTORY
          </h2>
          <div className="space-y-2">
            {me.completedJobs.length === 0 && (
              <p className="font-body text-sm text-bone/50">No completed jobs yet.</p>
            )}
            {me.completedJobs.map((j) => (
              <div key={j.id} className="flex justify-between bg-steel border border-bone/10 p-3">
                <span className="font-body text-sm">{j.store_name}</span>
                <span className="font-body text-sm text-hustlegold">R{j.shopper_fee}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-body font-bold text-hustlegold text-sm tracking-wide mb-3">
            PAYOUT HISTORY
          </h2>
          <div className="space-y-2">
            {me.payouts.length === 0 && (
              <p className="font-body text-sm text-bone/50">No payouts recorded yet.</p>
            )}
            {me.payouts.map((p) => (
              <div key={p.id} className="flex justify-between bg-steel border border-bone/10 p-3">
                <span className="font-body text-sm">
                  {new Date(p.paid_at).toLocaleDateString()} {p.note ? `— ${p.note}` : ""}
                </span>
                <span className="font-body text-sm text-bone">R{p.amount}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
