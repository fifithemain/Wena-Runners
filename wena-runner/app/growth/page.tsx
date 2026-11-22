import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/current-profile";
import GrowthClient from "./growth-client";

export const dynamic = "force-dynamic";

export default async function GrowthPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return <GrowthClient name={profile.full_name || profile.email} role={profile.role} signedIn />;
}
