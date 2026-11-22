import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
function db() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Referral service is unavailable.");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function GET(request: Request, context: { params: { code: string } }) {
  const code = String(context.params.code || "").toUpperCase().replace(/[^A-F0-9]/g,"").slice(0,12);
  const fallback = new URL("/",request.url);
  try {
    const supabase=db();
    const {data:link,error}=await supabase.from("marketing_tracking_links")
      .select("id,partner_id,destination_path,channel,status").eq("code",code).eq("status","active").maybeSingle();
    if(error||!link) return NextResponse.redirect(fallback);
    const destination = typeof link.destination_path==="string" && link.destination_path.startsWith("/") && !link.destination_path.startsWith("//") ? link.destination_path : "/";
    const response=NextResponse.redirect(new URL(destination,request.url));
    const jar=cookies();
    if(jar.get("wena-referral-consent")?.value==="granted") {
      const visitor=jar.get("wena-referral-visitor")?.value || randomUUID();
      await supabase.from("marketing_attributions").insert({
        tracking_link_id:link.id,partner_id:link.partner_id,anonymous_visitor_key:visitor,
        source:"partner_link",medium:link.channel,consented:true,
      });
      response.cookies.set("wena-referral-visitor",visitor,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*30});
    }
    return response;
  } catch (cause) {
    console.error("Referral redirect failed:",cause);
    return NextResponse.redirect(fallback);
  }
}
