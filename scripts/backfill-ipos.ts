import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

/**
 * One-time history backfill: reads IPOAlerts' oldest-first "closed" list back
 * N days (default 45) and fills listing prices for that window from the
 * NSE/BSE files. Regular refreshes then keep extending history forward.
 *
 *   npm run backfill            last 45 days
 *   npm run backfill -- 30      last 30 days
 */
async function main() {
  const days = Number(process.argv[2] ?? 45);
  if (!Number.isFinite(days) || days < 1 || days > 730) {
    throw new Error(`Backfill window must be 1-730 days, got "${process.argv[2]}".`);
  }
  // Read by the provider factory when refreshIpoData() creates the provider.
  process.env.IPO_API_CLOSED_LOOKBACK_DAYS = String(days);
  // Roughly 1.5 closed IPOs a day at 3 per page, with generous headroom.
  process.env.IPO_API_CLOSED_MAX_PAGES = String(Math.ceil(days * 0.75) + 20);

  const { refreshIpoData } = await import("../src/services/ipo-refresh-service");
  const { fillListingPrices } = await import("../src/services/listing-price-service");

  console.log(`Backfilling the last ${days} days...`);
  const summary = await refreshIpoData();
  console.log("IPOs fetched:", summary.fetched, "| inserted:", summary.inserted, "| updated:", summary.updated, "| skipped:", summary.skipped);

  const listing = await fillListingPrices(new Date(), days);
  console.log(`Listing prices: ${summary.listingPricesFilled + listing.filled} filled; ${listing.candidates - listing.filled} still missing`);
}

main()
  .catch((error) => {
    console.error("Backfill failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("../src/db/prisma");
    await prisma.$disconnect();
  });
