import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
function db() {
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;
  if(!url||!key) throw new Error("Growth services are not configured.");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
function authorized(request:Request) {
  const expected=process.env.ADMIN_PASSWORD||"",supplied=request.headers.get("x-admin-password")||"";
  if(!expected||!supplied) return false;
  const a=Buffer.from(expected),b=Buffer.from(supplied);
  return a.length===b.length&&timingSafeEqual(a,b);
}
const fail=(message:string,status=400)=>NextResponse.json({error:message},{status});

export async function GET(request:Request) {
  if(!authorized(request)) return fail("Admin password is incorrect.",401);
  try {
    const supabase=db();
    const {data:rows,error}=await supabase.from("marketing_payout_requests")
      .select("id,partner_id,role_key,amount_zar,status,payout_reference,admin_note,created_at,processed_at,payout_method_snapshot,payout_account_name_snapshot,payout_account_details_snapshot,partner:marketing_partners(display_name,profile_id)")
      .order("created_at",{ascending:false}).limit(300);
    if(error) throw error;
    const profileIds=[...new Set((rows||[]).map((r:any)=>Array.isArray(r.partner)?r.partner[0]?.profile_id:r.partner?.profile_id).filter(Boolean))];
    const {data:profiles,error:profileError}=profileIds.length
      ?await supabase.from("profiles").select("id,full_name,email").in("id",profileIds)
      :{data:[],error:null};
    if(profileError) throw profileError;
    const profileMap=new Map((profiles||[]).map((p:any)=>[p.id,p]));
    const requests=(rows||[]).map((r:any)=>{
      const partner=Array.isArray(r.partner)?r.partner[0]:r.partner;
      return {...r,partner:partner?{...partner,profile:profileMap.get(partner.profile_id)||null}:null};
    });
    return NextResponse.json({requests},{headers:{"Cache-Control":"no-store"}});
  } catch(cause) {
    console.error("Growth payout admin load failed:",cause);
    return fail("Could not load Growth payout requests.",503);
  }
}

export async function POST(request:Request) {
  if(!authorized(request)) return fail("Admin password is incorrect.",401);
  try {
    const body=await request.json().catch(()=>({}));
    const requestId=typeof body.requestId==="string"?body.requestId:"";
    const status=body.status;
    const reference=typeof body.reference==="string"?body.reference.trim().slice(0,120):"";
    const note=typeof body.note==="string"?body.note.trim().slice(0,1000):"";
    if(!requestId||!["processing","paid","rejected"].includes(status)) return fail("Invalid payout review action.");
    if(status==="paid"&&!reference) return fail("Enter the bank or payment reference before marking the payout paid.");
    const supabase=db();
    const {data,error}=await supabase.rpc("admin_update_marketing_payout_request",{
      p_request_id:requestId,p_status:status,p_reference:reference,p_note:note,p_actor_profile_id:null
    });
    if(error) return fail(error.message,409);
    return NextResponse.json({result:data});
  } catch(cause) {
    console.error("Growth payout review failed:",cause);
    return fail("Could not update this payout request.",500);
  }
}
