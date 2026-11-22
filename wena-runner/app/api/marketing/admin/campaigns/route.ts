import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
function db() {
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) throw new Error("Growth services are not configured.");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
function authorized(request:Request) {
  const expected=process.env.ADMIN_PASSWORD||"", supplied=request.headers.get("x-admin-password")||"";
  if(!expected||!supplied) return false;
  const a=Buffer.from(expected),b=Buffer.from(supplied);
  return a.length===b.length&&timingSafeEqual(a,b);
}
const fail=(message:string,status=400)=>NextResponse.json({error:message},{status});

export async function GET(request:Request) {
  if(!authorized(request)) return fail("Admin password is incorrect.",401);
  try {
    const supabase=db();
    const [campaigns,grants,partners,rules,deliverables]=await Promise.all([
      supabase.from("marketing_campaigns").select("id,name,slug,description,campaign_type,status,starts_at,ends_at,budget_zar,created_at").order("created_at",{ascending:false}),
      supabase.from("marketing_partner_role_grants").select("id,partner_id,role_key,status").eq("status","active"),
      supabase.from("marketing_partners").select("id,display_name,profile_id").eq("status","active"),
      supabase.from("marketing_reward_rules").select("id,campaign_id,role_key,reward_type,calculation,amount,cap_amount,enabled"),
      supabase.from("marketing_creator_deliverables").select("id,title,brief,status,submission_path,submission_note,submitted_at,assignment:marketing_campaign_assignments!inner(id,partner_id,campaign_id,agreed_fee_zar,partner:marketing_partners(display_name))").in("status",["submitted","changes_requested"]).order("submitted_at",{ascending:true}),
    ]);
    const error=campaigns.error||grants.error||partners.error||rules.error||deliverables.error;
    if(error) throw error;
    return NextResponse.json({campaigns:campaigns.data||[],grants:grants.data||[],partners:partners.data||[],rules:rules.data||[],deliverables:deliverables.data||[]},{headers:{"Cache-Control":"no-store"}});
  } catch(cause) {
    console.error("Growth campaign load failed:",cause);
    return fail("Could not load campaigns.",503);
  }
}

