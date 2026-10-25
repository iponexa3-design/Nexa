import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { refreshIpoData } from "@/services/ipo-refresh-service";
import { logger } from "@/utils/logger";

async function main() {
  logger.info("Starting IPO data fetch job");
  const summary = await refreshIpoData();
  logger.info("IPO data fetch job finished", { ...summary });
}

main()
  .catch((error) => {
    logger.error("IPO data fetch job failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("@/db/prisma");
    await prisma.$disconnect();
  });
