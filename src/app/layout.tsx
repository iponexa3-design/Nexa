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
  title: {
    default: `${siteConfig.name} - Indian IPO GMP & Listing Analysis`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#f3f7f6] text-[#202b2d]">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <ConsentDefaults />
        <GoogleAnalytics />
        <AdSense />
        <CookieNotice enabled={analyticsId() !== null || adsenseClient() !== null} />
      </body>
    </html>
  );
}
