import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { getCurrentProfile } from "@/lib/current-profile";

export const dynamic = "force-dynamic";
function db() {
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;
  if(!url||!key) throw new Error("Growth services are not configured.");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function POST(request:Request) {
  try {
    if(cookies().get("wena-referral-consent")?.value!=="granted")
      return NextResponse.json({error:"Referral measurement consent is required."},{status:403});
    const body=await request.json().catch(()=>({}));
    const code=typeof body.code==="string"?body.code.toUpperCase().replace(/[^A-F0-9]/g,"").slice(0,12):"";
    if(!code) return NextResponse.json({error:"Referral code is missing."},{status:400});
    const supabase=db();
    const {data:flag}=await supabase.from("marketing_feature_flags").select("growth_enabled").eq("id",true).maybeSingle();
    if(!flag?.growth_enabled) return NextResponse.json({ok:false},{status:503});
    const {data:link}=await supabase.from("marketing_tracking_links").select("id,partner_id,campaign_id,channel,status").eq("code",code).eq("status","active").maybeSingle();
    if(!link) return NextResponse.json({error:"Referral link is no longer active."},{status:404});
    if(link.campaign_id) {
      const {data:campaign}=await supabase.from("marketing_campaigns").select("id,status").eq("id",link.campaign_id).eq("status","active").maybeSingle();
      if(!campaign) return NextResponse.json({error:"Campaign is no longer active."},{status:404});
    }
    const jar=cookies();
    const visitor=jar.get("wena-referral-visitor")?.value||randomUUID();
    const profile=await getCurrentProfile();
    const {error}=await supabase.from("marketing_attributions").insert({
      tracking_link_id:link.id,partner_id:link.partner_id,anonymous_visitor_key:visitor,
      profile_id:profile?.id||null,source:"partner_link",medium:link.channel,consented:true,
    });
    if(error) throw error;
    const response=NextResponse.json({ok:true});
    response.cookies.set("wena-referral-visitor",visitor,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*30});
    return response;
  } catch(cause) {
    console.error("Referral measurement failed:",cause);
    return NextResponse.json({error:"Could not record this referral."},{status:503});
  }
}
