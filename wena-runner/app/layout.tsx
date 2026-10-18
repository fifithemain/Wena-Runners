import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import "./globals.css";
import "./marketplace.css";

export const metadata: Metadata = {
  title: "WENA Runners — Local errands, fair deals",
  description: "Post an errand, agree a fair price, and get it done by a verified local Runner.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <html lang="en-ZA">
      <body>
        {clerkConfigured ? <ClerkProvider>{children}</ClerkProvider> : children}
        <Analytics />
      </body>
    </html>
  );
}
