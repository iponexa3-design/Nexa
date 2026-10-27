import { prisma } from "@/db/prisma";
import { fetchNseRegistrar } from "@/providers/nse-issue-info";
import { logger } from "@/utils/logger";

/** IPOs that closed within this many days (or later) still get a registrar lookup. */
const LOOKBACK_DAYS = 30;

/**
 * Stores the registrar of recent IPOs from NSE issue information, so the
 * allotment page can link straight to the right registrar. Only IPOs without
 * one are looked up; SME issues listed only on BSE are not on NSE and skipped.
 */
export async function fillRegistrars(now: Date = new Date()): Promise<{ candidates: number; filled: number }> {
  const candidates = await prisma.ipo.findMany({
    where: {
      registrar: null,
      symbol: { not: null },
      openDate: { not: null, lte: new Date(now.getTime() + 7 * 86_400_000) },
      closeDate: { gte: new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000) },
    },
    select: { id: true, slug: true, symbol: true, ipoType: true, exchange: true },
  });

  let filled = 0;
  for (const ipo of candidates) {
    const onNse = ipo.exchange.toUpperCase().includes("NSE");
    if (ipo.ipoType === "SME" && !onNse) continue;
    try {
      const series = ipo.ipoType === "SME" ? ["SME", "EQ"] : ["EQ", "SME"];
      const registrar = await fetchNseRegistrar(ipo.symbol!.trim().toUpperCase(), series);
      if (!registrar) continue;
      await prisma.ipo.update({ where: { id: ipo.id }, data: { registrar } });
      filled++;
      logger.info("Registrar saved from NSE", { slug: ipo.slug, registrar });
    } catch (error) {
      logger.warn("NSE registrar lookup failed", {
        slug: ipo.slug,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { candidates: candidates.length, filled };
}
