import Link from "next/link";
import AuthControls from "./auth-controls";

const categories = [
  { icon: "📦", title: "Pick-ups & deliveries", description: "Parcels, documents, packages and more." },
  { icon: "🥬", title: "Grocery runs", description: "Get your essentials delivered." },
  { icon: "🧾", title: "Queueing & collections", description: "We'll wait in line for you." },
  { icon: "🧽", title: "Home help", description: "Small tasks around your home." },
  { icon: "💻", title: "Business errands", description: "Office runs, equipment and supplies." },
  { icon: "💬", title: "Something else", description: "Got a unique task? Just ask." },
];

export default function Home() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  return <main className="reference-home">
    <nav className="shell nav market-nav">
      <Link href="/" className="brand"><span className="brand-mark">✳</span> wena<span>runners</span></Link>
      <div className="navlinks"><Link href="/jobs">Explore errands</Link><a href="#how">How it works</a><Link href="/signup">Become a Runner</Link><a href="#help">Help</a><AuthControls clerkConfigured={clerkConfigured}/></div>
    </nav>
    <section className="reference-hero">
      <div className="reference-hero-copy">
        <p className="reference-kicker">LOCAL PEOPLE. REAL HELP.</p>
        <h1>Your to-do list.<br/><span>Handled.</span></h1>
        <p className="reference-intro">From quick pickups to everyday errands, find a trusted local Runner and get your time back.</p>
        <form className="reference-search" action="/jobs" method="get">
          <label className="search-what"><span>⌕</span><input name="q" aria-label="What do you need help with?" placeholder="What do you need help with?"/></label>
          <label className="search-area"><span>⌖</span><select name="area" aria-label="Your area" defaultValue=""><option value="">Your area</option><option>Cape Town</option><option>Johannesburg</option><option>Durban</option><option>Gqeberha</option><option>Other</option></select></label>
          <button className="btn" type="submit">Find a Runner <span>→</span></button>
        </form>
        <div className="reference-trust"><div><b>♧</b><span><strong>Agree on your price</strong><small>You're in control</small></span></div><div><b>♙</b><span><strong>Secure account</strong><small>Safe & verified users</small></span></div><div><b>♧</b><span><strong>Local people, real help</strong><small>In your community</small></span></div></div>
      </div>
      <div className="reference-hero-photo" role="img" aria-label="Runner carrying groceries and delivery packages">
        <div className="photo-note">More time<br/>for what matters.</div><div className="photo-location">📍 Local Runners<br/><small>across South Africa</small></div>
      </div>
    </section>
    <section className="reference-categories">
      <div className="shell"><div className="reference-section-heading"><div><h2>What can we help you with?</h2><p>Choose a category or tell us what you need. There's a Runner for just about anything.</p></div><Link href="/jobs">View all errands&nbsp; →</Link></div>
        <div className="reference-category-grid">{categories.map((category,i)=><Link className="reference-category" href="/jobs" key={category.title}><div className={"reference-category-art art-"+i}><span>{category.icon}</span></div><strong>{category.title}</strong><small>{category.description}</small><i>→</i></Link>)}</div>
      </div>
    </section>
    <section className="shell reference-how" id="how"><div className="reference-section-heading"><div><h2>How Wena Runners works</h2><p>Get things done in just a few simple steps.</p></div></div>
      <div className="reference-steps"><article><b className="step-dot">1</b><span className="step-icon">▤</span><div><strong>Post your errand</strong><p>Tell us what you need, where and when. Add photos if it helps.</p></div></article><article><b className="step-dot coral">2</b><span className="step-icon">▢</span><div><strong>Agree on a price</strong><p>Get offers from verified Runners and choose the one that works for you.</p></div></article><article><b className="step-dot">3</b><span className="step-icon runner-icon">↗</span><div><strong>Your Runner gets it done</strong><p>Sit back and relax while your Runner completes your errand.</p></div></article></div>
      <aside className="reference-runner-cta" id="help"><div><h3>Earn on your<br/>own schedule</h3><p>Make money by helping people in your area with everyday errands.</p><Link className="btn" href="/signup">Become a Runner&nbsp; →</Link></div><div className="cta-illustration">🛍️</div></aside>
    </section>
    <footer className="shell footer market-footer"><strong>✳ wena runners</strong><span>Local errands. Fair deals. Real people.</span><span>© {new Date().getFullYear()} WENA</span></footer>
  </main>;
}