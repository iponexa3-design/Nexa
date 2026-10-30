import { prisma } from "@/db/prisma";
import { fetchNseIssueInfo } from "@/providers/nse-issue-info";
import { logger } from "@/utils/logger";

/** IPOs that closed within this many days (or later) are still looked up. */
const LOOKBACK_DAYS = 30;

/**
 * Fills details the IPO feed does not always provide, from NSE issue
 * information: the registrar (for the allotment links) and, when missing,
 * the lot size (needed for minimum investment and per-lot estimates). Only
 * IPOs missing one of them are looked up; SME issues listed only on BSE are
 * not on NSE and skipped. Values from the feed are never overwritten.
 */
export async function fillRegistrars(now: Date = new Date()): Promise<{ candidates: number; filled: number }> {
  const candidates = await prisma.ipo.findMany({
    where: {
      OR: [{ registrar: null }, { lotSize: null }],
      symbol: { not: null },
      openDate: { not: null, lte: new Date(now.getTime() + 7 * 86_400_000) },
      closeDate: { gte: new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000) },
    },
    select: { id: true, slug: true, symbol: true, ipoType: true, exchange: true, registrar: true, lotSize: true },
  });

  let filled = 0;
  for (const ipo of candidates) {
    const onNse = ipo.exchange.toUpperCase().includes("NSE");
    if (ipo.ipoType === "SME" && !onNse) continue;
    try {
      const series = ipo.ipoType === "SME" ? ["SME", "EQ"] : ["EQ", "SME"];
      const info = await fetchNseIssueInfo(ipo.symbol!.trim().toUpperCase(), series);
      if (!info) continue;
      const data = {
        ...(ipo.registrar === null && info.registrar ? { registrar: info.registrar } : {}),
        ...(ipo.lotSize === null && info.lotSize ? { lotSize: info.lotSize } : {}),
      };
      if (Object.keys(data).length === 0) continue;
      await prisma.ipo.update({ where: { id: ipo.id }, data });
      filled++;
      logger.info("IPO details saved from NSE", { slug: ipo.slug, ...data });
    } catch (error) {
      logger.warn("NSE issue information lookup failed", {
        slug: ipo.slug,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { candidates: candidates.length, filled };
}