export async function POST(request:Request) {
  if(!authorized(request)) return fail("Admin password is incorrect.",401);
  try {
    const body=await request.json().catch(()=>({}));
    const supabase=db();
    if(body.action==="review_deliverable") {
      const deliverableId=String(body.deliverableId||"");
      const status=body.status;
      if(!deliverableId||!["approved","changes_requested","rejected"].includes(status)) return fail("Invalid deliverable review.");
      const {data,error}=await supabase.rpc("admin_review_creator_deliverable",{
        p_deliverable_id:deliverableId,p_status:status,
        p_review_note:typeof body.note==="string"?body.note.trim().slice(0,1000):"",
        p_actor_profile_id:null,
      });
      if(error) return fail(error.message,409);
      return NextResponse.json({result:data});
    }
    if(body.action==="create_campaign") {
      const name=typeof body.name==="string"?body.name.trim().slice(0,100):"";
      const description=typeof body.description==="string"?body.description.trim().slice(0,2000):"";
      const type=body.campaignType;
      const roles=type==="mixed"?["affiliate","creator"]:[type];
      const slug=(typeof body.slug==="string"?body.slug:name).toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80);
      if(!name||!slug||!["affiliate","creator","mixed"].includes(type)) return fail("Enter a campaign name and valid campaign type.");
      const {data:campaign,error}=await supabase.from("marketing_campaigns").insert({name,slug,description,campaign_type:type,status:"draft"}).select("id,name,slug,campaign_type,status").single();
      if(error) return fail(error.code==="23505"?"That campaign slug is already in use.":error.message,409);
      const {error:roleError}=await supabase.from("marketing_campaign_roles").insert(roles.map((role_key:string)=>({campaign_id:campaign.id,role_key})));
      if(roleError) return fail("Campaign was created but role eligibility could not be saved. Please contact support.",500);
      await supabase.from("marketing_audit_log").insert({action:"campaign_created",target_type:"marketing_campaign",target_id:campaign.id,metadata:{campaign_type:type,slug}});
      return NextResponse.json({campaign},{status:201});
    }
    if(body.action==="configure_affiliate_rule") {
      const campaignId=String(body.campaignId||"");
      const calculation=body.calculation==="fixed"?"fixed":"percentage";
      const amount=Number(body.amount), cap=body.capAmount===""||body.capAmount==null?null:Number(body.capAmount);
      if(!campaignId||!Number.isFinite(amount)||amount<=0||amount>100000|| (cap!==null&&(!Number.isFinite(cap)||cap<=0))) return fail("Enter a valid positive reward amount and optional cap.");
      const {data:eligible}=await supabase.from("marketing_campaign_roles").select("campaign_id").eq("campaign_id",campaignId).eq("role_key","affiliate").maybeSingle();
      if(!eligible) return fail("This campaign is not configured for Affiliates.",409);
      const {data,error}=await supabase.from("marketing_reward_rules").upsert({
        campaign_id:campaignId,role_key:"affiliate",reward_type:"commission",calculation,amount,cap_amount:cap,
        currency:"ZAR",enabled:body.enabled===true,
      },{onConflict:"campaign_id,role_key,reward_type"}).select("id,campaign_id,calculation,amount,cap_amount,enabled").single();
      if(error) throw error;
      await supabase.from("marketing_audit_log").insert({action:"affiliate_reward_rule_configured",target_type:"marketing_reward_rule",target_id:data.id,metadata:{campaign_id:campaignId,enabled:body.enabled===true,calculation,amount}});
      return NextResponse.json({rule:data});
    }
    if(body.action==="set_campaign_status") {
      const campaignId=String(body.campaignId||""), status=body.status;
      if(!campaignId||!["draft","scheduled","active","paused","ended"].includes(status)) return fail("Invalid campaign status.");
      if(status==="active") {
        const {data:affiliateRole}=await supabase.from("marketing_campaign_roles").select("campaign_id").eq("campaign_id",campaignId).eq("role_key","affiliate").maybeSingle();
        if(affiliateRole) {
          const {data:rule}=await supabase.from("marketing_reward_rules").select("id").eq("campaign_id",campaignId).eq("role_key","affiliate").eq("reward_type","commission").eq("enabled",true).maybeSingle();
          if(!rule) return fail("Configure and enable an approved Affiliate commission rule before activating this campaign.",409);
        }
      }
      const {data,error}=await supabase.from("marketing_campaigns").update({status,updated_at:new Date().toISOString()}).eq("id",campaignId).select("id,status").maybeSingle();
      if(error) throw error;
      if(!data) return fail("Campaign not found.",404);
      await supabase.from("marketing_audit_log").insert({action:"campaign_status_changed",target_type:"marketing_campaign",target_id:data.id,metadata:{status}});
      return NextResponse.json({campaign:data});
    }
    if(body.action==="assign_creator") {
      const campaignId=String(body.campaignId||""), partnerId=String(body.partnerId||"");
      const fee=Number(body.agreedFee), title=typeof body.deliverableTitle==="string"?body.deliverableTitle.trim().slice(0,150):"";
      const brief=typeof body.brief==="string"?body.brief.trim().slice(0,2000):"";
      if(!campaignId||!partnerId||!title||!Number.isFinite(fee)||fee<0||fee>100000) return fail("Choose a creator, campaign, deliverable title and valid fee.");
      const {data:eligible}=await supabase.from("marketing_campaign_roles").select("campaign_id").eq("campaign_id",campaignId).eq("role_key","creator").maybeSingle();
      const {data:grant}=await supabase.from("marketing_partner_role_grants").select("id").eq("partner_id",partnerId).eq("role_key","creator").eq("status","active").maybeSingle();
      if(!eligible||!grant) return fail("This creator or campaign is not eligible for assignment.",403);
      const {data:assignment,error}=await supabase.from("marketing_campaign_assignments").insert({
        campaign_id:campaignId,partner_id:partnerId,role_key:"creator",status:"invited",agreed_fee_zar:fee,
      }).select("id").single();
      if(error) return fail(error.code==="23505"?"This creator already has an assignment for this campaign.":error.message,409);
      const {data:deliverable,error:deliverableError}=await supabase.from("marketing_creator_deliverables").insert({
        assignment_id:assignment.id,title,brief,due_at:body.dueAt||null,
      }).select("id,title").single();
      if(deliverableError) return fail("Assignment created but deliverable could not be added.",500);
      await supabase.from("marketing_audit_log").insert({action:"creator_campaign_invited",target_type:"marketing_campaign_assignment",target_id:assignment.id,metadata:{campaign_id:campaignId,partner_id:partnerId,agreed_fee_zar:fee,deliverable_id:deliverable.id}});
      return NextResponse.json({assignment,deliverable},{status:201});
    }
    return fail("Invalid campaign action.");
  } catch(cause) {
    console.error("Growth campaign action failed:",cause);
    return fail("The campaign action failed.",500);
  }
}
