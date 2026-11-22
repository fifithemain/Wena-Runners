"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import WorkspaceShell from "../workspace-shell";

type Period = "week" | "month" | "all_time";
type Leader = { id: string; name: string; earnings: number; completedErrands: number; rank: number; isCurrentUser: boolean };
type Payload = {
  rules?: { days: number; kind: string; amount: number; label: string }[];
  enabled: boolean;
  message?: string;
  leaderboard?: Leader[];
  me?: (Leader & { amountToNextPlace: number | null; nextPlace: number | null }) | null;
  streak?: {
    current: number; longest: number; activeToday: boolean; nextMilestone: { days: number; kind: string; amount: number; label: string } | null;
    daysToNextMilestone: number | null; activityDates: string[];
  };
  rewards?: { id: string; milestone_days: number; reward_kind: string; reward_amount: number; reward_label: string; status: string; earned_at: string }[];
};

const money = (value: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(value);

function dateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (name: string) => parts.find((item) => item.type === name)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("all_time");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch(`/api/gamification?period=${period}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load WENA progress.");
      setData(result);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load WENA progress.");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(true), 20000);
    const refreshOnFocus = () => { if (document.visibilityState === "visible") void load(true); };
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [load]);

  const days = useMemo(() => {
    const today = new Date();
    const result: { date: string; label: string; active: boolean; today: boolean }[] = [];
    const activeDates = new Set(data?.streak?.activityDates || []);
    for (let offset = 13; offset >= 0; offset--) {
      const date = new Date(today);
      date.setDate(date.getDate() - offset);
      const key = dateKey(date);
      result.push({
        date: key,
        label: new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", weekday: "short" }).format(date).slice(0, 1),
        active: activeDates.has(key),
        today: offset === 0,
      });
    }
    return result;
  }, [data?.streak?.activityDates]);

  const podium = [2, 1, 3];
  const top = data?.leaderboard || [];
  const me = data?.me || null;
  const next = data?.streak?.nextMilestone;

  return (
    <WorkspaceShell active="leaderboard" role="both" name="WENA community" signedIn>
      <div className="workspace-page wena-leaderboard">
        <header className="workspace-page-head">
          <div>
            <p className="workspace-breadcrumb">WENA Runners <span>/</span> Community</p>
            <h1>The WENA leaderboard</h1>
            <p className="muted">Big effort deserves a little spotlight. Earn, climb, repeat.</p>
          </div>
          <span className="leaderboard-live"><span /> LIVE · refreshes every 20s</span>
        </header>

        {error && <div className="error" role="alert">{error}</div>}
        {loading && !data && <div className="panel leaderboard-loading">Loading the leaderboard and your streak…</div>}
        {!loading && data && !data.enabled && (
          <section className="panel leaderboard-coming">
            <span className="leaderboard-flame">🏆</span>
            <h2>Something exciting is on the way</h2>
            <p className="muted">{data.message || "The WENA leaderboard is getting ready."}</p>
          </section>
        )}
        {data?.enabled && (
          <>
            <section className="leaderboard-hero">
              <div className="leaderboard-hero-copy">
                <span className="leaderboard-eyebrow">YOUR PLACE IN THE PACK</span>
                <h2>{me ? <>You're <strong>#{me.rank}</strong></> : "Your climb starts here"}</h2>
                <p>{me ? "Every completed, paid errand moves your total." : "Complete your first paid errand to join the rankings."}</p>
                {me?.amountToNextPlace !== null && me?.amountToNextPlace !== undefined && (
                  <div className="leaderboard-chase">Only <strong>{money(me.amountToNextPlace)}</strong> to move up one place.</div>
                )}
                {me && me.rank === 1 && <div className="leaderboard-chase">You're leading the pack. Keep it going!</div>}
              </div>
              <div className="leaderboard-trophy" aria-hidden="true">🏆</div>
            </section>

            <div className="leaderboard-periods" role="group" aria-label="Leaderboard period">
              {([{ value: "week", label: "This week" }, { value: "month", label: "This month" }, { value: "all_time", label: "All time" }] as const).map((item) => (
                <button key={item.value} type="button" className={period === item.value ? "active" : ""} aria-pressed={period === item.value} onClick={() => setPeriod(item.value)}>{item.label}</button>
              ))}
            </div>

            <section className="panel leaderboard-panel">
              <div className="leaderboard-section-head">
                <div><h2>Top earners</h2><p className="muted">Ranked by completed, paid Runner earnings</p></div>
                <span className="leaderboard-period-label">{period === "week" ? "WEEKLY" : period === "month" ? "MONTHLY" : "ALL-TIME"}</span>
              </div>
              {top.length >= 3 && (
                <div className="leaderboard-podium">
                  {podium.map((rank) => {
                    const person = top.find((item) => item.rank === rank);
                    if (!person) return <div key={rank} className="leaderboard-podium-slot empty" />;
                    return (
                      <div key={rank} className={`leaderboard-podium-slot place-${rank}${person.isCurrentUser ? " is-you" : ""}`}>
                        <span className="leaderboard-medal">{rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}</span>
                        <strong>{person.name}{person.isCurrentUser ? " · You" : ""}</strong>
                        <span>{money(person.earnings)}</span>
                        <div className="leaderboard-podium-block"><b>#{rank}</b></div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="leaderboard-list">
                {top.map((person) => (
                  <article key={person.id} className={`leaderboard-row${person.isCurrentUser ? " is-you" : ""}`}>
                    <span className="leaderboard-rank">{person.rank <= 3 ? ["🥇", "🥈", "🥉"][person.rank - 1] : `#${person.rank}`}</span>
                    <span className="leaderboard-person"><strong>{person.name}{person.isCurrentUser ? " (you)" : ""}</strong><small>{person.completedErrands} completed {person.completedErrands === 1 ? "errand" : "errands"}</small></span>
                    <strong className="leaderboard-earnings">{money(person.earnings)}</strong>
                  </article>
                ))}
                {!top.length && <p className="leaderboard-empty">No completed errands in this period yet. Be the first on the board!</p>}
              </div>
              {me && me.rank > 10 && <div className="leaderboard-your-row"><span>Your position</span><strong>#{me.rank}</strong><strong>{money(me.earnings)}</strong></div>}
              <p className="leaderboard-footnote">Your position updates automatically when another Runner moves ahead of you. Names are abbreviated for privacy.</p>
            </section>

            <section className="panel streak-panel">
              <div className="streak-heading">
                <div><span className="streak-kicker">CONSISTENCY CLUB</span><h2><span aria-hidden="true">🔥</span> Your streak run</h2><p className="muted">Complete at least one paid errand each day to keep your streak alive.</p></div>
                <div className="streak-count"><strong>{data.streak?.current || 0}</strong><span>DAY STREAK</span></div>
              </div>
              <div className="streak-calendar" aria-label="Completed errand activity over the last 14 days">
                {days.map((day) => <div key={day.date} className={`streak-day${day.active ? " active" : ""}${day.today ? " today" : ""}`} title={day.date}><span>{day.label}</span><b>{day.active ? "✓" : "·"}</b></div>)}
              </div>
              <div className="streak-progress-copy">
                <span>Longest streak: <strong>{data.streak?.longest || 0} days</strong></span>
                {next ? <span>{data.streak?.daysToNextMilestone} day(s) to <strong>{next.label}</strong></span> : <span>You've unlocked every current streak milestone!</span>}
              </div>
              {next && <div className="streak-progress-track"><span style={{ width: `${Math.min(100, ((data.streak?.current || 0) / next.days) * 100)}%` }} /></div>}
              <div className="streak-rewards">
                {(data.rules || []).map((rule) => {
                  const earned = (data.rewards || []).some((reward) => reward.milestone_days === rule.days);
                  return <div key={rule.days} className={`streak-reward${earned ? " earned" : ""}`}><span>{earned ? "🏅" : "🎯"}</span><strong>{rule.days} days</strong><small>{earned ? "Unlocked" : rule.kind === "cash" && rule.amount > 0 ? money(rule.amount) : "Badge reward"}</small></div>;
                })}
              </div>
              <p className="streak-note">Streaks count completed, paid errands in South African time. Rewards are issued once per milestone. Cash rewards remain inactive until WENA configures and approves a prize amount.</p>
            </section>

            <section className="panel streak-history">
              <div className="leaderboard-section-head"><div><h2>Your streak rewards</h2><p className="muted">Milestones you've unlocked</p></div></div>
              {(data.rewards || []).length ? (data.rewards || []).map((reward) => (
                <div className="streak-history-row" key={reward.id}><span>🏅</span><div><strong>{reward.reward_label}</strong><small>{reward.milestone_days}-day streak · {new Date(reward.earned_at).toLocaleDateString("en-ZA")}</small></div><span className="streak-reward-status">{reward.status}</span></div>
              )) : <p className="leaderboard-empty">Your first streak reward is waiting. Keep the momentum going!</p>}
            </section>
          </>
        )}
      </div>
    </WorkspaceShell>
  );
}
