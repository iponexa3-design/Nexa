import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

import { prisma } from "../src/db/prisma";
import { refreshOpenSubscriptions } from "../src/services/subscription-refresh-service";

/**
 * Fetches the official (BSE + NSE combined) subscription figures from NSE
 * for open IPOs and those that closed within the last N days (default 30).
 * Free: no IPO Alert calls.
 *
 *   npm run subscriptions:refresh -- 30
 */
async function main() {
  const days = Number(process.argv[2] ?? 30);
  if (!Number.isInteger(days) || days < 0 || days > 120) throw new Error("Days must be a whole number from 0 to 120.");
  const result = await refreshOpenSubscriptions(new Date(), undefined, { recentDays: days });
  console.log(`Subscription figures saved for ${result.saved} of ${result.open} IPOs (last ${days} days).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
