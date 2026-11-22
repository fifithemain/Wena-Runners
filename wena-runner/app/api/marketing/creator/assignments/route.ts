import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentProfile } from "@/lib/current-profile";

export const dynamic = "force-dynamic";
function db() {
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) throw new Error("Growth services are not configured.");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function POST(request:Request) {
  try {
    const profile=await getCurrentProfile();
    if(!profile) return NextResponse.json({error:"Sign in first."},{status:401});
    const body=await request.json().catch(()=>({}));
    if(typeof body.assignmentId!=="string"||!["accepted","declined"].includes(body.status))
      return NextResponse.json({error:"Invalid assignment response."},{status:400});
    const supabase=db();
    const {data:partner}=await supabase.from("marketing_partners").select("id").eq("profile_id",profile.id).eq("status","active").maybeSingle();
    if(!partner) return NextResponse.json({error:"Growth profile not found."},{status:403});
    const {data:grant}=await supabase.from("marketing_partner_role_grants").select("id").eq("partner_id",partner.id).eq("role_key","creator").eq("status","active").maybeSingle();
    if(!grant) return NextResponse.json({error:"Your Creator access is not active."},{status:403});
    const {data,error}=await supabase.from("marketing_campaign_assignments").update({
      status:body.status,accepted_at:body.status==="accepted"?new Date().toISOString():null,
    }).eq("id",body.assignmentId).eq("partner_id",partner.id).eq("role_key","creator").eq("status","invited")
      .select("id,status").maybeSingle();
    if(error) throw error;
    if(!data) return NextResponse.json({error:"This invitation is no longer available."},{status:409});
    return NextResponse.json({assignment:data});
  } catch(cause) {
    console.error("Creator invitation response failed:",cause);
    return NextResponse.json({error:"We couldn't update this invitation."},{status:500});
  }
}
