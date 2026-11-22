"use client";

import Link from "next/link";
import { useState } from "react";

export default function MarketingAdminPage() {
  const [password,setPassword]=useState("");
  const [data,setData]=useState<any>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState("");
  const [notes,setNotes]=useState<Record<string,string>>({});

  async function load() {
    setError("");
    try {
      const response=await fetch("/api/marketing/admin/applications",{headers:{"x-admin-password":password},cache:"no-store"});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||"Could not load Growth administration.");
      setData(result);
    } catch(cause) { setError(cause instanceof Error?cause.message:"Could not load Growth administration."); }
  }
  async function act(body:any) {
    setBusy(body.applicationId||body.grantId||"action");setError("");
    try {
      const response=await fetch("/api/marketing/admin/applications",{method:"POST",headers:{"Content-Type":"application/json","x-admin-password":password},body:JSON.stringify(body)});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||"Action failed.");
      await load();
    } catch(cause) { setError(cause instanceof Error?cause.message:"Action failed."); }
    finally { setBusy(""); }
  }
  const apps=data?.applications||[];
  const grants=data?.grants||[];
  return <main className="admin-growth-page">
    <nav className="shell nav"><Link href="/" className="brand"><span className="brand-symbol">w</span><span className="brand-wordmark">wena<span>runners</span></span></Link><Link href="/admin">Admin desk</Link></nav>
    <section className="shell">
      <header className="pagehead"><p className="growth-eyebrow">WENA ADMINISTRATION</p><h1>Growth programme</h1><p className="muted">Review Affiliate and Creator applications independently. Every approval grants access to the applicant’s existing WENA account.</p></header>
      {error&&<p className="error" role="alert">{error}</p>}
      {!data&&<div className="panel growth-admin-login"><label>Admin password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="btn" onClick={load}>Open Growth admin</button></div>}
      {data&&<>
        <div className="growth-admin-summary"><article><span>Growth applications</span><strong>{apps.length}</strong></article><article><span>Pending review</span><strong>{apps.filter((a:any)=>["pending","more_information"].includes(a.status)).length}</strong></article><article><span>Active role grants</span><strong>{grants.filter((g:any)=>g.status==="active").length}</strong></article><article><span>Applications enabled</span><strong>{data.growthEnabled?"Yes":"No"}</strong></article></div>
        <div className="growth-admin-head"><div><h2>Applications</h2><p className="muted">Approve each capability separately. Approval does not change the marketplace role.</p></div><button className="btn ghost" onClick={load}>Refresh</button></div>
        <div className="growth-admin-list">
          {apps.length===0&&<div className="panel"><strong>No Growth applications yet</strong><p className="muted">New applications will appear here.</p></div>}
          {apps.map((app:any)=><article className="growth-admin-card" key={app.id}>
            <div className="growth-admin-card-head"><div><span className="growth-admin-role">{app.role_key}</span><h3>{app.partner?.display_name||app.partner?.profile?.full_name||"WENA member"}</h3><p>{app.partner?.profile?.email||"No email"} · Marketplace role: {app.partner?.profile?.role||"unknown"}</p></div><span className={"growth-state "+app.status}>{app.status.replaceAll("_"," ")}</span></div>
            <div className="growth-admin-answers"><p><strong>Motivation</strong><br/>{app.answers?.motivation||"Not provided"}</p><p><strong>Platforms</strong><br/>{(app.answers?.platforms||[]).join(", ")||"Not provided"}</p><p><strong>Audience</strong><br/>{app.answers?.audience||"Not provided"}</p>{app.answers?.portfolioUrl&&<p><strong>Portfolio</strong><br/><a href={app.answers.portfolioUrl} target="_blank" rel="noreferrer">{app.answers.portfolioUrl}</a></p>}</div>
            <p className="small">Submitted {new Date(app.submitted_at).toLocaleString("en-ZA")} · Terms {app.terms_version}</p>
            {app.review_note&&<p className="small">Previous note: {app.review_note}</p>}
            {["pending","more_information"].includes(app.status)&&<div className="growth-admin-actions"><input value={notes[app.id]||""} onChange={e=>setNotes({...notes,[app.id]:e.target.value})} placeholder="Internal note or reason (optional)"/><button className="btn" disabled={!!busy} onClick={()=>act({applicationId:app.id,decision:"approved",note:notes[app.id]||""})}>Approve</button><button className="btn ghost" disabled={!!busy} onClick={()=>act({applicationId:app.id,decision:"more_information",note:notes[app.id]||"More information required"})}>Request info</button><button className="btn danger" disabled={!!busy} onClick={()=>act({applicationId:app.id,decision:"declined",note:notes[app.id]||"Application declined"})}>Decline</button></div>}
          </article>)}
        </div>
        <div className="growth-admin-head"><div><h2>Role access</h2><p className="muted">Suspend or revoke one Growth capability without affecting other account roles.</p></div></div>
        <div className="growth-admin-list">{grants.map((grant:any)=><article className="growth-admin-grant" key={grant.id}><div><strong>{grant.partner?.display_name||grant.partner?.profile?.full_name||"WENA member"} · {grant.role_key}</strong><span>{grant.partner?.profile?.email||"No email"}</span></div><span className={"growth-state "+grant.status}>{grant.status}</span><div className="growth-grant-actions">{grant.status!=="active"&&<button className="btn ghost" disabled={!!busy} onClick={()=>act({grantId:grant.id,status:"active",reason:"Reactivated by admin"})}>Reactivate</button>}{grant.status==="active"&&<button className="btn ghost" disabled={!!busy} onClick={()=>act({grantId:grant.id,status:"suspended",reason:"Suspended by admin"})}>Suspend</button>}{grant.status!=="revoked"&&<button className="btn danger" disabled={!!busy} onClick={()=>act({grantId:grant.id,status:"revoked",reason:"Revoked by admin"})}>Revoke</button>}</div></article>)}</div>
      </>}
    </section>
  </main>;
}
