"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";

type DemoSection = "dashboard" | "chat" | "account" | "wallet" | "payment" | "sign-in" | "sign-up";
type DemoRole = "customer" | "runner";
type DemoMessage = { id: number; role: DemoRole; text: string; time: string };
type HistoryFilter = "all" | "paid" | "cancelled" | "refunded" | "pending";
type HistoryEntry = { id: number; title: string; category: string; date: string; errandStatus: string; paymentStatus: Exclude<HistoryFilter, "all">; amount: string; detail: string };

const initialMessages: DemoMessage[] = [
  { id: 1, role: "runner", text: "Hi Dani! I’ve picked up the grocery order. Heading your way now.", time: "10:42" },
  { id: 2, role: "customer", text: "Thanks, Lwazi. Please message when you’re around the corner.", time: "10:44" },
  { id: 3, role: "runner", text: "Almost there. I’ll ask you for the hand-off PIN when I arrive.", time: "10:51" },
];

const demoHistory: HistoryEntry[] = [
  { id: 1, title: "Weekly grocery top-up", category: "Groceries", date: "19 Oct 2026", errandStatus: "Completed", paymentStatus: "paid", amount: "R194.25", detail: "Paid successfully · Lwazi Khumalo" },
  { id: 2, title: "Collect a parcel from the post office", category: "Pick-up & delivery", date: "18 Oct 2026", errandStatus: "Cancelled", paymentStatus: "cancelled", amount: "R120.00", detail: "Cancelled before payment · No charge" },
  { id: 3, title: "Help moving a bookshelf", category: "Home help", date: "16 Oct 2026", errandStatus: "Cancelled", paymentStatus: "refunded", amount: "R230.00", detail: "Errand cancelled · R230.00 refunded" },
  { id: 4, title: "Drop off keys in Gardens", category: "Keys & documents", date: "14 Oct 2026", errandStatus: "Completed", paymentStatus: "paid", amount: "R98.50", detail: "Paid successfully · Amahle Petersen" },
  { id: 5, title: "Pick up a birthday cake", category: "Pick-up & delivery", date: "12 Oct 2026", errandStatus: "Awaiting payment", paymentStatus: "pending", amount: "R160.00", detail: "Payment not completed" },
];

const navigation: { id: DemoSection; label: string; icon: string }[] = [
  { id: "dashboard", label: "My errands", icon: "▤" },
  { id: "chat", label: "Messages", icon: "◌" },
  { id: "account", label: "Account", icon: "◎" },
  { id: "wallet", label: "Runner wallet", icon: "R" },
  { id: "payment", label: "Payment", icon: "↗" },
];

