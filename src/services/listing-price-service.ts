import { prisma } from "@/db/prisma";
import { fetchBhavcopy, type BhavcopyRow, type Exchange } from "@/providers/exchange-bhavcopy";
import { logger } from "@/utils/logger";

/** Listed IPOs still missing a listing price are retried for this long. */
const DEFAULT_LOOKBACK_DAYS = 30;

export interface ListingMatchInput {
  symbol: string | null;
  exchange: string;
  priceBandLow: number | null;
  priceBandHigh: number | null;
}

export interface ListingMatch {
  listingPrice: number;
  /** Exchange base price on listing day = the final issue price (NSE only). */
  finalIssuePrice: number | null;
  exchange: Exchange;
}

/**
 * Picks the listing-day open from the exchange file, but only when the row
 * provably is the IPO's first trading day: on NSE the previous close equals
 * the issue price (inside the price band), or for NSE SME shares the symbol
 * did not trade the day before; on BSE the previous close is 0. Anything else
 * (an older stock with the same symbol, a postponed listing) is rejected.
 */
export function matchListingPrice(
  ipo: ListingMatchInput,
  files: Partial<Record<Exchange, Map<string, BhavcopyRow> | null>>,
  /** The NSE file of the previous trading day, to prove a first trading day. */
  previousNse: Map<string, BhavcopyRow> | null = null,
): ListingMatch | null {
  if (!ipo.symbol) return null;
  const symbol = ipo.symbol.trim().toUpperCase();
  const order: Exchange[] = /NSE/i.test(ipo.exchange) ? ["NSE", "BSE"] : ["BSE", "NSE"];

  for (const exchange of order) {
    const row = files[exchange]?.get(symbol);
    if (!row) continue;
    const previous = row.previousClose;
    const withinBand =
      previous !== null &&
      ipo.priceBandLow !== null &&
      ipo.priceBandHigh !== null &&
      previous >= ipo.priceBandLow - 0.01 &&
      previous <= ipo.priceBandHigh + 0.01;

    if (exchange === "NSE" && withinBand) {
      return { listingPrice: row.open, finalIssuePrice: previous, exchange };
    }
    // NSE SME shares (series SM/ST) show the discovered price, not the issue
    // price, as their listing-day base; prove the first trading day instead by
    // the symbol being absent from the previous trading day's file.
    if (
      exchange === "NSE" &&
      (row.series === "SM" || row.series === "ST") &&
      previousNse !== null &&
      !previousNse.has(symbol)
    ) {
      return { listingPrice: row.open, finalIssuePrice: null, exchange };
    }
    if (exchange === "BSE" && (previous === null || previous === 0 || withinBand)) {
      return { listingPrice: row.open, finalIssuePrice: withinBand ? previous : null, exchange };
    }
  }
  return null;
}

export interface ListingPriceSummary {
  candidates: number;
  filled: number;
}

/**
 * Fills the listing price (and final issue price) of recently listed IPOs
 * from the exchanges' official end-of-day files. Prices already stored,
 * including manually entered ones, are never overwritten.
 */
export async function fillListingPrices(
  now: Date = new Date(),
  lookbackDays: number = DEFAULT_LOOKBACK_DAYS,
): Promise<ListingPriceSummary> {
  const candidates = await prisma.ipo.findMany({
    where: {
      actualListingPrice: null,
      symbol: { not: null },
      listingDate: { lte: now, gte: new Date(now.getTime() - lookbackDays * 86_400_000) },
    },
    select: {
      id: true,
      slug: true,
      symbol: true,
      exchange: true,
      priceBandLow: true,
      priceBandHigh: true,
      issuePrice: true,
      listingDate: true,
    },
  });

  const fileCache = new Map<string, Promise<Map<string, BhavcopyRow> | null>>();
  const file = (exchange: Exchange, date: Date) => {
    const key = `${exchange}:${date.toISOString().slice(0, 10)}`;
    if (!fileCache.has(key)) {
      fileCache.set(
        key,
        fetchBhavcopy(exchange, date).catch((error) => {
          logger.warn("Exchange bhavcopy unavailable", {
            key,
            error: error instanceof Error ? error.message : String(error),
          });
          return null;
        }),
      );
    }
    return fileCache.get(key)!;
  };

  // The latest NSE file published before a date (skips weekends/holidays).
  const previousNseFile = async (date: Date) => {
    for (let back = 1; back <= 7; back++) {
      const rows = await file("NSE", new Date(date.getTime() - back * 86_400_000));
      if (rows) return rows;
    }
    return null;
  };

  let filled = 0;
  for (const ipo of candidates) {
    if (!ipo.listingDate) continue;
    const [nse, bse] = await Promise.all([file("NSE", ipo.listingDate), file("BSE", ipo.listingDate)]);
    const nseRow = ipo.symbol ? nse?.get(ipo.symbol.trim().toUpperCase()) : undefined;
    const previousNse =
      nseRow && (nseRow.series === "SM" || nseRow.series === "ST")
        ? await previousNseFile(ipo.listingDate)
        : null;
    const match = matchListingPrice(
      {
        symbol: ipo.symbol,
        exchange: ipo.exchange,
        priceBandLow: ipo.priceBandLow ? Number(ipo.priceBandLow) : null,
        priceBandHigh: ipo.priceBandHigh ? Number(ipo.priceBandHigh) : null,
      },
      { NSE: nse, BSE: bse },
      previousNse,
    );
    if (!match) continue;

    await prisma.ipo.update({
      where: { id: ipo.id },
      data: {
        actualListingPrice: match.listingPrice,
        ...(ipo.issuePrice === null && match.finalIssuePrice !== null
          ? { issuePrice: match.finalIssuePrice }
          : {}),
      },
    });
    filled++;
    logger.info("Listing price saved from exchange file", {
      slug: ipo.slug,
      exchange: match.exchange,
      listingPrice: match.listingPrice,
    });
  }

  return { candidates: candidates.length, filled };
}
