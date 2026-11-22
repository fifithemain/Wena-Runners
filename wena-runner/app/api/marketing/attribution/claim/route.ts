import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { getCurrentProfile } from "@/lib/current-profile";

export const dynamic = "force-dynamic";
function db() {
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;
  if(!url||!key) throw new Error("Growth services are not configured.");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function POST() {
  try {
    const profile=await getCurrentProfile();
    if(!profile) return NextResponse.json({ok:false},{status:401});
    const jar=await cookies();
    const visitor=jar.get("wena-referral-visitor")?.value;
    if(!visitor||jar.get("wena-referral-consent")?.value!=="granted") return NextResponse.json({ok:true,claimed:0});
    const supabase=db();
    const {data,error}=await supabase.from("marketing_attributions")
      .update({profile_id:profile.id,last_seen_at:new Date().toISOString()})
      .eq("anonymous_visitor_key",visitor).eq("consented",true).is("profile_id",null)
      .gte("first_seen_at",new Date(Date.now()-30*24*60*60*1000).toISOString())
      .select("id");
    if(error) throw error;
    return NextResponse.json({ok:true,claimed:data?.length||0});
  } catch(cause) {
    console.error("Referral attribution claim failed:",cause);
    return NextResponse.json({ok:false},{status:503});
  }
}
