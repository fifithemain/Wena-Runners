import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WENA Runners — Negotiable Errands",
  description: "Post an errand, agree a fair price, and get it done by a verified local Runner.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);\n  const clerkProxyUrl = process.env.NEXT_PUBLIC_CLERK_PROXY_URL;

  return (
    <html lang="en-ZA">
      <body>
        {clerkConfigured ? <ClerkProvider proxyUrl={clerkProxyUrl}>{children}</ClerkProvider> : children}
        <Analytics />
      </body>
    </html>
  );
}
