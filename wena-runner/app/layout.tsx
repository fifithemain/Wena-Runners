import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import "./globals.css";
import CookieConsent from "./cookie-consent";

const siteUrl = "https://wena-runners.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "WENA Runners | Local errands, fair deals",
    template: "%s | WENA Runners",
  },
  description: "Post an errand, agree a fair price, and get it done by a verified local Runner in your neighbourhood.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "WENA Runners",
    title: "WENA Runners | Local errands, fair deals",
    description: "Post an errand, agree a fair price, and get it done by a verified local Runner in your neighbourhood.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "WENA Runners | Local errands, fair deals",
    description: "Post an errand, agree a fair price, and get it done by a verified local Runner in your neighbourhood.",
  },
  icons: { icon: "/wena-runner-favicon.svg", shortcut: "/wena-runner-favicon.svg", apple: "/wena-runner-favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <html lang="en-ZA">
      <body>
        {clerkConfigured ? <ClerkProvider>{children}</ClerkProvider> : children}
        <CookieConsent />
      </body>
    </html>
  );
}
