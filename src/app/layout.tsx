import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Rubik, Schibsted_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { DESCRIPTION, SITE_URL, X_HANDLE } from "@/lib/site";
import "./globals.css";

/* Rubik Black for display type: the closest free face to the wordmark's
   weight and round corners. Schibsted Grotesk for everything that has to be
   read, and IBM Plex Mono for what is printed: the ticket stub, the sniff
   report, the receipt. */
const display = Rubik({ subsets: ["latin"], weight: ["700", "800", "900"], variable: "--font-display", display: "swap" });
const body = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono", display: "swap" });

const TITLE = "Spot: the buy button for every app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  /* Images come from opengraph-image.png and twitter-image.png beside this
     file, so the card and the page cannot drift apart. */
  openGraph: { type: "website", siteName: "Spot", title: TITLE, description: DESCRIPTION, url: "/" },
  twitter: { card: "summary_large_image", site: `@${X_HANDLE}`, title: TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