export default function DemoPage() {
  const [section, setSection] = useState<DemoSection>("dashboard");
  const [role, setRole] = useState<DemoRole>("customer");
  const [messages, setMessages] = useState(initialMessages);
  const [message, setMessage] = useState("");
  const [showPostForm, setShowPostForm] = useState(false);
  const [postedErrand, setPostedErrand] = useState("");
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [payoutRequested, setPayoutRequested] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [notice, setNotice] = useState("");
  const name = role === "customer" ? "Dani Mokoena" : "Lwazi Khumalo";
  const firstName = name.split(" ")[0];
  const visibleHistory = historyFilter === "all" ? demoHistory : demoHistory.filter((entry) => entry.paymentStatus === historyFilter);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    const validSections: DemoSection[] = ["dashboard", "chat", "account", "wallet", "payment", "sign-in", "sign-up"];
    if (view && validSections.includes(view as DemoSection)) setSection(view as DemoSection);
    if (params.get("role") === "runner") setRole("runner");
  }, []);

  function switchSection(next: DemoSection) {
    setSection(next);
    setNotice("");
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;
    setMessages((current) => [
      ...current,
      { id: Date.now(), role, text, time: new Intl.DateTimeFormat("en-ZA", { hour: "2-digit", minute: "2-digit" }).format(new Date()) },
    ]);
    setMessage("");
  }

  function postErrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const description = String(form.get("description") || "").trim();
    if (!description) return;
    setPostedErrand(description);
    setShowPostForm(false);
    setNotice("Your demo errand was added to this preview.");
  }

  function demoAction(text: string) {
    setNotice(text);
  }

  return (
    <main className="demo-app">
      <div className="demo-banner">
        <span className="demo-banner-dot" />
        <strong>Interactive demo</strong>
        <span>Sample data only. Nothing is sent, saved, or charged.</span>
        <Link href="/">Back to WENA home <span aria-hidden="true">→</span></Link>
      </div>
      <header className="demo-topbar">
        <Link href="/" className="brand" aria-label="WENA Runners home">
          <span className="brand-symbol" aria-hidden="true">w</span>
          <span className="brand-wordmark">wena<span>runners</span></span>
        </Link>
        <div className="demo-role-switch" aria-label="Preview account">
          <span>Preview as</span>
          <button type="button" className={role === "customer" ? "active" : ""} onClick={() => { setRole("customer"); setNotice(""); }}>Customer</button>
          <button type="button" className={role === "runner" ? "active" : ""} onClick={() => { setRole("runner"); setNotice(""); }}>Runner</button>
        </div>
        <button className="demo-user-chip" type="button" onClick={() => switchSection("account")}>
          <span className="demo-avatar">{role === "customer" ? "DM" : "LK"}</span>
          <span>{firstName}<small>{role === "customer" ? "Customer" : "Verified Runner"}</small></span>
          <span aria-hidden="true">⌄</span>
        </button>
      </header>

      <div className="demo-layout">
        <aside className="demo-sidebar" aria-label="Demo navigation">
          <p className="demo-nav-label">WORKSPACE</p>
          {navigation.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`demo-nav-item${section === item.id ? " selected" : ""}${item.id === "wallet" && role === "customer" ? " runner-only" : ""}`}
              onClick={() => switchSection(item.id)}
            >
              <span aria-hidden="true">{item.icon}</span>{item.label}
              {item.id === "chat" && <i>2</i>}
            </button>
          ))}
          <div className="demo-sidebar-bottom">
            <p className="demo-nav-label">ACCOUNT PREVIEW</p>
            <button type="button" className={`demo-nav-item${section === "sign-in" ? " selected" : ""}`} onClick={() => switchSection("sign-in")}><span aria-hidden="true">↪</span>Sign in screen</button>
            <button type="button" className={`demo-nav-item${section === "sign-up" ? " selected" : ""}`} onClick={() => switchSection("sign-up")}><span aria-hidden="true">＋</span>Create account</button>
          </div>
        </aside>

        <section className="demo-content">
          <div className="demo-content-head">
            <div>
              <p className="demo-breadcrumb">WENA Runners <span>/</span> Preview</p>
              <h1>{sectionTitle(section, role)}</h1>
              <p className="muted">{sectionDescription(section, role)}</p>
            </div>
            {section === "dashboard" && role === "customer" && <button className="btn" onClick={() => { setShowPostForm(!showPostForm); setNotice(""); }}>{showPostForm ? "Close form" : "＋ Post an errand"}</button>}
          </div>

          {notice && <p className="success demo-notice" role="status">{notice}</p>}
          {section === "dashboard" && (
            <div className="demo-dashboard">
              <div className="demo-stats">
                <div><span>{role === "customer" ? "Active errands" : "Open nearby"}</span><strong>{role === "customer" ? "2" : "8"}</strong></div>
                <div><span>{role === "customer" ? "Offers to review" : "Your offers"}</span><strong>{role === "customer" ? "3" : "2"}</strong></div>
                <div><span>Completed this month</span><strong>6</strong></div>
              </div>

              {showPostForm && (
                <form className="panel demo-post-form" onSubmit={postErrand}>
                  <h2>Post an errand</h2>
                  <p className="muted">Try the form — it only updates this local preview.</p>
                  <div className="demo-form-grid">
                    <label>Category<select name="category"><option>Groceries</option><option>Pick-up & delivery</option><option>Keys & documents</option><option>Home help</option></select></label>
                    <label>Your budget (ZAR)<input name="budget" type="number" min="1" defaultValue="180" /></label>
                    <label className="demo-form-wide">What do you need?<textarea name="description" required placeholder="e.g. Pick up a few things from the shops" /></label>
                    <label>Pickup<input name="pickup" required defaultValue="Woodstock, Cape Town" /></label>
                    <label>Drop-off<input name="dropoff" required defaultValue="Observatory, Cape Town" /></label>
                  </div>
                  <button className="btn" type="submit">Add to demo errands</button>
                </form>
              )}

              <div className="demo-section-title"><h2>{role === "customer" ? "Your errands" : "Errands near you"}</h2><span>Updated just now</span></div>
              {postedErrand && <DemoErrand title={postedErrand} category="New errand · Just now" price="R180" status="Posted" action="View offers" onAction={() => demoAction("Runner offers will appear here in the live product.")} />}
              {role === "customer" ? (
                <>
                  <DemoErrand title="Weekly grocery top-up" category="Groceries · Today, 10:15" price="R185" status="Runner on the way" action="Open chat" onAction={() => switchSection("chat")} />
                  <DemoErrand title="Collect a parcel from the post office" category="Pick-up & delivery · Today, 08:30" price="R120" status="3 offers to review" action="Review offers" onAction={() => demoAction("Sample offers: R110 · Lwazi K.  |  R120 · Amahle P.  |  R135 · Sipho N.")} />
                  <div className="demo-inline-trust"><span>◇</span><div><strong>Hand-off PIN <b>482 916</b></strong><small>Share it with your Runner only when your errand is in hand.</small></div><button className="btn ghost" onClick={() => demoAction("Demo PIN copied: 482 916")}>Copy PIN</button></div>
                </>
              ) : (
                <>
                  <DemoErrand title="Pick up a birthday cake" category="Pick-up & delivery · 1.2 km away" price="R160" status="Customer budget" action="Make an offer" onAction={() => demoAction("Your demo offer of R160 has been sent.")} />
                  <DemoErrand title="Grocery run for a family" category="Groceries · 2.4 km away" price="R220" status="Customer budget" action="Make an offer" onAction={() => demoAction("Your demo offer of R220 has been sent.")} />
                  <DemoErrand title="Drop off keys in Gardens" category="Keys & documents · 3 km away" price="R95" status="Customer budget" action="Make an offer" onAction={() => demoAction("Your demo offer of R95 has been sent.")} />
                </>
              )}
            </div>
          )}

          {section === "chat" && (
            <div className="demo-chat-layout">
              <aside className="panel demo-conversations">
                <h2>Messages <span>2</span></h2>
                <button className="demo-conversation selected" onClick={() => setNotice("")}>
                  <span className="demo-avatar">LK</span><span><strong>{role === "customer" ? "Lwazi Khumalo" : "Dani Mokoena"}</strong><small>Weekly grocery top-up</small><em>Almost there — I’ll message when I arrive.</em></span><i>10:51</i>
                </button>
                <button className="demo-conversation" onClick={() => demoAction("This conversation is a sample preview.")}>
                  <span className="demo-avatar alt">AP</span><span><strong>Amahle Petersen</strong><small>Parcel collection</small><em>Thanks, that works for me!</em></span><i>Yesterday</i>
                </button>
              </aside>
              <section className="panel demo-thread">
                <header className="demo-thread-head">
                  <span className="demo-avatar">LK</span><span><strong>{role === "customer" ? "Lwazi Khumalo" : "Dani Mokoena"}</strong><small><i /> Verified Runner · Errand chat</small></span>
                  <button className="btn ghost" onClick={() => switchSection("dashboard")}>View errand</button>
                </header>
                <div className="demo-errand-context"><span>WEEKLY GROCERY TOP-UP</span><strong>Agreed price <b>R185</b></strong><small>Only errand participants can see this conversation.</small></div>
                <div className="demo-message-list" role="log" aria-live="polite">
                  <p className="demo-day-divider"><span>Today</span></p>
                  {messages.map((item) => {
                    const mine = item.role === role;
                    const sender = item.role === "customer" ? "Dani" : "Lwazi";
                    return <div key={item.id} className={`demo-message${mine ? " mine" : ""}`}><span className="demo-message-name">{mine ? "You" : sender}</span><p>{item.text}</p><time>{item.time}</time></div>;
                  })}
                </div>
                <form className="demo-compose" onSubmit={sendMessage}><input aria-label="Write a message" maxLength={500} placeholder="Write a message…" value={message} onChange={(event) => setMessage(event.target.value)} /><button className="btn" disabled={!message.trim()}>Send <span aria-hidden="true">↑</span></button></form>
                <p className="demo-chat-foot">Keep payments in-app and share your PIN at hand-off only.</p>
              </section>
            </div>
          )}

          {section === "account" && (
            <div className="demo-account-grid">
              <section className="panel demo-profile-panel">
                <div className="demo-profile-cover"><span className="demo-avatar large">{role === "customer" ? "DM" : "LK"}</span></div>
                <h2>{name}</h2><p className="muted">{role === "customer" ? "Customer account" : "Verified local Runner"}</p>
                <span className={`pill${role === "runner" ? " verified" : ""}`}>{role === "customer" ? "Customer" : "✓ Verified Runner"}</span>
                <dl className="demo-details"><div><dt>Email</dt><dd>{role === "customer" ? "dani.mokoena@example.com" : "lwazi.k@example.com"}</dd></div><div><dt>Mobile</dt><dd>+27 82 555 0148</dd></div><div><dt>Location</dt><dd>{role === "customer" ? "Woodstock, Cape Town" : "Observatory, Cape Town"}</dd></div></dl>
                <button className="btn ghost" onClick={() => demoAction("Profile editing is a visual-only demo.")}>Edit profile</button>
              </section>
              <section className="panel demo-account-options"><h2>Account settings</h2><p className="muted">Your details and preferences in one place.</p><button onClick={() => demoAction("Email preferences opened in this demo.")}><span>✉</span><span><strong>Email & notifications</strong><small>Choose what WENA updates you about</small></span><b>→</b></button><button onClick={() => demoAction("Security settings opened in this demo.")}><span>◇</span><span><strong>Sign-in & security</strong><small>Password and account protection</small></span><b>→</b></button><button onClick={() => setRole(role === "customer" ? "runner" : "customer")}><span>↔</span><span><strong>{role === "customer" ? "Preview Runner account" : "Preview Customer account"}</strong><small>Switch between sample account types</small></span><b>→</b></button></section>
              <section className="panel demo-history">
                <div className="demo-history-heading"><div><h2>Errand & payment history</h2><p className="muted">A record of completed errands, cancellations, and payment outcomes.</p></div><span>{demoHistory.length} errands</span></div>
                <div className="demo-history-filters" aria-label="Filter history by payment status">
                  {(["all", "paid", "cancelled", "refunded", "pending"] as HistoryFilter[]).map((filter) => (
                    <button type="button" key={filter} className={historyFilter === filter ? "active" : ""} aria-pressed={historyFilter === filter} onClick={() => setHistoryFilter(filter)}>
                      {filter === "all" ? "All activity" : filter === "paid" ? "Paid" : filter === "cancelled" ? "Cancelled" : filter === "refunded" ? "Refunded" : "Pending"}
                    </button>
                  ))}
                </div>
                <div className="demo-history-list">
                  {visibleHistory.map((entry) => (
                    <article className="demo-history-row" key={entry.id}>
                      <span className={`demo-history-icon ${entry.paymentStatus}`} aria-hidden="true">{entry.paymentStatus === "paid" ? "✓" : entry.paymentStatus === "refunded" ? "↶" : entry.paymentStatus === "pending" ? "…" : "×"}</span>
                      <div className="demo-history-info"><strong>{entry.title}</strong><span>{entry.category} · {entry.date}</span><small>{entry.detail}</small></div>
                      <div className="demo-history-result"><strong>{entry.amount}</strong><span className={`demo-history-status ${entry.paymentStatus}`}>{paymentStatusLabel(entry.paymentStatus)}</span><small>Errand {entry.errandStatus.toLowerCase()}</small></div>
                    </article>
                  ))}
                  {!visibleHistory.length && <p className="demo-history-empty">No {historyFilter} activity in this demo history.</p>}
                </div>
                <p className="demo-history-disclaimer">Sample history for preview only. Live payment and errand records are not connected here.</p>
              </section>
            </div>
          )}

          {section === "wallet" && (
            <div className="demo-wallet">
              <div className="wallet-hero"><div><span className="wallet-kicker">Available balance</span><div className="wallet-balance">R1,245.00</div><p>Ready to request a payout to your linked account.</p></div><button className="btn lime" onClick={() => { setPayoutRequested(true); demoAction("Demo payout request submitted — no money was moved."); }}>Request payout</button></div>
              {payoutRequested && <p className="success">Payout request previewed · R1,245.00 · Usually processed in 3–7 business days.</p>}
              <div className="demo-stats wallet-metrics"><div className="wallet-metric"><span>This month</span><strong>R3,680</strong><small>Across 14 errands</small></div><div className="wallet-metric"><span>In progress</span><strong>R420</strong><small>2 active errands</small></div><div className="wallet-metric"><span>Completed</span><strong>14</strong><small>This month</small></div></div>
              <section className="panel demo-transactions"><h2>Recent activity</h2><div><span className="transaction-icon paid">✓</span><span><strong>Grocery run completed</strong><small>Today · Paid to your wallet</small></span><b>+ R185</b></div><div><span className="transaction-icon paid">✓</span><span><strong>Parcel delivery</strong><small>Yesterday · Paid to your wallet</small></span><b>+ R120</b></div><div><span className="transaction-icon">↗</span><span><strong>Payout to bank account</strong><small>17 Oct · Processing</small></span><b>− R800</b></div></section>
            </div>
          )}

          {section === "payment" && (
            <div className="demo-payment-layout">
              <section className="panel demo-payment-panel">
                <h2>{paymentComplete ? "Payment complete" : "Review your payment"}</h2>
                <p className="muted">{paymentComplete ? "Your errand is active and ready for the hand-off." : "The Runner will be assigned after payment is confirmed."}</p>
                <div className="demo-payment-errand"><span className="demo-avatar">LK</span><span><strong>Weekly grocery top-up</strong><small>Runner · Lwazi Khumalo · Verified</small></span><span className="pill verified">Assigned</span></div>
                <div className="demo-payment-line"><span>Agreed errand price</span><strong>R185.00</strong></div><div className="demo-payment-line"><span>Service fee</span><strong>R9.25</strong></div><div className="demo-payment-line total"><span>Total</span><strong>R194.25</strong></div>
                <h3>Payment method</h3><label className="demo-payment-method"><input type="radio" name="method" defaultChecked /> <span className="demo-payment-mark">VISA</span><span><strong>Card ending in 4242</strong><small>Secure card payment</small></span><span className="demo-radio" /></label>
                <button className="btn demo-pay-button" disabled={paymentComplete} onClick={() => { setPaymentComplete(true); demoAction("Demo payment confirmed — no charge was made."); }}>{paymentComplete ? "Demo payment confirmed" : "Pay R194.25"}</button>
                <p className="demo-safe-note">◇ This is a preview. No payment details are collected and no charge will be made.</p>
              </section>
              <aside className="demo-payment-aside"><span>◇</span><h3>Protected hand-off</h3><p>Your payment is held securely until your Runner completes the errand and you confirm delivery with your private PIN.</p><button className="text-link" onClick={() => demoAction("In the live app, you can review the payment policy here.")}>How payment works →</button></aside>
            </div>
          )}

          {(section === "sign-in" || section === "sign-up") && (
            <section className="panel demo-auth-panel">
              <div className="demo-auth-icon">{section === "sign-in" ? "↪" : "＋"}</div>
              <h2>{section === "sign-in" ? "Welcome back." : "Make room for what matters."}</h2>
              <p className="muted">{section === "sign-in" ? "Sign in to manage errands, Runner offers, and your account." : "Create an account to request errands, earn as a Runner, or do both."}</p>
              <form onSubmit={(event) => { event.preventDefault(); demoAction("Demo only — no account was created and no sign-in was attempted."); }}>
                {section === "sign-up" && <label>Your name<input required placeholder="e.g. Dani Mokoena" /></label>}
                <label>Email address<input required type="email" placeholder="you@example.com" /></label>
                <label>Password<input required type="password" placeholder="At least 8 characters" /></label>
                {section === "sign-up" && <label>How will you use WENA?<select defaultValue="customer"><option value="customer">I need help with errands</option><option value="runner">I want to run errands</option><option value="both">Both</option></select></label>}
                <button className="btn" type="submit">{section === "sign-in" ? "Sign in to demo" : "Create demo account"}</button>
              </form>
              <p className="demo-auth-switch">{section === "sign-in" ? "New to WENA Runners?" : "Already have an account?"} <button onClick={() => switchSection(section === "sign-in" ? "sign-up" : "sign-in")}>{section === "sign-in" ? "Create an account" : "Sign in"}</button></p>
              <small className="demo-auth-disclaimer">Preview only. Don’t enter a real password; form data is not submitted or saved.</small>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}

function sectionTitle(section: DemoSection, role: DemoRole) {
  const titles: Record<DemoSection, string> = {
    dashboard: role === "customer" ? "Welcome back, Dani." : "Runner marketplace",
    chat: "Messages",
    account: "Your account",
    wallet: "Runner wallet",
    payment: "Secure checkout",
    "sign-in": "Sign in",
    "sign-up": "Create an account",
  };
  return titles[section];
}

function sectionDescription(section: DemoSection, role: DemoRole) {
  if (section === "dashboard") return role === "customer" ? "Keep track of errands, compare offers, and stay in touch with your Runner." : "Find nearby errands, make offers, and keep your earnings moving.";
  if (section === "chat") return "Coordinate the details directly with the other errand participant.";
  if (section === "account") return "Manage your profile and see how account details fit into WENA.";
  if (section === "wallet") return "Track completed errands, available earnings, and payouts.";
  if (section === "payment") return "A clear breakdown before you confirm an accepted offer.";
  return "Explore the account flow in a safe, local-only preview.";
}

function paymentStatusLabel(status: HistoryEntry["paymentStatus"]) {
  if (status === "paid") return "Paid";
  if (status === "cancelled") return "Not charged";
  if (status === "refunded") return "Refunded";
  return "Pending";
}

function DemoErrand({ title, category, price, status, action, onAction }: { title: string; category: string; price: string; status: string; action: string; onAction: () => void }) {
  return <article className="demo-errand-card"><div className="demo-errand-icon">⌖</div><div className="demo-errand-main"><span className="demo-errand-category">{category}</span><h3>{title}</h3><span className="pill">{status}</span></div><div className="demo-errand-side"><span>Agreed price / budget</span><strong>{price}</strong><button className="btn ghost" onClick={onAction}>{action} <span aria-hidden="true">→</span></button></div></article>;
}
