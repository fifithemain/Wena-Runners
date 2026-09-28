"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [zone, setZone] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, zone, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setResult({
        ok: true,
        message:
          "You're signed up! We'll approve your account shortly — you'll be able to log in once you're switched on.",
      });
    } catch (err: any) {
      setResult({ ok: false, message: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-asphalt text-bone px-6 py-12">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-sm text-bone/50 underline underline-offset-4">
          &larr; Back
        </Link>
        <h1 className="font-display text-4xl mt-4 mb-2">Become a Runner</h1>
        <p className="font-body text-bone/60 mb-8">
          Next time you're at the shops, you could be earning. Sign up below.
        </p>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="font-body text-sm text-hustlegold block mb-1">Full name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-steel border border-bone/20 px-4 py-3 font-body focus:outline-none focus:border-hustlegold"
            />
          </div>
          <div>
            <label className="font-body text-sm text-hustlegold block mb-1">
              Phone number
            </label>
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="071 234 5678"
              className="w-full bg-steel border border-bone/20 px-4 py-3 font-body focus:outline-none focus:border-hustlegold"
            />
          </div>
          <div>
            <label className="font-body text-sm text-hustlegold block mb-1">
              Area you're usually around
            </label>
            <input
              required
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="e.g. CBD, Ngangelizwe, Fortgale"
              className="w-full bg-steel border border-bone/20 px-4 py-3 font-body focus:outline-none focus:border-hustlegold"
            />
          </div>
          <div>
            <label className="font-body text-sm text-hustlegold block mb-1">
              Set a 4 to 6 digit PIN
            </label>
            <input
              required
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="For logging in later"
              className="w-full bg-steel border border-bone/20 px-4 py-3 font-body focus:outline-none focus:border-hustlegold"
            />
          </div>

          {result && (
            <p
              className={`font-body text-sm ${
                result.ok ? "text-hustlegold" : "text-runnerred"
              }`}
            >
              {result.message}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-runnerred hover:bg-runnerred/90 disabled:opacity-50 text-bone font-body font-bold px-6 py-4"
          >
            {submitting ? "Signing up..." : "Sign up"}
          </button>
        </form>

        <p className="font-body text-sm text-bone/50 mt-6">
          Already signed up?{" "}
          <Link href="/login" className="text-hustlegold underline underline-offset-4">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
