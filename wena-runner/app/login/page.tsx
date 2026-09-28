"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      router.push("/jobs");
    } catch (err: any) {
      setError(err.message);
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
        <h1 className="font-display text-4xl mt-4 mb-2">Runner login</h1>
        <p className="font-body text-bone/60 mb-8">Check the board, claim a job.</p>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="font-body text-sm text-hustlegold block mb-1">
              Phone number
            </label>
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-steel border border-bone/20 px-4 py-3 font-body focus:outline-none focus:border-hustlegold"
            />
          </div>
          <div>
            <label className="font-body text-sm text-hustlegold block mb-1">PIN</label>
            <input
              required
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full bg-steel border border-bone/20 px-4 py-3 font-body focus:outline-none focus:border-hustlegold"
            />
          </div>

          {error && <p className="font-body text-sm text-runnerred">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-runnerred hover:bg-runnerred/90 disabled:opacity-50 text-bone font-body font-bold px-6 py-4"
          >
            {submitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="font-body text-sm text-bone/50 mt-6">
          Not signed up yet?{" "}
          <Link href="/signup" className="text-hustlegold underline underline-offset-4">
            Become a Runner
          </Link>
        </p>
      </div>
    </main>
  );
}
