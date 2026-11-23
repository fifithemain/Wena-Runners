import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
function db() {
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;
  if(!url||!key) throw new Error("Growth services are not configured.");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function POST() {
  try {
    const visitor=(await cookies()).get("wena-referral-visitor")?.value;
    if(!visitor) return NextResponse.json({ok:true,revoked:0});
    const supabase=db();
    const {data,error}=await supabase.from("marketing_attributions").update({
      consented:false,profile_id:null,anonymous_visitor_key:null,last_seen_at:new Date().toISOString(),
    }).eq("anonymous_visitor_key",visitor).eq("consented",true).select("id");
    if(error) throw error;
    const response=NextResponse.json({ok:true,revoked:data?.length||0});
    response.cookies.set("wena-referral-visitor","",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:0});
    return response;
  } catch(cause) {
    console.error("Referral consent withdrawal failed:",cause);
    return NextResponse.json({error:"Could not update referral preferences."},{status:503});
  }
}
