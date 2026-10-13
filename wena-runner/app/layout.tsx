import type {Metadata} from "next";
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
        {children}
        <Analytics />
      </body>
    </html>
  );
}
