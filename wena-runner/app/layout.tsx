import type {Metadata} from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from '@vercel/analytics/next';
import "./globals.css";

export const metadata:Metadata={
  title:"WENA Runners — Negotiable Errands",
  description:"Post an errand, agree a fair price, and get it done by a verified local Runner."
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return (
    <html lang="en-ZA">
      <body>
        <ClerkProvider>
          {children}
          <Analytics />
        </ClerkProvider>
      </body>
    </html>
  );
}
