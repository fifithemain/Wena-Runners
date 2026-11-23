import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/current-profile";
import LeaderboardClient from "./leaderboard-client";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return <LeaderboardClient name={profile.full_name} role={profile.role} signedIn />;
}
