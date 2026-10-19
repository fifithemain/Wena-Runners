"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import WorkspaceShell from "../workspace-shell";

type HistoryFilter = "all" | "paid" | "not-charged" | "refunded" | "pending";
type Job = {
  id: string;
  customer_id: string;
  runner_id: string | null;
  category: string;
  description: string;
  requested_budget: number;
  final_budget: number | null;
  total_charge: number | null;
  payment_status: string;
  status: string;
  created_at: string;
};
type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  zone?: string | null;
  is_verified: boolean;
};
type JobsResponse = { jobs: Job[]; profile: Profile | null };

function paymentState(job: Job): Exclude<HistoryFilter, "all"> {
  if (job.payment_status === "paid") return "paid";
  if (job.payment_status === "refunded") return "refunded";
  if (job.status === "cancelled") return "not-charged";
  return "pending";
}

function paymentLabel(state: Exclude<HistoryFilter, "all">) {
  if (state === "paid") return "Paid";
  if (state === "refunded") return "Refunded";
  if (state === "not-charged") return "Not charged";
  return "Pending";
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function roleLabel(role: string) {
  if (role === "both") return "Customer & Runner";
  return role.replaceAll("_", " ");
}

export default function AccountPage() {
  const [data, setData] = useState<JobsResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<HistoryFilter>("all");

  useEffect(() => {
    let active = true;
    fetch("/api/jobs", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load account activity.");
        if (active) setData(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load account activity.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const accountJobs = useMemo(() => {
    if (!data?.profile) return [];
    const profileId = data.profile.id;
    return data.jobs.filter((job) => job.customer_id === profileId || job.runner_id === profileId);
  }, [data]);
  const visibleJobs = useMemo(
    () => filter === "all" ? accountJobs : accountJobs.filter((job) => paymentState(job) === filter),
    [accountJobs, filter],
  );
  const profile = data?.profile;

  return (
    <WorkspaceShell active="account" role={profile?.role} name={profile?.full_name} signedIn={Boolean(profile)}>
      <div className="workspace-page">
        <header className="workspace-page-head">
          <div>
            <p className="workspace-breadcrumb">WENA Runners <span>/</span> Account</p>
            <h1>Your account</h1>
            <p className="muted">Your verified profile and real errand activity.</p>
          </div>
        </header>

        {error && <div className="error" role="alert">{error} {!profile && <Link href="/login">Sign in</Link>}</div>}
        {loading && <div className="panel" role="status">Loading your account…</div>}
        {!loading && !error && !profile && (
          <div className="panel messages-empty">
            <h2>Sign in to view your account</h2>
            <p className="muted">Your profile and errand activity are private to your account.</p>
            <Link className="btn" href="/login">Sign in</Link>
          </div>
        )}
        {profile && (
          <div className="account-workspace">
            <section className="panel account-profile">
              <div className="account-profile-cover">
                <span className="workspace-avatar account-large-avatar" aria-hidden="true">
                  {profile.full_name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "W"}
                </span>
              </div>
              <h2>{profile.full_name}</h2>
              <p className="muted">{roleLabel(profile.role)}</p>
              <span className={`pill${profile.is_verified ? " verified" : ""}`}>
                {profile.is_verified ? "Verified Runner" : profile.role === "runner" ? "Verification pending" : "WENA member"}
              </span>
              <dl className="account-details">
                <div><dt>Email</dt><dd>{profile.email}</dd></div>
                {profile.phone && <div><dt>Mobile</dt><dd>{profile.phone}</dd></div>}
                {profile.zone && <div><dt>Area</dt><dd>{profile.zone}</dd></div>}
              </dl>
            </section>

            <section className="panel account-history">
              <div className="account-history-heading">
                <div>
                  <h2>Errand & payment history</h2>
                  <p className="muted">Activity recorded for your account.</p>
                </div>
                <span>{accountJobs.length} recent errands</span>
              </div>
              <div className="account-history-filters" aria-label="Filter activity by payment status">
                {(["all", "paid", "not-charged", "refunded", "pending"] as HistoryFilter[]).map((state) => (
                  <button
                    type="button"
                    key={state}
                    className={filter === state ? "active" : ""}
                    aria-pressed={filter === state}
                    onClick={() => setFilter(state)}
                  >
                    {state === "all" ? "All activity" : paymentLabel(state)}
                  </button>
                ))}
              </div>
              <div className="account-history-list">
                {visibleJobs.map((job) => {
                  const state = paymentState(job);
                  const amount = profile.id === job.customer_id
                    ? job.total_charge ?? job.final_budget ?? job.requested_budget
                    : job.final_budget ?? job.requested_budget;
                  return (
                    <article className="account-history-row" key={job.id}>
                      <span className={`account-history-icon ${state}`} aria-hidden="true">
                        {state === "paid" ? "✓" : state === "refunded" ? "↶" : state === "pending" ? "…" : "×"}
                      </span>
                      <div className="account-history-info">
                        <strong>{job.description}</strong>
                        <span>{job.category.replaceAll("_", " ")} · {new Date(job.created_at).toLocaleDateString("en-ZA")}</span>
                        <small>{job.status.replaceAll("_", " ")}</small>
                      </div>
                      <div className="account-history-result">
                        <strong>{formatMoney(amount)}</strong>
                        <span className={`account-history-status ${state}`}>{paymentLabel(state)}</span>
                        <small>Errand {job.status.replaceAll("_", " ")}</small>
                      </div>
                    </article>
                  );
                })}
                {!loading && !visibleJobs.length && (
                  <p className="account-history-empty">{accountJobs.length ? "No activity matches this filter." : "Errands you post or run will appear here."}</p>
                )}
              </div>
              <p className="account-history-note">Payment status is shown from the current errand record. Open My errands for the latest details.</p>
            </section>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
