import type { Metadata } from "next";
import { Anton, Montserrat } from "next/font/google";
import "./globals.css";

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "WENA Runner | Turn errands into earnings",
  description:
    "Already in the shop? Get paid to grab it. Join the WENA Runner network in Mthatha.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${anton.variable} ${montserrat.variable} font-body`}>
        {children}
      </body>
    </html>
  );
}
