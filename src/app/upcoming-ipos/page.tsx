import type { Metadata } from "next";
import { IpoListingPage } from "@/components/ipo/IpoListingPage";

// IPO status and GMP freshness change over time; re-read the database (never
// the external API) at most every 5 minutes instead of serving build-time data.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Upcoming IPOs",
};

export default function UpcomingIposPage() {
  return <IpoListingPage category="upcoming" />;
}