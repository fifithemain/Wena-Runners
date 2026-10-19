import Link from "next/link";
import AuthControls from "./auth-controls";
import { CategoryArtwork, RunnerScene } from "./landing-artwork";

export default function Home() {
  const clerkConfigured = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );

  const categories = [
    { title: "Pick-ups & deliveries", description: "Parcels, documents and the things you need moved.", kind: "pickup" as const, category: "pickup" },
    { title: "Grocery runs", description: "Get everyday essentials delivered to your door.", kind: "groceries" as const, category: "groceries" },
    { title: "Keys & documents", description: "A trusted hand with important items nearby.", kind: "documents" as const, category: "keys_documents" },
    { title: "Home help", description: "Small tasks that make the day run smoother.", kind: "home" as const, category: "general_assistance" },
    { title: "Something else", description: "Tell a Runner what would help today.", kind: "other" as const, category: "other" },
  ];

  return (
    <main className="landing-page">
      <template
        dangerouslySetInnerHTML={{
          __html:
            "<!-- THESIS: A local errand marketplace, not a generic courier storefront; put the task and customer-owned budget first. OWN-WORLD: Crisp white and pale mint planes, deep ink, runner green, rounded service cards, and original neighborhood artwork. STORY: Customers post an errand, compare Runner offers, pay, and confirm the hand-off; Runners find work and earnings. FIRST VIEWPORT: Slim navigation above a two-column headline and illustrated neighborhood scene, with the errand action beside the headline and a trust strip below. FORM: User-pinned marketplace composition from the supplied WENA Runners reference. -->",
        }}
      />
      <nav className="shell nav">
        <Link href="/" className="brand" aria-label="WENA Runners home">
          <span className="brand-symbol" aria-hidden="true">w</span>
          <span className="brand-wordmark">wena<span>runners</span></span>
        </Link>
        <div className="navlinks">
          <a href="#errands">Explore errands</a>
          <a href="#how">How it works</a>
          <Link href="/signup">Become a Runner</Link>
          <Link href="/demo" className="btn ghost">Explore demo</Link>
          <AuthControls clerkConfigured={clerkConfigured} />
        </div>
      </nav>
      <section className="shell hero">
        <div className="hero-copy">
          <h1>Your to-do list.<br /><span>Handled.</span></h1>
          <p>
            From quick pick-ups to everyday errands, find a trusted local Runner and get your time back.
          </p>
          <div className="actions">
            <Link className="btn" href="/jobs?post=1">
              Post an errand <span aria-hidden="true">→</span>
            </Link>
            <Link className="btn ghost" href="/jobs">
              Browse errands
            </Link>
          </div>
          <div className="hero-proof">
            <span className="proof-item"><span aria-hidden="true">✓</span> Agree on your price</span>
            <span className="proof-item"><span aria-hidden="true">◆</span> Verified Runners</span>
            <span className="proof-item"><span aria-hidden="true">⌖</span> Local, personal help</span>
          </div>
        </div>
        <div className="hero-visual">
          <RunnerScene />
          <div className="runner-note">
            <span className="runner-note-pin" aria-hidden="true">⌖</span>
            <span><strong>Local Runners</strong><small>Across your neighbourhood</small></span>
          </div>
          <div className="scene-caption">More time for what matters.</div>
        </div>
      </section>
      <section className="shell trust-strip" aria-label="How WENA keeps errands straightforward">
        <div><span aria-hidden="true">↔</span><p><strong>Agree on your price</strong><small>You&apos;re in control</small></p></div>
        <div><span aria-hidden="true">◇</span><p><strong>Secure hand-off</strong><small>Private PIN confirms delivery</small></p></div>
        <div><span aria-hidden="true">⌖</span><p><strong>Local people, real help</strong><small>Made for your community</small></p></div>
      </section>
      <section className="shell section category-section" id="errands">
        <div className="section-heading">
          <div><h2>What can we help you with?</h2><p>Choose a category or tell us what you need. There&apos;s a Runner for that.</p></div>
          <Link className="text-link" href="/jobs">View all errands <span aria-hidden="true">→</span></Link>
        </div>
        <div className="category-grid">
          {categories.map((item) => (
            <Link className="category-card" href={`/jobs?category=${item.category}`} key={item.category}>
              <CategoryArtwork kind={item.kind} />
              <span className="category-title">{item.title}</span>
              <span className="category-description">{item.description}</span>
              <span className="category-arrow" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="shell process-section" id="how">
        <div className="process-copy">
          <h2>How WENA Runners works</h2>
          <p>Getting things done in just a few simple steps.</p>
        </div>
        <div className="process-steps">
          <article className="process-step">
            <span className="step-number">1</span>
            <div><h3>Post your errand</h3><p>Tell us what you need and set the budget you have in mind.</p></div>
          </article>
          <article className="process-step">
            <span className="step-number">2</span>
            <div><h3>Agree on a price</h3><p>Compare offers from verified Runners and choose the one that works for you.</p></div>
          </article>
          <article className="process-step">
            <span className="step-number">3</span>
            <div><h3>Your Runner gets it done</h3><p>Keep in touch, then confirm the hand-off with your private PIN.</p></div>
          </article>
        </div>
      </section>
      <section className="shell runner-cta">
        <div>
          <h2>Earn on your own schedule.</h2>
          <p>Know your neighbourhood? Make money by helping people nearby.</p>
          <Link className="btn" href="/signup">Become a Runner <span aria-hidden="true">→</span></Link>
        </div>
        <div className="cta-route" aria-hidden="true">
          <span>⌖</span><i></i><span>✓</span>
          <div className="cta-bag">W</div>
        </div>
      </section>
      <footer className="shell footer">
        <Link href="/" className="brand" aria-label="WENA Runners home">
          <span className="brand-symbol" aria-hidden="true">w</span>
          <span className="brand-wordmark">wena<span>runners</span></span>
        </Link>
        <span>Local errands. Fair deals. Real people.</span>
        <span>© {new Date().getFullYear()} WENA</span>
      </footer>
    </main>
  );
}
