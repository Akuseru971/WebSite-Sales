import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const heading = Cormorant_Garamond({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"]
});

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "ListingBoost AI",
  description: "Internal SaaS for property prospecting, image enhancement, mockup generation and outreach."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={cn(body.variable, heading.variable, "min-h-screen bg-sand font-[var(--font-body)] text-ink antialiased")}>
        {children}
      </body>
    </html>
  );
}
