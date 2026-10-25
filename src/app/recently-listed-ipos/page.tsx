import type { Metadata } from "next";
import { IpoListingPage } from "@/components/ipo/IpoListingPage";

// IPO status and GMP freshness change over time; re-read the database (never
// the external API) at most every 5 minutes instead of serving build-time data.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Recently Listed IPOs",
};

export default function RecentlyListedIposPage() {
  return <IpoListingPage category="recentlyListed" />;
}