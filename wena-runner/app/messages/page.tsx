"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ChatBox from "../jobs/chat";
import WorkspaceShell from "../workspace-shell";

type Job = {
  id: string;
  customer_id: string;
  runner_id: string | null;
  description: string;
  final_budget: number | null;
  requested_budget: number;
  payment_status: string;
  status: string;
};
type Profile = { id: string; full_name: string; role: string };
type JobsResponse = { jobs: Job[]; profile: Profile | null };

export default function MessagesPage() {
  const [data, setData] = useState<JobsResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/jobs", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load your messages.");
        if (active) {
          setData(result);
          const requestedId = new URLSearchParams(window.location.search).get("job");
          setSelectedId(requestedId || "");
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load your messages.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const conversations = useMemo(() => {
    if (!data?.profile) return [];
    const profileId = data.profile.id;
    return data.jobs.filter((job) =>
      job.runner_id
      && job.payment_status === "paid"
      && ["assigned", "in_progress"].includes(job.status)
      && [job.customer_id, job.runner_id].includes(profileId),
    );
  }, [data]);
  const selected = conversations.find((job) => job.id === selectedId) || conversations[0];

  return (
    <WorkspaceShell active="messages" role={data?.profile?.role} name={data?.profile?.full_name} signedIn={Boolean(data?.profile)}>
      <div className="workspace-page">
        <header className="workspace-page-head">
          <div>
            <p className="workspace-breadcrumb">WENA Runners <span>/</span> Messages</p>
            <h1>Messages</h1>
            <p className="muted">Chat privately with the other participant in an active, paid errand.</p>
          </div>
        </header>
        {error && <div className="error" role="alert">{error} {!data?.profile && <Link href="/login">Sign in</Link>}</div>}
        {loading && <div className="panel" role="status">Loading your messages…</div>}
        {!loading && !error && !data?.profile && (
          <div className="panel messages-empty">
            <h2>Sign in to see your messages</h2>
            <p className="muted">Errand chats are private to their participants.</p>
            <Link className="btn" href="/login">Sign in</Link>
          </div>
        )}
        {!loading && data?.profile && (
          conversations.length ? (
            <div className="messages-layout">
              <aside className="panel messages-list" aria-label="Active errand conversations">
                <h2>Active errands <span>{conversations.length}</span></h2>
                {conversations.map((job) => (
                  <button
                    type="button"
                    key={job.id}
                    className={`messages-conversation${selected?.id === job.id ? " selected" : ""}`}
                    onClick={() => setSelectedId(job.id)}
                    aria-pressed={selected?.id === job.id}
                  >
                    <span className="messages-avatar" aria-hidden="true">W</span>
                    <span><strong>{job.description}</strong><small>{data.profile?.id === job.customer_id ? "Runner assigned" : "Customer errand"}</small></span>
                  </button>
                ))}
              </aside>
              {selected && (
                <section className="panel messages-thread">
                  <header className="messages-thread-head">
                    <div><h2>{selected.description}</h2><p className="muted">Agreed price · R{selected.final_budget ?? selected.requested_budget}</p></div>
                    <Link className="btn ghost" href={`/jobs?chat=${encodeURIComponent(selected.id)}#job-${encodeURIComponent(selected.id)}`}>View errand</Link>
                  </header>
                  <ChatBox key={selected.id} jobId={selected.id} />
                </section>
              )}
            </div>
          ) : (
            <div className="panel messages-empty">
              <span aria-hidden="true">◌</span>
              <h2>No active chats</h2>
              <p className="muted">Chat becomes available after a Runner is assigned and the errand is paid.</p>
              <Link className="btn" href="/jobs">View my errands</Link>
            </div>
          )
        )}
      </div>
    </WorkspaceShell>
  );
}
