import type { Metadata } from "next";
import { Bricolage_Grotesque, Public_Sans, IBM_Plex_Mono, Hind } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display-face",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const body = Public_Sans({
  variable: "--font-body-face",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const data = IBM_Plex_Mono({
  variable: "--font-data-face",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Neither Bricolage Grotesque nor Public Sans cover Devanagari (verified
// against Google Fonts' own subset metadata — both list only latin,
// latin-ext, menu, vietnamese). Hind is the companion for any Hindi text
// span (e.g. services.name_hi) — never a replacement for the main pairing.
const devanagari = Hind({
  variable: "--font-devanagari-face",
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Stitchera — Doorstep Tailoring",
  description:
    "घर से pickup, verified local tailor से सिलाई, quality check और doorstep delivery। कानपुर में उपलब्ध।",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${data.variable} ${devanagari.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cotton text-ink">
        {children}
      </body>
    </html>
  );
}
