"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import WorkspaceShell from "../workspace-shell";

const money=(n:number)=>new Intl.NumberFormat("en-ZA",{style:"currency",currency:"ZAR",maximumFractionDigits:2}).format(Number(n||0));
export default function PaymentPage(){
  const [jobId,setJobId]=useState<string|null>(null),[job,setJob]=useState<any>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  useEffect(()=>{setJobId(new URLSearchParams(window.location.search).get("job"))},[]);
  useEffect(()=>{
    if(jobId===null)return;
    let active=true;
    (async()=>{
      try{
        if(!jobId)throw Error("No errand was selected for payment.");
        const params=new URLSearchParams(window.location.search);
        if(params.get("status")==="success"){
          let paymentConfirmed=false;
          for(let attempt=0;attempt<5;attempt+=1){
            const verify=await fetch(`/api/jobs/${encodeURIComponent(jobId)}/verify`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
            const verified=await verify.json();
            if(!verify.ok)throw Error(verified.error||"Yoco has not confirmed this payment yet.");
            if(verified.status==="paid"){paymentConfirmed=true;break;}
            if(attempt<4)await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)));
          }
          if(paymentConfirmed){
            window.location.replace(`/jobs?payment=success&job=${encodeURIComponent(jobId)}&chat=${encodeURIComponent(jobId)}`);
            return;
          }
          setError("Yoco returned you after checkout, but payment is not confirmed yet. Please wait a moment and refresh this page.");
        }
        const r=await fetch("/api/jobs",{cache:"no-store"}),d=await r.json();
        if(!r.ok)throw Error(d.error||"Could not load errand");
        const found=(d.jobs||[]).find((j:any)=>j.id===jobId);
        if(!found)throw Error("This errand was not found in your account.");
        if(d.profile?.id!==found.customer_id)throw Error("Only the customer who posted this errand can pay.");
        setJob(found);
      }catch(e){
        if(active)setError(e instanceof Error?e.message:"Could not load payment details");
      }finally{
        if(active)setLoading(false);
      }
    })();
    return()=>{active=false};
  },[jobId]);
  const agreed=Number(job?.final_budget??job?.requested_budget??0),fee=Number(job?.service_fee??Math.max(10,Math.round(agreed*.1))),total=Number(job?.total_charge??agreed+fee);
  async function pay(){setBusy(true);setError("");try{const r=await fetch(`/api/jobs/${encodeURIComponent(jobId||"")}/pay`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"}),d=await r.json();if(!r.ok)throw Error(d.error||"Could not start payment");if(d.checkoutUrl)location.href=d.checkoutUrl;else throw Error("Secure checkout did not return a payment link.")}catch(e){setError(e instanceof Error?e.message:"Payment could not be started")}finally{setBusy(false)}}
  return <WorkspaceShell active="jobs" signedIn={Boolean(job)}>
    <section className="workspace-page wallet-page">
      <header className="pagehead"><h1>Confirm and pay</h1><p className="muted">Your offer is agreed. Review the amount before continuing to secure payment.</p></header>
      {error&&<p className="error" role="alert">{error}</p>}
      {loading?<div className="panel">Loading payment details…</div>:job&&<div className="panel payment-panel">
        <span className="pill">Awaiting payment</span><h2 style={{marginTop:16}}>{job.description}</h2>
        <div className="wallet-transactions">
          <div className="wallet-transaction"><div className="transaction-info"><strong>Agreed runner price</strong><span>Amount agreed with your Runner</span></div><div className="transaction-amount"><strong>{money(agreed)}</strong></div></div>
          <div className="wallet-transaction"><div className="transaction-info"><strong>WENA service fee</strong><span>Service and platform fee</span></div><div className="transaction-amount"><strong>{money(fee)}</strong></div></div>
          <div className="wallet-transaction"><div className="transaction-info"><strong>Total due</strong><span>Secure online payment</span></div><div className="transaction-amount"><strong>{money(total)}</strong></div></div>
        </div>
        {job.payment_status==="paid"?<p className="success">Payment is marked as paid for this errand.</p>:<button className="btn" disabled={busy||job.status!=="awaiting_payment"} onClick={pay}>{busy?"Preparing secure checkout…":`Pay ${money(total)} securely`}</button>}
        {job.status!=="awaiting_payment"&&job.payment_status!=="paid"&&<p className="small">This errand is not currently awaiting payment. Return to the marketplace for its latest status.</p>}
        <p className="small" style={{marginTop:16}}>You can open your wallet at any time to access your earnings and payout information.</p>
        <div className="inline-actions"><Link className="btn ghost" href="/earnings">Open earnings & wallet</Link><Link className="btn ghost" href="/jobs">Back to marketplace</Link></div>
      </div>}
    </section>
  </WorkspaceShell>
}
