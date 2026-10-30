import type { MetadataRoute } from "next";
import { prisma } from "@/db/prisma";
import { siteConfig } from "@/lib/site-config";
import { guides } from "@/content/guides";
import { isIpoIndexable } from "@/services/ipo-summary";
import { computeIpoStatus } from "@/utils/ipo-status";

// Rebuilt at most once a day, after the daily data refresh adds new IPOs.
export const revalidate = 86400;

/**
 * Every public page, including the IPO detail pages that have real data.
 * Announced IPOs without a price or dates, and stale records, are left out
 * (their pages are marked noindex) until real data arrives.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/$/, "");
  const now = new Date();
  const page = (path: string, changeFrequency: "daily" | "weekly" | "monthly" | "yearly", priority: number) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });
  const staticPages: MetadataRoute.Sitemap = [
    page("/", "daily", 1),
    page("/gmp-tracker", "daily", 0.9),
    page("/ipo-subscription", "daily", 0.9),
    page("/open-ipos", "daily", 0.8),
    page("/upcoming-ipos", "daily", 0.8),
    page("/recently-listed-ipos", "daily", 0.8),
    page("/ipo-allotment-status", "daily", 0.8),
    page("/compare", "weekly", 0.5),
    page("/guides", "monthly", 0.7),
    ...guides.map((guide) => page(`/guides/${guide.slug}`, "monthly", 0.7)),
    page("/about", "yearly", 0.4),
    page("/contact", "yearly", 0.3),
    page("/disclaimer", "yearly", 0.3),
    page("/terms", "yearly", 0.2),
    page("/privacy", "yearly", 0.2),
  ];

  try {
    const ipos = await prisma.ipo.findMany({
      select: { slug: true, updatedAt: true, priceBandHigh: true, openDate: true, closeDate: true, listingDate: true },
    });
    return staticPages.concat(
      ipos
        .filter((ipo) =>
          isIpoIndexable(
            {
              status: computeIpoStatus(ipo),
              priceBandHigh: ipo.priceBandHigh ? Number(ipo.priceBandHigh) : null,
              openDate: ipo.openDate,
              closeDate: ipo.closeDate,
              listingDate: ipo.listingDate,
            },
            now,
          ),
        )
        .map((ipo) => ({
          url: `${base}/ipo/${ipo.slug}`,
          lastModified: ipo.updatedAt,
          changeFrequency: "daily" as const,
          priority: 0.7,
        })),
    );
  } catch {
    // Database unavailable: still publish the main pages.
    return staticPages;
  }
}
