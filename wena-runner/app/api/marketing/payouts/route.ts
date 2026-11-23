import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentProfile } from "@/lib/current-profile";

export const dynamic = "force-dynamic";
function db() {
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;
  if(!url||!key) throw new Error("Growth services are not configured.");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
const fail=(message:string,status=400)=>NextResponse.json({error:message},{status});
const balanceFor=(ledger:any[],requests:any[],role:string)=>{
  const earned=ledger.filter(x=>x.role_key===role).reduce((sum,x)=>{
    if(x.entry_type==="approved"||x.entry_type==="adjustment") return sum+Number(x.amount_zar||0);
    if(x.entry_type==="reversal") return sum-Math.abs(Number(x.amount_zar||0));
    if(x.entry_type==="paid"&&x.reward_type==="payout") return sum-Number(x.amount_zar||0);
    return sum;
  },0);
  const reserved=requests.filter(x=>x.role_key===role&&["pending","processing"].includes(x.status)).reduce((sum,x)=>sum+Number(x.amount_zar||0),0);
  return {approvedNet:Number(earned.toFixed(2)),reserved:Number(reserved.toFixed(2)),available:Number((earned-reserved).toFixed(2))};
};

export async function GET() {
  try {
    const profile=await getCurrentProfile();
    if(!profile) return fail("Sign in to view Growth payouts.",401);
    const supabase=db();
    const {data:flag}=await supabase.from("marketing_feature_flags").select("growth_enabled").eq("id",true).maybeSingle();
    if(!flag?.growth_enabled) return NextResponse.json({enabled:false},{headers:{"Cache-Control":"no-store"}});
    const [{data:partner,error:partnerError},{data:profileData,error:profileError}]=await Promise.all([
      supabase.from("marketing_partners").select("id,status").eq("profile_id",profile.id).maybeSingle(),
      supabase.from("profiles").select("payout_method,payout_account_name,payout_account_details").eq("id",profile.id).maybeSingle()
    ]);
    if(partnerError||profileError) throw partnerError||profileError;
    if(!partner) return NextResponse.json({balances:{affiliate:{approvedNet:0,reserved:0,available:0},creator:{approvedNet:0,reserved:0,available:0}},requests:[],payoutProfile:{method:"",accountName:"",configured:false}},{headers:{"Cache-Control":"no-store"}});
    const [ledgerResult,requestResult,grantResult]=await Promise.all([
      supabase.from("marketing_reward_ledger").select("role_key,entry_type,reward_type,amount_zar").eq("partner_id",partner.id),
      supabase.from("marketing_payout_requests").select("id,role_key,amount_zar,status,payout_reference,admin_note,created_at,processed_at").eq("partner_id",partner.id).order("created_at",{ascending:false}).limit(50),
      supabase.from("marketing_partner_role_grants").select("role_key,status").eq("partner_id",partner.id)
    ]);
    if(ledgerResult.error||requestResult.error||grantResult.error) throw ledgerResult.error||requestResult.error||grantResult.error;
    const ledger=ledgerResult.data||[],requests=requestResult.data||[];
    const balances={affiliate:balanceFor(ledger,requests,"affiliate"),creator:balanceFor(ledger,requests,"creator")};
    const activeRoles=(grantResult.data||[]).filter(g=>g.status==="active").map(g=>g.role_key);
    return NextResponse.json({
      balances,requests,activeRoles,
      payoutProfile:{method:profileData?.payout_method||"",accountName:profileData?.payout_account_name||"",configured:!!(profileData?.payout_method?.trim()&&profileData?.payout_account_name?.trim()&&profileData?.payout_account_details?.trim())}
    },{headers:{"Cache-Control":"no-store, max-age=0"}});
  } catch(cause) {
    console.error("Growth payout summary failed:",cause);
    return fail("Could not load your Growth payout details.",503);
  }
}

export async function POST(request:Request) {
  try {
    const profile=await getCurrentProfile();
    if(!profile) return fail("Sign in first.",401);
    const body=await request.json().catch(()=>({}));
    const supabase=db();
    const {data:flag}=await supabase.from("marketing_feature_flags").select("growth_enabled").eq("id",true).maybeSingle();
    if(!flag?.growth_enabled) return fail("WENA Growth payouts are not enabled.",503);
    if(body.action==="save_payout_details") {
      const method=typeof body.method==="string"?body.method.trim().slice(0,60):"";
      const accountName=typeof body.accountName==="string"?body.accountName.trim().slice(0,120):"";
      const accountDetails=typeof body.accountDetails==="string"?body.accountDetails.trim().slice(0,500):"";
      if(!method||!accountName||accountDetails.length<4) return fail("Enter your payout method, account holder name and payment details.");
      const {error}=await supabase.from("profiles").update({payout_method:method,payout_account_name:accountName,payout_account_details:accountDetails}).eq("id",profile.id);
      if(error) throw error;
      await supabase.from("marketing_audit_log").insert({actor_profile_id:profile.id,action:"growth_payout_details_updated",target_type:"profile",target_id:profile.id,metadata:{method}});
      return NextResponse.json({ok:true});
    }
    if(body.action==="request_payout") {
      const roleKey=body.roleKey;
      const amount=Number(body.amount);
      if(!["affiliate","creator"].includes(roleKey)||!Number.isFinite(amount)||amount<1||amount>1000000) return fail("Enter a valid role and payout amount of at least R1.");
      const {data:partner,error:partnerError}=await supabase.from("marketing_partners").select("id").eq("profile_id",profile.id).eq("status","active").maybeSingle();
      if(partnerError) throw partnerError;
      if(!partner) return fail("Your Growth partner profile is not active.",403);
      const {data,error}=await supabase.rpc("create_marketing_payout_request",{p_partner_id:partner.id,p_role_key:roleKey,p_amount_zar:amount});
      if(error) return fail(error.message,409);
      return NextResponse.json({request:data},{status:201});
    }
    return fail("Choose a valid payout action.");
  } catch(cause) {
    console.error("Growth payout action failed:",cause);
    return fail("We couldn't update your Growth payout details.",500);
  }
}
