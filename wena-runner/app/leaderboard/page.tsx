import { getCurrentProfile } from "@/lib/current-profile";
import LeaderboardClient from "./leaderboard-client";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const profile = await getCurrentProfile();
  return <LeaderboardClient name={profile?.full_name || "Your account"} role={profile?.role || "customer"} signedIn={Boolean(profile)} />;
}
