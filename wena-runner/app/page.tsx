import Link from "next/link";
import { TIERS, COURIER_FEE } from "@/lib/tiers";

export default function Home() {
  return (
    <main className="min-h-screen bg-asphalt text-bone">
      {/* Hero */}
      <section className="relative overflow-hidden border-b-4 border-hustlegold">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="font-body font-bold text-hustlegold tracking-wide mb-3">
              WENA Runner Network — Mthatha
            </p>
            <h1 className="font-display text-5xl md:text-6xl leading-[0.95] text-bone">
              Already in the shop?
              <span className="block text-runnerred">Get paid for it.</span>
            </h1>
            <p className="font-body text-bone/80 mt-5 max-w-md">
              Sign up as a Runner, and when you're already at a store, check
              the board for anyone nearby who needs something bought.
              Buy it, hand it to a WENA courier, get paid same day.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link
                href="/signup"
                className="bg-runnerred hover:bg-runnerred/90 text-bone font-body font-bold px-6 py-3 diagonal-cut"
              >
                Become a Runner
              </Link>
              <Link
                href="/request"
                className="border-2 border-hustlegold text-hustlegold hover:bg-hustlegold hover:text-asphalt font-body font-bold px-6 py-3 transition-colors"
              >
                Request a delivery
              </Link>
            </div>
            <Link
              href="/login"
              className="inline-block mt-4 text-sm text-bone/50 underline underline-offset-4"
            >
              Already a Runner? Log in
            </Link>
          </div>

          {/* Dispatch board preview */}
          <div className="bg-steel border-2 border-hustlegold/40 p-1">
            <div className="border border-bone/10 p-4">
              <p className="font-body text-xs tracking-wide text-hustlegold mb-3">
                LIVE BOARD (example)
              </p>
              {[
                { store: "Boxer, CBD", note: "6 to 10 items", fee: TIERS.medium.runnerCut },
                { store: "Spar, Fortgale", note: "1 to 5 items", fee: TIERS.small.runnerCut },
                { store: "Pick n Pay, CBD", note: "Heavy items", fee: TIERS.heavy.runnerCut },
              ].map((row, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-3 border-b border-bone/10 last:border-0"
                >
                  <div>
                    <p className="font-body font-semibold text-bone">{row.store}</p>
                    <p className="font-body text-xs text-bone/50">{row.note}</p>
                  </div>
                  <p className="font-display text-2xl text-hustlegold">R{row.fee}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="font-display text-3xl text-bone mb-10">How it works</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            {
              step: "1",
              title: "Sign up",
              body: "Give us your name, number, and the area you're usually around.",
            },
            {
              step: "2",
              title: "Get approved",
              body: "We verify you and switch on your account.",
            },
            {
              step: "3",
              title: "Check the board",
              body: "See if someone nearby needs something bought from a store you know.",
            },
            {
              step: "4",
              title: "Buy & hand off",
              body: "Buy the item, hand it to a WENA courier, and get paid.",
            },
          ].map((s) => (
            <div key={s.step} className="border-l-4 border-runnerred pl-4">
              <p className="font-display text-4xl text-hustlegold">{s.step}</p>
              <p className="font-body font-bold text-bone mt-1">{s.title}</p>
              <p className="font-body text-sm text-bone/60 mt-1">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Earnings */}
      <section className="mx-auto max-w-5xl px-6 py-16 border-t border-bone/10">
        <h2 className="font-display text-3xl text-bone mb-2">What Runners earn</h2>
        <p className="font-body text-bone/60 mb-8 max-w-lg">
          Flat fee per job, paid same day. WENA's courier handles the actual
          drop-off, so your job ends once you've bought the item.
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          {Object.entries(TIERS).map(([key, t]) => (
            <div key={key} className="bg-steel border border-hustlegold/30 p-5">
              <p className="font-body text-sm text-bone/60">{t.label}</p>
              <p className="font-display text-4xl text-hustlegold mt-1">
                R{t.runnerCut}
              </p>
            </div>
          ))}
        </div>
        <p className="font-body text-xs text-bone/40 mt-4">
          Customers also pay a flat R{COURIER_FEE} WENA courier fee when they
          want it delivered rather than collecting themselves.
        </p>
      </section>

      <footer className="border-t border-bone/10 mx-auto max-w-5xl px-6 py-8 text-center">
        <p className="font-body text-sm text-bone/50">
          WENA Runner Network — we go the extra mile for you.
        </p>
      </footer>
    </main>
  );
}
