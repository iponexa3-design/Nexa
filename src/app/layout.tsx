import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { analyticsId, ConsentDefaults, GoogleAnalytics } from "@/components/layout/GoogleAnalytics";
import { AdSense, adsenseClient } from "@/components/layout/AdSense";
import { CookieNotice } from "@/components/layout/CookieNotice";
import { siteConfig } from "@/lib/site-config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Relative canonical and Open Graph URLs resolve against the live domain.
  // Canonicals are set per page (never here, or every page would point home).
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} - Indian IPO GMP & Listing Analysis`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    siteName: siteConfig.name,
    type: "website",
    locale: "en_IN",
  },
  // AdSense site-ownership verification.
  ...(adsenseClient() ? { other: { "google-adsense-account": adsenseClient() as string } } : {}),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#f3f7f6] text-[#202b2d]">
        <ConsentDefaults />
        <AdSense />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <GoogleAnalytics />
        <CookieNotice enabled={analyticsId() !== null || adsenseClient() !== null} />
      </body>
    </html>
  );
}
