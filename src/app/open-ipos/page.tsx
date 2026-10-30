import type { Metadata } from "next";
import { IpoListingPage } from "@/components/ipo/IpoListingPage";
import { listingPageContent } from "@/content/listing-pages";

// IPO status and GMP freshness change over time; re-read the database (never
// the external API) at most every 5 minutes instead of serving build-time data.
export const revalidate = 300;

const content = listingPageContent.open;

export const metadata: Metadata = {
  title: content.metaTitle,
  description: content.metaDescription,
  alternates: { canonical: content.path },
};

export default function OpenIposPage() {
  return <IpoListingPage category="open" />;
}