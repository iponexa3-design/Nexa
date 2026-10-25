import type { IpoDataProvider } from "@/providers/ipo-data-provider";
import { getIpoDataProvider } from "@/providers";
import {
  ingestGmp,
  ingestIpos,
  ingestSubscription,
  type IngestSummary,
} from "@/services/ipo-ingest-service";
import { clearIpoLiveCache } from "@/services/ipo-query-service";
import { fillListingPrices } from "@/services/listing-price-service";
import type { NormalizedIpo } from "@/types/ipo";
import { logger } from "@/utils/logger";

/** GMP/subscription stay worth refreshing until this long after listing. */
const MARKET_DATA_WINDOW_DAYS = 30;

export interface RefreshSummary extends IngestSummary {
  provider: string;
  fetched: number;
  marketDataTargets: number;
  gmpSaved: number;
  subscriptionSaved: number;
  listingPricesFilled: number;
  failures: number;
}

/**
 * IPOs that still need GMP/subscription updates: dated issues that are
 * upcoming, open, awaiting listing, or listed within the last 30 days.
 * Announced IPOs (no dates yet) and long-listed ones are skipped to save quota.
 */
export function needsMarketData(ipo: NormalizedIpo, now: Date): boolean {
  if (!ipo.openDate) return false;
  const reference = Date.parse(ipo.listingDate ?? ipo.closeDate ?? ipo.openDate);
  if (!Number.isFinite(reference)) return true;
  return reference >= now.getTime() - MARKET_DATA_WINDOW_DAYS * 86_400_000;
}

/**
 * Fetches every IPO the provider exposes, stores it, then refreshes GMP and
 * subscription for every IPO still in its market window. Existing rows and
 * history are never deleted, so a failed or partial run can't hide records.
 */
export async function refreshIpoData(
  provider: IpoDataProvider = getIpoDataProvider(),
  now: Date = new Date(),
): Promise<RefreshSummary> {
  const ipos = await provider.fetchIpos();
  if (ipos.length === 0) {
    throw new Error("Provider returned no IPOs; existing database rows were preserved.");
  }

  const ingest = await ingestIpos(ipos);
  const targets = ipos.filter((ipo) => needsMarketData(ipo, now));

  let gmpSaved = 0;
  let subscriptionSaved = 0;
  let failures = 0;

  for (const ipo of targets) {
    try {
      const gmp = await provider.fetchGmp(ipo.slug);
      if (gmp && (await ingestGmp(gmp))) gmpSaved++;
    } catch (error) {
      failures++;
      logger.error("Failed to fetch/save GMP", {
        slug: ipo.slug,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      const subscription = await provider.fetchSubscription(ipo.slug, ipo.symbol);
      if (subscription && (await ingestSubscription(subscription))) subscriptionSaved++;
    } catch (error) {
      failures++;
      logger.error("Failed to fetch/save subscription", {
        slug: ipo.slug,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Listing prices come from the exchanges, not the IPO feed; a failure
  // here must not undo the rest of the refresh.
  let listingPricesFilled = 0;
  try {
    listingPricesFilled = (await fillListingPrices(now)).filled;
  } catch (error) {
    failures++;
    logger.error("Failed to fill listing prices", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  clearIpoLiveCache();

  return {
    provider: provider.name,
    fetched: ipos.length,
    ...ingest,
    marketDataTargets: targets.length,
    gmpSaved,
    subscriptionSaved,
    listingPricesFilled,
    failures,
  };
}
