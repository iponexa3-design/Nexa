import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getIpoDataProvider } from "@/providers";
import {
  ingestGmp,
  ingestIpos,
  ingestSubscription,
} from "@/services/ipo-ingest-service";
import { logger } from "@/utils/logger";

async function main() {
  const provider = getIpoDataProvider();
  logger.info("Starting IPO data fetch job", { provider: provider.name });

  let ipos;
  try {
    ipos = await provider.fetchIpos();
  } catch (error) {
    logger.error("Provider fetchIpos failed - aborting job", {
      provider: provider.name,
      error: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
    return;
  }

  const ipoSummary = await ingestIpos(ipos);
  logger.info("IPO ingest complete", ipoSummary);

  let gmpSaved = 0;
  let subscriptionSaved = 0;

  for (const ipo of ipos) {
    try {
      const gmp = await provider.fetchGmp(ipo.slug);
      if (gmp && (await ingestGmp(gmp))) gmpSaved++;
    } catch (error) {
      logger.error("Failed to fetch/save GMP", {
        slug: ipo.slug,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      const subscription = await provider.fetchSubscription(ipo.slug);
      if (subscription && (await ingestSubscription(subscription))) {
        subscriptionSaved++;
      }
    } catch (error) {
      logger.error("Failed to fetch/save subscription", {
        slug: ipo.slug,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info("IPO data fetch job finished", {
    provider: provider.name,
    ...ipoSummary,
    gmpSaved,
    subscriptionSaved,
  });
}

main()
  .catch((error) => {
    logger.error("IPO data fetch job crashed", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("@/db/prisma");
    await prisma.$disconnect();
  });
