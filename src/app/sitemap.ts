import type { MetadataRoute } from "next";
import { prisma } from "@/db/prisma";
import { siteConfig } from "@/lib/site-config";

// Rebuilt at most once a day, after the daily data refresh adds new IPOs.
export const revalidate = 86400;

/** Every public page, including one detail page per IPO, for search engines. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/$/, "");
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/gmp-tracker`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/open-ipos`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/upcoming-ipos`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/recently-listed-ipos`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/compare`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const ipos = await prisma.ipo.findMany({ select: { slug: true, updatedAt: true } });
    return staticPages.concat(
      ipos.map((ipo) => ({
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
