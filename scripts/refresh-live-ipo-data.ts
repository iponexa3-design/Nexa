import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

import { prisma } from "../src/db/prisma";
import { refreshIpoData } from "../src/services/ipo-refresh-service";

async function main() {
  const summary = await refreshIpoData();
  console.log("Provider:", summary.provider);
  console.log("Fetched IPOs:", summary.fetched);
  console.log("Ingest summary:", {
    inserted: summary.inserted,
    updated: summary.updated,
    skipped: summary.skipped,
  });
  console.log("IPOs refreshed for GMP/subscription:", summary.marketDataTargets);
  console.log("GMP saved:", summary.gmpSaved);
  console.log("Subscription snapshots saved:", summary.subscriptionSaved);
  console.log("Listing prices filled from NSE/BSE:", summary.listingPricesFilled);
  if (summary.failures > 0) console.log("Failures (see errors above):", summary.failures);
}

main()
  .catch((err) => {
    console.error("Live refresh failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
