"use client";

import Link from "next/link";
import { useState } from "react";

export default function GrowthCampaignAdmin() {
  const [password,setPassword]=useState("");
  const [data,setData]=useState<any>(null);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");
  const [busy,setBusy]=useState(false);
  const [name,setName]=useState("");
  const [slug,setSlug]=useState("");
  const [description,setDescription]=useState("");
  const [type,setType]=useState("mixed");
  const [campaignId,setCampaignId]=useState("");
  const [calculation,setCalculation]=useState("percentage");
  const [amount,setAmount]=useState("");
  const [cap,setCap]=useState("");
  const [enableRule,setEnableRule]=useState(false);
  const [creatorId,setCreatorId]=useState("");
  const [fee,setFee]=useState("");
  const [deliverableTitle,setDeliverableTitle]=useState("");
  const [brief,setBrief]=useState("");
  const [dueAt,setDueAt]=useState("");

  async function load() {
    setError("");
    try {
      const response=await fetch("/api/marketing/admin/campaigns",{headers:{"x-admin-password":password},cache:"no-store"});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||"Could not load campaigns.");
      setData(result);
      if(!campaignId&&result.campaigns?.[0]) setCampaignId(result.campaigns[0].id);
    } catch(cause) { setError(cause instanceof Error?cause.message:"Could not load campaigns."); }
  }
  async function act(body:any) {
    setBusy(true);setError("");setSuccess("");
    try {
      const response=await fetch("/api/marketing/admin/campaigns",{method:"POST",headers:{"Content-Type":"application/json","x-admin-password":password},body:JSON.stringify(body)});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||"Campaign action failed.");
      setSuccess("Changes saved.");await load();
    } catch(cause) { setError(cause instanceof Error?cause.message:"Campaign action failed."); }
    finally { setBusy(false); }
  }
  const activeCreators=(data?.grants||[]).filter((g:any)=>g.role_key==="creator"&&g.status==="active");
  const creatorOptions=activeCreators.map((g:any)=>({id:g.partner_id,name:data.partners?.find((p:any)=>p.id===g.partner_id)?.display_name||"Approved creator"}));
  const selectedCampaign=data?.campaigns?.find((c:any)=>c.id===campaignId);
  const selectedRules=(data?.rules||[]).filter((r:any)=>r.campaign_id===campaignId);
  return <main className="admin-growth-page"><nav className="shell nav"><Link href="/" className="brand"><span className="brand-symbol">w</span><span className="brand-wordmark">wena<span>runners</span></span></Link><Link href="/admin/marketing">Growth applications</Link></nav>
    <section className="shell"><header className="pagehead"><p className="growth-eyebrow">WENA ADMINISTRATION</p><h1>Growth campaigns</h1><p className="muted">Create campaigns, configure commission rules, and invite approved Creators to deliverables.</p></header>
      {error&&<p className="error" role="alert">{error}</p>}{success&&<p className="success" role="status">{success}</p>}
      {!data&&<div className="panel growth-admin-login"><label>Admin password<input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="btn" onClick={load}>Open campaigns</button></div>}
      {data&&<>
        <section className="growth-module"><h2>Create a campaign</h2><form className="growth-campaign-form" onSubmit={e=>{e.preventDefault();act({action:"create_campaign",name,slug,description,campaignType:type});}}>
          <label>Campaign name<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="Campus launch"/></label>
          <label>Slug<input maxLength={80} value={slug} onChange={e=>setSlug(e.target.value)} placeholder="campus-launch (auto from name if blank)"/></label>
          <label>Campaign type<select value={type} onChange={e=>setType(e.target.value)}><option value="mixed">Affiliate + Creator</option><option value="affiliate">Affiliate only</option><option value="creator">Creator only</option></select></label>
          <label className="campaign-wide">Description<textarea rows={3} maxLength={2000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Campaign objective, audience and participation guidelines."/></label>
          <button className="btn" disabled={busy}>Create draft campaign</button>
        </form></section>

        <section className="growth-module"><div className="growth-section-head"><div><h2>Campaign setup</h2><p>Reward rules stay disabled until explicitly enabled by an administrator.</p></div><button className="btn ghost" onClick={load}>Refresh</button></div>
          <label className="campaign-picker">Choose campaign<select value={campaignId} onChange={e=>setCampaignId(e.target.value)}><option value="">Select campaign</option>{data.campaigns.map((c:any)=><option key={c.id} value={c.id}>{c.name} · {c.status}</option>)}</select></label>
          {selectedCampaign&&<><div className="growth-admin-card-head"><div><span className="growth-admin-role">{selectedCampaign.campaign_type}</span><h3>{selectedCampaign.name}</h3><p>{selectedCampaign.description||"No description."}</p></div><span className={"growth-state "+selectedCampaign.status}>{selectedCampaign.status}</span></div>
            <div className="growth-grant-actions">{["draft","active","paused","ended"].filter(s=>s!==selectedCampaign.status).map(s=><button key={s} className="btn ghost" disabled={busy} onClick={()=>act({action:"set_campaign_status",campaignId,status:s})}>{s==="active"?"Activate":s==="paused"?"Pause":s==="ended"?"End":"Return to draft"}</button>)}</div>
            {["affiliate","mixed"].includes(selectedCampaign.campaign_type)&&<><h3>Affiliate commission rule</h3><form className="growth-campaign-form" onSubmit={e=>{e.preventDefault();act({action:"configure_affiliate_rule",campaignId,calculation,amount:Number(amount),capAmount:cap?Number(cap):null,enabled:enableRule});}}>
              <label>Calculation<select value={calculation} onChange={e=>setCalculation(e.target.value)}><option value="percentage">Percentage of qualifying Runner amount</option><option value="fixed">Fixed ZAR per qualifying completed errand</option></select></label>
              <label>{calculation==="percentage"?"Commission (%)":"Commission (ZAR)"}<input required type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
              <label>Maximum per conversion (ZAR, optional)<input type="number" min="0.01" step="0.01" value={cap} onChange={e=>setCap(e.target.value)}/></label>
              <label className="campaign-check"><input type="checkbox" checked={enableRule} onChange={e=>setEnableRule(e.target.checked)}/> Enable this commission rule</label>
              <button className="btn" disabled={busy||!amount}>Save commission rule</button>
            </form><div className="small">Existing rules: {selectedRules.length?selectedRules.map((r:any)=>r.calculation+" "+r.amount+(r.calculation==="percentage"?"%":" ZAR")+" · "+(r.enabled?"enabled":"disabled")).join(" / "):"No rule configured."}</div></>}
          </>}
        </section>

        <section className="growth-module"><h2>Invite an approved Creator</h2><p className="muted">An invitation is attached to the creator’s existing WENA profile. The agreed fee is recorded before work begins.</p>
          <form className="growth-campaign-form" onSubmit={e=>{e.preventDefault();act({action:"assign_creator",campaignId,partnerId:creatorId,agreedFee:Number(fee),deliverableTitle,brief,dueAt:dueAt?new Date(dueAt).toISOString():null});}}>
            <label>Campaign<select required value={campaignId} onChange={e=>setCampaignId(e.target.value)}><option value="">Select campaign</option>{data.campaigns.filter((c:any)=>["creator","mixed"].includes(c.campaign_type)).map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label>Approved Creator<select required value={creatorId} onChange={e=>setCreatorId(e.target.value)}><option value="">Select creator</option>{creatorOptions.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <label>Agreed fee (ZAR)<input required type="number" min="0" step="0.01" value={fee} onChange={e=>setFee(e.target.value)}/></label>
            <label>Deliverable title<input required maxLength={150} value={deliverableTitle} onChange={e=>setDeliverableTitle(e.target.value)} placeholder="One launch video"/></label>
            <label className="campaign-wide">Brief<textarea rows={3} maxLength={2000} value={brief} onChange={e=>setBrief(e.target.value)} placeholder="Describe format, content requirements and review criteria."/></label>
            <label>Due date<input type="datetime-local" value={dueAt} onChange={e=>setDueAt(e.target.value)}/></label>
            <button className="btn" disabled={busy||!campaignId||!creatorId}>Send creator invitation</button>
          </form>
        </section>

        <section className="growth-module"><h2>All campaigns</h2>{data.campaigns.length?data.campaigns.map((c:any)=><div className="growth-admin-grant" key={c.id}><div><strong>{c.name}</strong><span>{c.campaign_type} · {c.slug}</span></div><span className={"growth-state "+c.status}>{c.status}</span></div>):<p className="small">No campaigns created yet.</p>}</section>
      </>}
    </section>
  </main>;
}
