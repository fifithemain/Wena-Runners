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

  return (
    <main>
      <nav className="shell nav market-nav">
        <Link href="/" className="brand">wena <span>runners</span></Link>
        <div className="navlinks">
          <Link href="/jobs">Explore errands</Link>
          <a href="#how">How it works</a>
          <Link href="/signup">Become a Runner</Link>
          <a href="#help">Help</a>
          <AuthControls clerkConfigured={clerkConfigured} />
        </div>
      </nav>

      <section className="shell hero market-hero">
        <div>
          <span className="eyebrow">Local people. Real help.</span>
          <h1>Your to-do list.<br /><span>Handled.</span></h1>
          <p>From quick pickups to everyday errands, find a trusted local Runner and get your time back.</p>
          <form className="market-search" action="/jobs" method="get">
            <input name="q" aria-label="What do you need help with?" placeholder="⌕  What do you need help with?" />
            <select name="area" aria-label="Your area" defaultValue="">
              <option value="">⌖ Your area</option>
              <option value="Cape Town">Cape Town</option>
              <option value="Johannesburg">Johannesburg</option>
              <option value="Durban">Durban</option>
              <option value="Gqeberha">Gqeberha</option>
              <option value="Other">Other area</option>
            </select>
            <button className="btn" type="submit">Find a Runner <span aria-hidden="true">→</span></button>
          </form>
          <div className="market-trust">
            <span>🤝 Agree on your price</span>
            <span>🛡 Secure account</span>
            <span>♧ Local people, real help</span>
          </div>
        </div>
        <div className="hero-card">
          <span className="eyebrow">Across South Africa</span>
          <div>
            <div className="big">More time</div>
            <div className="big">for what matters.</div>
          </div>
          <p>Customers and verified Runners agree on a fair price before the errand gets underway.</p>
          <div style={{ position: "relative", zIndex: 1, fontSize: 58 }} aria-hidden="true">🛍️ 📦</div>
        </div>
      </section>

      <section className="section market-categories">
        <div className="shell">
          <h2>What can we help you with?</h2>
          <p className="muted">Choose a category or tell us what you need. There's a Runner for just about anything.</p>
          <div className="cards">
            {categories.map((category) => (
              <article className="card" key={category.title}>
                <div className="category-emoji" aria-hidden="true">{category.icon}</div>
                <h3>{category.title}</h3>
                <p>{category.description}</p>
                <Link href="/jobs">Explore errands <span aria-hidden="true">→</span></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="shell section" id="how">
        <h2>How Wena Runners works</h2>
        <p className="muted">Get things done in just a few simple steps.</p>
        <div className="market-steps">
          <article className="market-step">
            <span className="step-number">1</span>
            <div><h3>Post your errand</h3><p className="muted">Tell us what you need, where and when. Add details to help Runners make an offer.</p></div>
          </article>
          <article className="market-step">
            <span className="step-number">2</span>
            <div><h3>Agree on a price</h3><p className="muted">Get offers from verified Runners and choose the one that works for you.</p></div>
          </article>
          <article className="market-step">
            <span className="step-number">3</span>
            <div><h3>Your Runner gets it done</h3><p className="muted">Follow the errand in your account and keep the hand-off PIN private until completion.</p></div>
          </article>
        </div>
      </section>

      <section className="shell section" id="help">
        <div className="card runner-cta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <div>
            <span className="eyebrow">For Runners</span>
            <h2 style={{ marginTop: 12 }}>Earn on your own schedule</h2>
            <p className="muted">Make money by helping people in your area with everyday errands.</p>
          </div>
          <Link className="btn" href="/signup">Become a Runner <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <footer className="shell footer market-footer">
        <strong>WENA Runners</strong>
        <span>Local errands. Fair deals. Real people.</span>
        <span>© {new Date().getFullYear()} WENA</span>
      </footer>
    </main>
  );
}
