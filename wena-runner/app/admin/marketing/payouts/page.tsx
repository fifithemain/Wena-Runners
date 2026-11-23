"use client";

import Link from "next/link";
import { useState } from "react";

const money=(value:number)=>new Intl.NumberFormat("en-ZA",{style:"currency",currency:"ZAR"}).format(Number(value||0));
const label=(value:string)=>String(value||"").replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());

export default function GrowthPayoutAdminPage() {
  const [password,setPassword]=useState("");
  const [data,setData]=useState<any>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState("");
  const [references,setReferences]=useState<Record<string,string>>({});
  const [notes,setNotes]=useState<Record<string,string>>({});

  async function load() {
    setError("");
    try {
      const response=await fetch("/api/marketing/admin/payouts",{headers:{"x-admin-password":password},cache:"no-store"});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||"Could not load payout requests.");
      setData(result);
    } catch(cause) { setError(cause instanceof Error?cause.message:"Could not load payout requests."); }
  }
  async function act(requestId:string,status:"processing"|"paid"|"rejected") {
    setBusy(requestId);setError("");
    try {
      const response=await fetch("/api/marketing/admin/payouts",{method:"POST",headers:{"Content-Type":"application/json","x-admin-password":password},body:JSON.stringify({requestId,status,reference:references[requestId]||"",note:notes[requestId]||""})});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||"Payout update failed.");
      await load();
    } catch(cause) { setError(cause instanceof Error?cause.message:"Payout update failed."); }
    finally { setBusy(""); }
  }
  const requests=data?.requests||[];
  const open=requests.filter((r:any)=>["pending","processing"].includes(r.status));
  return <main className="admin-growth-page">
    <nav className="shell nav"><Link href="/" className="brand"><span className="brand-symbol">w</span><span className="brand-wordmark">wena<span>runners</span></span></Link><div className="growth-grant-actions"><Link href="/admin/marketing">Applications</Link><Link href="/admin/marketing/campaigns">Campaigns</Link></div></nav>
    <section className="shell">
      <header className="pagehead"><p className="growth-eyebrow">WENA ADMINISTRATION</p><h1>Growth payouts</h1><p className="muted">Review partner payout requests, verify the saved destination, and record the transfer reference after payment.</p></header>
      {error&&<p className="error" role="alert">{error}</p>}
      {!data&&<div className="panel growth-admin-login"><label>Admin password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="btn" onClick={load}>Open payout desk</button></div>}
      {data&&<>
        <div className="growth-admin-summary"><article><span>Total requests</span><strong>{requests.length}</strong></article><article><span>Awaiting action</span><strong>{open.length}</strong></article><article><span>Paid</span><strong>{requests.filter((r:any)=>r.status==="paid").length}</strong></article><article><span>Pending value</span><strong>{money(open.reduce((s:number,r:any)=>s+Number(r.amount_zar||0),0))}</strong></article></div>
        <div className="growth-admin-head"><div><h2>Partner requests</h2><p className="muted">A request reserves approved rewards until it is paid or rejected.</p></div><button className="btn ghost" onClick={load}>Refresh</button></div>
        <div className="growth-admin-list">
          {requests.length===0&&<div className="panel"><strong>No payout requests</strong><p className="muted">Partner requests will appear here once Growth rewards are approved.</p></div>}
          {requests.map((r:any)=><article className="growth-admin-card" key={r.id}>
            <div className="growth-admin-card-head"><div><span className="growth-admin-role">{label(r.role_key)} · {r.partner?.display_name||r.partner?.profile?.full_name||"WENA partner"}</span><h3>{money(Number(r.amount_zar))}</h3><p>{r.partner?.profile?.email||"No email"} · Requested {new Date(r.created_at).toLocaleString("en-ZA")}</p></div><span className={"growth-state "+r.status}>{label(r.status)}</span></div>
            <div className="growth-admin-answers"><p><strong>Payment method</strong><br/>{r.payout_method_snapshot||"Not recorded"}</p><p><strong>Account holder</strong><br/>{r.payout_account_name_snapshot||"Not recorded"}</p><p><strong>Destination details</strong><br/><span style={{overflowWrap:"anywhere"}}>{r.payout_account_details_snapshot||"Not recorded"}</span></p></div>
            {r.payout_reference&&<p className="small">Reference: {r.payout_reference}</p>}
            {r.admin_note&&<p className="small">Admin note: {r.admin_note}</p>}
            {["pending","processing"].includes(r.status)&&<>
              <label>Admin note<input value={notes[r.id]||""} onChange={e=>setNotes({...notes,[r.id]:e.target.value})} placeholder="Optional note for the audit trail"/></label>
              {r.status==="processing"&&<label>Bank / payment reference<input value={references[r.id]||""} onChange={e=>setReferences({...references,[r.id]:e.target.value})} placeholder="Required before marking paid"/></label>}
              <div className="growth-grant-actions">
                {r.status==="pending"&&<button className="btn" disabled={!!busy} onClick={()=>act(r.id,"processing")}>Approve for processing</button>}
                {r.status==="processing"&&<button className="btn" disabled={!!busy||!(references[r.id]||"").trim()} onClick={()=>act(r.id,"paid")}>Mark paid</button>}
                <button className="btn danger" disabled={!!busy} onClick={()=>act(r.id,"rejected")}>Reject request</button>
              </div>
            </>}
          </article>)}
        </div>
      </>}
    </section>
  </main>;
}
