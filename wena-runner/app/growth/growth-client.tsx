"use client";

import { useEffect, useMemo, useState } from "react";
import WorkspaceShell from "../workspace-shell";

type Payload = {
  enabled: boolean; message?: string; profile?: { fullName: string; role: string };
  partner?: { id: string; display_name: string; status: string } | null;
  grants: any[]; applications: any[]; links: any[]; assignments: any[]; ledger: any[]; campaigns: any[];
};
const roleNames: Record<string,string> = { affiliate: "Affiliate", creator: "Creator" };
const money = (value: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(value || 0));
const label = (value: string) => value.replaceAll("_"," ").replace(/\b\w/g, c => c.toUpperCase());

export default function GrowthClient({ name, role, signedIn }: { name: string; role: string; signedIn: boolean }) {
  const [data,setData] = useState<Payload | null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [success,setSuccess] = useState("");
  const [applicationRole,setApplicationRole] = useState<"affiliate"|"creator"|null>(null);
  const [motivation,setMotivation] = useState("");
  const [platforms,setPlatforms] = useState("");
  const [audience,setAudience] = useState("");
  const [portfolioUrl,setPortfolioUrl] = useState("");
  const [termsAccepted,setTermsAccepted] = useState(false);
  const [busy,setBusy] = useState(false);
  const [channel,setChannel] = useState("whatsapp");
  const [destination,setDestination] = useState("/");
  const [campaignId,setCampaignId] = useState("");
  const [deliverableNotes,setDeliverableNotes] = useState<Record<string,string>>({});
  const [deliverableUrls,setDeliverableUrls] = useState<Record<string,string>>({});
  const [licenseAccepted,setLicenseAccepted] = useState<Record<string,boolean>>({});
  const [payoutData,setPayoutData] = useState<any>(null);
  const [payoutError,setPayoutError] = useState("");
  const [payoutMethod,setPayoutMethod] = useState("");
  const [payoutAccountName,setPayoutAccountName] = useState("");
  const [payoutAccountDetails,setPayoutAccountDetails] = useState("");
  const [payoutAmounts,setPayoutAmounts] = useState<Record<string,string>>({affiliate:"",creator:""});

  async function loadPayouts() {
    setPayoutError("");
    try {
      const response=await fetch("/api/marketing/payouts",{cache:"no-store"});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||"Could not load payout details.");
      setPayoutData(result);
      setPayoutMethod(result.payoutProfile?.method||"");
      setPayoutAccountName(result.payoutProfile?.accountName||"");
    } catch(cause) { setPayoutError(cause instanceof Error?cause.message:"Could not load payout details."); }
  }

  async function load() {
    setError("");
    try {
      const response = await fetch("/api/marketing/me",{cache:"no-store"});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load Growth.");
      setData(result);
      await loadPayouts();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load Growth."); }
    finally { setLoading(false); }
  }
  useEffect(()=>{ load(); },[]);
  const activeRoles = useMemo(()=>new Set((data?.grants||[]).filter(g=>g.status==="active").map(g=>g.role_key)),[data]);
  const applicationsByRole = useMemo(()=>{
    const map: Record<string,any> = {};
    for (const app of data?.applications || []) if (!map[app.role_key] || new Date(app.submitted_at)>new Date(map[app.role_key].submitted_at)) map[app.role_key]=app;
    return map;
  },[data]);
  const totalPending = (data?.ledger||[]).filter(x=>x.entry_type==="pending").reduce((sum,x)=>sum+Number(x.amount_zar||0),0);
  const totalApproved = (data?.ledger||[]).filter(x=>x.entry_type==="approved").reduce((sum,x)=>sum+Number(x.amount_zar||0),0);
  const totalPaid = (data?.ledger||[]).filter(x=>x.entry_type==="paid").reduce((sum,x)=>sum+Number(x.amount_zar||0),0);

  async function apply(event: React.FormEvent) {
    event.preventDefault(); if (!applicationRole) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/marketing/applications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        roleKey:applicationRole, termsAccepted, motivation, platforms:platforms.split(",").map(x=>x.trim()).filter(Boolean), audience, portfolioUrl,
      })});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Application failed.");
      setApplicationRole(null); setMotivation(""); setPlatforms(""); setAudience(""); setPortfolioUrl(""); setTermsAccepted(false);
      setSuccess("Your application has been submitted. WENA will review it and update the status here.");
      await load();
    } catch(cause) { setError(cause instanceof Error?cause.message:"Application failed."); }
    finally { setBusy(false); }
  }

  async function createLink(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/marketing/affiliate/links",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({channel,destinationPath:destination,campaignId:campaignId||null})});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create link.");
      setSuccess("Your referral link is ready."); await load();
    } catch(cause) { setError(cause instanceof Error?cause.message:"Could not create link."); }
    finally { setBusy(false); }
  }

  async function respondToInvitation(assignmentId: string, status: "accepted"|"declined", acceptUsageLicense=false) {
    setBusy(true); setError(""); setSuccess("");
    try {
      const response=await fetch("/api/marketing/creator/assignments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({assignmentId,status,acceptUsageLicense})});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||"Could not update invitation.");
      setSuccess(status==="accepted"?"Creator campaign accepted.":"Creator invitation declined.");
      await load();
    } catch(cause) { setError(cause instanceof Error?cause.message:"Could not update invitation."); }
    finally { setBusy(false); }
  }

  async function savePayoutDetails(event: React.FormEvent) {
    event.preventDefault();setBusy(true);setError("");setSuccess("");setPayoutError("");
    try {
      const response=await fetch("/api/marketing/payouts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save_payout_details",method:payoutMethod,accountName:payoutAccountName,accountDetails:payoutAccountDetails})});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||"Could not save payout details.");
      setSuccess("Your Growth payout destination has been saved.");
      await loadPayouts();
    } catch(cause) { setPayoutError(cause instanceof Error?cause.message:"Could not save payout details."); }
    finally { setBusy(false); }
  }

  async function requestPayout(roleKey:"affiliate"|"creator") {
    setBusy(true);setError("");setSuccess("");setPayoutError("");
    try {
      const response=await fetch("/api/marketing/payouts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"request_payout",roleKey,amount:Number(payoutAmounts[roleKey])})});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||"Could not request payout.");
      setPayoutAmounts({...payoutAmounts,[roleKey]:""});
      setSuccess("Your payout request has been submitted. The amount is reserved while WENA reviews it.");
      await loadPayouts();
    } catch(cause) { setPayoutError(cause instanceof Error?cause.message:"Could not request payout."); }
    finally { setBusy(false); }
  }

  async function submitDeliverable(deliverableId: string) {
    setBusy(true); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/marketing/creator/deliverables",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({deliverableId,note:deliverableNotes[deliverableId]||"",url:deliverableUrls[deliverableId]||""})});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Submission failed.");
      setSuccess("Your creator deliverable has been submitted for review.");
      await load();
    } catch(cause) { setError(cause instanceof Error?cause.message:"Submission failed."); }
    finally { setBusy(false); }
  }

  if (loading) return <WorkspaceShell active="growth" role={role} name={name} signedIn={signedIn}><section className="workspace-page"><div className="growth-loading"><span className="growth-spinner"/>Preparing your Growth workspace…</div></section></WorkspaceShell>;
  if (data && !data.enabled) return <WorkspaceShell active="growth" role={role} name={name} signedIn={signedIn}><section className="workspace-page"><header className="pagehead"><p className="growth-eyebrow">WENA GROWTH</p><h1>Grow with WENA.</h1><p className="muted">One WENA account. More ways to earn, create, and build your community.</p></header><div className="growth-coming panel"><span className="growth-mark">✦</span><h2>Growth is getting ready</h2><p>{data.message}</p><p className="small">Your Customer and Runner access is unaffected.</p></div></section></WorkspaceShell>;
  if (!data) return <WorkspaceShell active="growth" role={role} name={name} signedIn={signedIn}><section className="workspace-page"><p className="error">{error || "Could not load your Growth workspace."}</p><button className="btn" onClick={load}>Try again</button></section></WorkspaceShell>;

  return <WorkspaceShell active="growth" role={role} name={name} signedIn={signedIn}>
    <section className="workspace-page growth-page">
      <header className="growth-hero"><div><p className="growth-eyebrow">WENA GROWTH · YOUR PARTNER SPACE</p><h1>More ways to <em>grow.</em></h1><p>Build your community as an Affiliate, create with WENA as a Creator, or do both from this one account.</p></div><div className="growth-hero-mark" aria-hidden="true">W<span>+</span></div></header>
      {error && <p className="error" role="alert">{error}</p>}{success && <p className="success" role="status">{success}</p>}
      <div className="growth-stats"><article className="growth-stat"><span>Pending rewards</span><strong>{money(totalPending)}</strong></article><article className="growth-stat"><span>Approved rewards</span><strong>{money(totalApproved)}</strong></article><article className="growth-stat"><span>Paid to date</span><strong>{money(totalPaid)}</strong></article></div>
      <div className="growth-section-head"><div><h2>Your Growth roles</h2><p>Each role is reviewed independently. Your WENA marketplace account stays the same.</p></div><span className="growth-account-pill">{data.profile?.role || role} account</span></div>
      <div className="growth-role-grid">
        {(["affiliate","creator"] as const).map((key)=> {
          const grant = data.grants.find(g=>g.role_key===key), app = applicationsByRole[key], active = activeRoles.has(key);
          return <article className="growth-role-card" key={key}>
            <div className="growth-role-top"><span className={key==="affiliate"?"growth-role-icon affiliate":"growth-role-icon creator"}>{key==="affiliate"?"↗":"✦"}</span><span className={active?"growth-state active":app?"growth-state "+app.status:"growth-state"}>{active?"Active":app?label(app.status):"Not applied"}</span></div>
            <h3>{roleNames[key]}</h3><p>{key==="affiliate"?"Share WENA with your network, create referral links, and earn rewards from verified qualifying activity.":"Collaborate on WENA campaigns, receive creative briefs, submit content, and earn agreed creator fees."}</p>
            {active ? <p className="growth-active-copy">Your {roleNames[key]} access is active on this WENA account.</p> : app && !["declined","withdrawn"].includes(app.status) && grant?.status!=="revoked" ? <div className="growth-application-note"><strong>{label(app.status)}</strong><span>{app.review_note || (app.status==="pending"?"Your application is in the review queue.":app.status==="more_information"?"WENA needs a little more information before deciding.":"Check back for an update from WENA.")}</span>{app.status==="more_information"&&<button className="btn" onClick={()=>{setApplicationRole(key);setTermsAccepted(false);setError("");}}>Update application</button>}</div> : <div className="growth-application-note">{app&&<span>Previous application: {label(app.status)}{app.review_note?" · "+app.review_note:""}</span>}<button className="btn" onClick={()=>{setApplicationRole(key);setTermsAccepted(false);setError("");}}>Apply as {roleNames[key]}</button></div>}
            {grant && grant.status!=="active" && <p className="small">Access {grant.status}. Your other WENA roles are unchanged.</p>}
          </article>;
        })}
      </div>

      {activeRoles.has("affiliate") && <section className="growth-module">
        <div className="growth-section-head"><div><h2>Affiliate links</h2><p>Create a unique WENA referral link for each channel.</p></div><span className="growth-state active">Affiliate active</span></div>
        <form className="growth-link-form" onSubmit={createLink}>
          <label>Channel<select value={channel} onChange={e=>setChannel(e.target.value)}><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="facebook">Facebook</option><option value="youtube">YouTube</option><option value="direct">Direct</option><option value="other">Other</option></select></label>
          <label>WENA destination<select value={destination} onChange={e=>setDestination(e.target.value)}><option value="/">WENA home</option><option value="/jobs">Errand marketplace</option><option value="/signup">Create a WENA account</option></select></label><label>Campaign<select required value={campaignId} onChange={e=>setCampaignId(e.target.value)}><option value="">Select an active campaign</option>{(data.campaigns||[]).map((campaign:any)=><option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></label>
          <button className="btn" disabled={busy}>Create referral link</button>
        </form>
        <div className="growth-link-list">{data.links.length?data.links.map(link=><div className="growth-link-row" key={link.id}><div><strong>{link.code}</strong><span>{link.channel} · {link.destination_path}</span></div><a href={"/r/"+link.code} target="_blank" rel="noreferrer">Open link ↗</a><button type="button" className="btn ghost" onClick={()=>navigator.clipboard?.writeText(window.location.origin+"/r/"+link.code)}>Copy</button></div>):<p className="small">Your referral links will appear here.</p>}</div>
      </section>}

      {activeRoles.has("creator") && <section className="growth-module"><div className="growth-section-head"><div><h2>Creator studio</h2><p>Campaign invitations, creative briefs, submissions, and usage permissions.</p></div><span className="growth-state active">Creator active</span></div>
        {data.assignments.filter(a=>a.role_key==="creator").length ? data.assignments.filter(a=>a.role_key==="creator").map(a=><article className="growth-assignment" key={a.id}>
          <div><strong>{a.campaign?.name || "WENA creator campaign"}</strong><span>{a.campaign?.description || "Campaign brief will appear here."}</span></div>
          <div className="growth-assignment-meta"><span>{label(a.status)}</span><strong>{money(Number(a.agreed_fee_zar||0))}</strong></div>{a.status==="invited"&&<div className="growth-grant-actions"><button type="button" className="btn" disabled={busy} onClick={()=>respondToInvitation(a.id,"accepted")}>Accept invitation</button><button type="button" className="btn ghost" disabled={busy} onClick={()=>respondToInvitation(a.id,"declined")}>Decline</button></div>}
          {(a.deliverables||[]).map((d:any)=><div className="growth-deliverable" key={d.id}><div><strong>{d.title}</strong><span>{d.brief||"No additional brief."}{d.due_at?" · Due "+new Date(d.due_at).toLocaleDateString("en-ZA"):""}</span><small>{label(d.status)}</small>{d.review_note&&<p className="small">{d.review_note}</p>}</div>
            {["not_started","changes_requested"].includes(d.status)&&<div className="growth-deliverable-form"><textarea rows={2} value={deliverableNotes[d.id]||""} onChange={e=>setDeliverableNotes({...deliverableNotes,[d.id]:e.target.value})} placeholder="Add a note about your submission"/><input type="url" value={deliverableUrls[d.id]||""} onChange={e=>setDeliverableUrls({...deliverableUrls,[d.id]:e.target.value})} placeholder="https:// link to your content (optional)"/><button type="button" className="btn" disabled={busy||(!deliverableNotes[d.id]?.trim()&&!deliverableUrls[d.id]?.trim())} onClick={()=>submitDeliverable(d.id)}>Submit for review</button></div>}
            {d.submission_path&&<a href={d.submission_path} target="_blank" rel="noreferrer">View submitted content ↗</a>}
          </div>)}
        </article>) : <div className="growth-empty"><strong>No creator briefs yet</strong><p>When WENA invites you to a campaign, the brief, deliverables, deadline, and agreed fee will appear here.</p></div>}
      </section>}

      {data.ledger.length>0 && <section className="growth-module"><div className="growth-section-head"><div><h2>Growth rewards</h2><p>Affiliate commissions and Creator fees are shown separately from Runner earnings.</p></div></div><div className="growth-ledger">{data.ledger.map(entry=><div className="growth-ledger-row" key={entry.id}><div><strong>{entry.reward_type.replaceAll("_"," ")} · {roleNames[entry.role_key]}</strong><span>{entry.description || label(entry.entry_type)} · {new Date(entry.created_at).toLocaleDateString("en-ZA")}</span></div><div><strong>{money(entry.amount_zar)}</strong><span>{label(entry.entry_type)}</span></div></div>)}</div></section>}
    </section>

    {applicationRole && <div className="growth-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setApplicationRole(null);}}>
      <form className="growth-modal" onSubmit={apply}><button type="button" className="growth-modal-close" aria-label="Close" onClick={()=>setApplicationRole(null)}>×</button>
        <p className="growth-eyebrow">WENA GROWTH APPLICATION</p><h2>Apply as a {roleNames[applicationRole]}.</h2><p className="muted">This request will be attached to your existing WENA account. No new account is created.</p>
        <label>Why would you like to join?<textarea required minLength={20} maxLength={1200} rows={4} value={motivation} onChange={e=>setMotivation(e.target.value)} placeholder="Tell us about your goals and how you plan to promote or create with WENA."/></label>
        <label>Platforms (comma separated)<input value={platforms} onChange={e=>setPlatforms(e.target.value)} placeholder="WhatsApp, Instagram, TikTok"/></label>
        <label>Audience or community<textarea rows={2} maxLength={300} value={audience} onChange={e=>setAudience(e.target.value)} placeholder="Who do you reach? What community do you serve?"/></label>
        <label>Portfolio or social profile URL (optional)<input type="url" value={portfolioUrl} onChange={e=>setPortfolioUrl(e.target.value)} placeholder="https://…"/></label>
        <label className="growth-terms"><input type="checkbox" checked={termsAccepted} onChange={e=>setTermsAccepted(e.target.checked)}/> I agree to the <a href="/growth/terms" target="_blank" rel="noreferrer">WENA Growth programme terms</a> and understand that applying does not guarantee approval or earnings.</label>
        <div className="growth-modal-actions"><button type="button" className="btn ghost" onClick={()=>setApplicationRole(null)}>Cancel</button><button className="btn" disabled={busy||!termsAccepted}>{busy?"Submitting…":"Submit application"}</button></div>
      </form>
    </div>}
  </WorkspaceShell>;
}
