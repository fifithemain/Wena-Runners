"use client";

import { SignUp } from "@clerk/nextjs";
import { useState } from "react";

export default function SignupForm() {
  const [details, setDetails] = useState<{ fullName: string; phone: string; role: string; zone: string } | null>(
    null,
  );
  const [role, setRole] = useState("customer");

  if (details) {
    return (
      <SignUp
        routing="hash"
        signInUrl="/login"
        unsafeMetadata={details}
      />
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setDetails({
          fullName: String(data.get("fullName") || "").trim(),
          phone: String(data.get("phone") || "").trim(),
          role: String(data.get("role") || "customer"),
          zone: String(data.get("zone") || "").trim(),
        });
      }}
    >
      <div className="field">
        <label htmlFor="fullName">Full name</label>
        <input id="fullName" name="fullName" required maxLength={120} />
      </div>
      <div className="field">
        <label htmlFor="phone">Phone</label>
        <input id="phone" name="phone" required maxLength={40} />
      </div>
      <div className="field">
        <label htmlFor="role">Account type</label>
        <select
          id="role"
          name="role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          <option value="customer">Request errands</option>
          <option value="runner">Become a Runner</option>
          <option value="both">Both</option>
        </select>
      </div>
      {role !== "customer" && (
        <div className="field">
          <label htmlFor="zone">Runner area / zone</label>
          <input id="zone" name="zone" required maxLength={120} />
        </div>
      )}
      <button className="btn" type="submit">
        Continue to sign up
      </button>
    </form>
  );
}
