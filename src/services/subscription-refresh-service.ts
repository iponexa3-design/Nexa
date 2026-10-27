import { prisma } from "@/db/prisma";
import { getIpoDataProvider } from "@/providers";
import type { IpoDataProvider } from "@/providers/ipo-data-provider";
import { ingestSubscription } from "@/services/ipo-ingest-service";
import { clearIpoLiveCache } from "@/services/ipo-query-service";
import { getIndiaDateKey, toDateKey } from "@/utils/ipo-status";
import { logger } from "@/utils/logger";

/**
 * Updates subscription figures of IPOs open today (IST) from NSE's free bid
 * details; no paid IPO feed calls. Run every half hour during bidding so the
 * site follows the live figures instead of last night's; the last snapshot
 * of each day becomes that day's row in the day-wise table. A figure NSE
 * has not updated since the last run is not stored again. `recentDays` also
 * includes IPOs that closed within that many days (to correct past figures).
 */
export async function refreshOpenSubscriptions(
  now: Date = new Date(),
  provider: IpoDataProvider = getIpoDataProvider(),
  { recentDays = 0 }: { recentDays?: number } = {},
): Promise<{ open: number; saved: number }> {
  const today = getIndiaDateKey(now);
  const earliestClose = getIndiaDateKey(new Date(now.getTime() - recentDays * 86_400_000));
  const candidates = await prisma.ipo.findMany({
    where: {
      symbol: { not: null },
      openDate: { not: null, lte: now },
      closeDate: { gte: new Date(now.getTime() - (recentDays + 2) * 86_400_000) },
    },
    select: {
      slug: true,
      symbol: true,
      ipoType: true,
      openDate: true,
      closeDate: true,
    },
  });
  const open = candidates.filter((ipo) => {
    const opens = toDateKey(ipo.openDate);
    const closes = toDateKey(ipo.closeDate);
    return opens !== null && closes !== null && opens <= today && earliestClose <= closes;
  });

  let saved = 0;
  for (const ipo of open) {
    try {
      const subscription = await provider.fetchSubscription(ipo.slug, ipo.symbol, ipo.ipoType);
      // ingestSubscription skips a snapshot that is already stored.
      if (subscription && (await ingestSubscription(subscription))) saved++;
    } catch (error) {
      logger.warn("Subscription update failed", {
        slug: ipo.slug,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (saved > 0) clearIpoLiveCache();
  return { open: open.length, saved };
}
