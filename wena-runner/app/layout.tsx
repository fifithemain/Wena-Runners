import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WENA Runners — Negotiable Errands",
  description: "Post an errand, agree a fair price, and get it done by a verified local Runner.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const clerkConfigured = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
  );

  return (
    <html lang="en-ZA">
      <body>
        {clerkConfigured ? (
          <ClerkProvider>{children}</ClerkProvider>
        ) : (
          <>
            <p className="error" role="status">
              Clerk authentication is not configured. Add the Clerk publishable and secret keys before
              using sign-in or account features.
            </p>
            {children}
          </>
        )}
        <Analytics />
      </body>
    </html>
  );
}
