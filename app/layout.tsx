import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Tabstack brand fonts, matching tabstack.ai: Mozilla Headline for display,
// Mozilla Text for body. Self-hosted variable woff2, same as the site.
const mozillaHeadline = localFont({
  src: [
    { path: "../public/fonts/MozillaHeadline/MozillaHeadline-Variable.woff2", weight: "100 900", style: "normal" },
    { path: "../public/fonts/MozillaHeadline/MozillaHeadlineItalic-Variable.woff2", weight: "100 900", style: "italic" },
  ],
  variable: "--font-mozilla-headline",
  display: "swap",
});

const mozillaText = localFont({
  src: [
    { path: "../public/fonts/MozillaText/MozillaText-Variable.woff2", weight: "100 900", style: "normal" },
    { path: "../public/fonts/MozillaText/MozillaTextItalic-Variable.woff2", weight: "100 900", style: "italic" },
  ],
  variable: "--font-mozilla-text",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Competitor Brief",
  description:
    "Enter your product and a competitor's URL and get a cited intelligence brief that ends with how to position against them.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${mozillaHeadline.variable} ${mozillaText.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
