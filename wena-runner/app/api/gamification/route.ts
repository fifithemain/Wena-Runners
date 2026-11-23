import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentProfile } from "@/lib/current-profile";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function database() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase server configuration is missing.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function localDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function shiftLocalDay(offset: number) {
  const date = new Date(`${localDay()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return NextResponse.json({ error: "Sign in to view the leaderboard." }, { status: 401 });

    const periodParam = new URL(request.url).searchParams.get("period") || "all_time";
    const period = ["week", "month", "all_time"].includes(periodParam) ? periodParam : "all_time";
    const supabase = database();

    const [{ data: settings, error: settingsError }, { data: ranks, error: rankError }, { data: streak, error: streakError }, { data: rules, error: rulesError }, { data: rewards, error: rewardsError }, { data: events, error: eventsError }] = await Promise.all([
      supabase.from("runner_gamification_settings").select("enabled").eq("id", true).maybeSingle(),
      supabase.rpc("get_runner_leaderboard", { p_period: period, p_current_profile_id: profile.id }),
      supabase.from("runner_streaks").select("current_streak,longest_streak,last_activity_date").eq("runner_id", profile.id).maybeSingle(),
      supabase.from("runner_streak_milestone_rules").select("milestone_days,reward_kind,reward_amount,reward_label,enabled").eq("enabled", true).order("milestone_days"),
      supabase.from("runner_streak_rewards").select("id,milestone_days,reward_kind,reward_amount,reward_label,status,earned_at").eq("runner_id", profile.id).order("earned_at", { ascending: false }).limit(20),
      supabase.from("runner_completed_job_events").select("completed_local_date").eq("runner_id", profile.id).gte("completed_local_date", shiftLocalDay(-34)),
    ]);

    const failure = settingsError || rankError || streakError || rulesError || rewardsError || eventsError;
    if (failure) {
      console.error("Gamification data load failed:", failure.message);
      return NextResponse.json({ error: "We couldn't load the leaderboard right now. Please try again." }, { status: 503 });
    }

    if (!settings?.enabled) {
      return NextResponse.json({ enabled: false, message: "The WENA leaderboard is getting ready." }, { headers: { "Cache-Control": "no-store" } });
    }

    const leaderboard = (ranks || []).map((row: any) => ({
      id: row.runner_id,
      name: row.display_name,
      earnings: Number(row.total_earnings || 0),
      completedErrands: Number(row.completed_errands || 0),
      rank: Number(row.leaderboard_rank),
      isCurrentUser: Boolean(row.is_current_user),
    }));
    const me = leaderboard.find((row: any) => row.isCurrentUser) || null;
    const above = me ? leaderboard.find((row: any) => row.rank === me.rank - 1) || null : null;
    const today = localDay();
    const yesterday = shiftLocalDay(-1);
    const lastDay = streak?.last_activity_date || null;
    const storedStreak = Number(streak?.current_streak || 0);
    const currentStreak = lastDay === today || lastDay === yesterday ? storedStreak : 0;
    const milestones = (rules || []).map((rule: any) => ({
      days: Number(rule.milestone_days),
      kind: rule.reward_kind,
      amount: Number(rule.reward_amount || 0),
      label: rule.reward_label,
    }));
    const nextMilestone = milestones.find((item: any) => item.days > currentStreak) || null;
    const earnedDays = new Set((events || []).map((event: any) => event.completed_local_date));

    return NextResponse.json({
      enabled: true,
      period,
      leaderboard: leaderboard.filter((row: any) => row.rank <= 10),
      me: me ? { ...me, amountToNextPlace: above ? Math.max(0, above.earnings - me.earnings + 0.01) : null, nextPlace: above?.rank ?? null } : null,
      streak: {
        current: currentStreak,
        longest: Number(streak?.longest_streak || 0),
        lastActivityDate: lastDay,
        activeToday: earnedDays.has(today),
        nextMilestone,
        daysToNextMilestone: nextMilestone ? Math.max(0, nextMilestone.days - currentStreak) : null,
        activityDates: Array.from(earnedDays),
      },
      rewards: rewards || [],
      rules: milestones,
      refreshedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (cause) {
    console.error("Gamification API error:", cause);
    return NextResponse.json({ error: "We couldn't load your WENA progress. Please try again." }, { status: 500 });
  }
}
