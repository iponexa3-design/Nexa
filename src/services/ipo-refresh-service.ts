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
import { fillRegistrars } from "@/services/registrar-service";
import type { NormalizedIpo } from "@/types/ipo";
import { logger } from "@/utils/logger";

/** Subscription stays worth refreshing until this long after listing. */
const MARKET_DATA_WINDOW_DAYS = 30;

export interface RefreshSummary extends IngestSummary {
  provider: string;
  fetched: number;
  marketDataTargets: number;
  gmpTargets: number;
  gmpSaved: number;
  subscriptionSaved: number;
  listingPricesFilled: number;
  registrarsFilled: number;
  failures: number;
  /** Paid API requests used this month, when the provider counts them. */
  apiUsage: { month: string; count: number; limit: number } | null;
}

export interface RefreshOptions {
  /** Fetch GMP (paid calls, one per IPO). GMP changes once a day at the source. */
  refreshGmp?: boolean;
  /** Include IPOs that are announced but undated; they rarely change. */
  includeAnnounced?: boolean;
}

/**
 * IPOs that still need subscription updates (free NSE data): dated issues
 * that are upcoming, open, awaiting listing, or listed within the last 30
 * days. Announced IPOs (no dates yet) and long-listed ones are skipped.
 */
export function needsMarketData(ipo: NormalizedIpo, now: Date): boolean {
  if (!ipo.openDate) return false;
  const reference = Date.parse(ipo.listingDate ?? ipo.closeDate ?? ipo.openDate);
  if (!Number.isFinite(reference)) return true;
  return reference >= now.getTime() - MARKET_DATA_WINDOW_DAYS * 86_400_000;
}

/**
 * IPOs whose GMP is still shown: dated and not yet listed. Listed IPOs show
 * listing results instead, so their GMP is never fetched (saves paid calls).
 */
export function needsGmp(ipo: NormalizedIpo, now: Date): boolean {
  if (!ipo.openDate) return false;
  if (!ipo.listingDate) return true;
  const listing = Date.parse(ipo.listingDate);
  return !Number.isFinite(listing) || listing > now.getTime();
}

/**
 * Fetches every IPO the provider exposes, stores it, then refreshes GMP for
 * IPOs not yet listed and subscription for IPOs in their market window.
 * Existing rows and history are never deleted, so a failed or partial run
 * can't hide records.
 */
export async function refreshIpoData(
  provider: IpoDataProvider = getIpoDataProvider(),
  now: Date = new Date(),
  { refreshGmp = true, includeAnnounced = true }: RefreshOptions = {},
): Promise<RefreshSummary> {
  const ipos = await provider.fetchIpos(includeAnnounced ? {} : { skipStatuses: ["announced"] });
  if (ipos.length === 0) {
    throw new Error("Provider returned no IPOs; existing database rows were preserved.");
  }

  const ingest = await ingestIpos(ipos);
  const targets = ipos.filter((ipo) => needsMarketData(ipo, now));
  const gmpTargets = refreshGmp ? ipos.filter((ipo) => needsGmp(ipo, now)) : [];

  let gmpSaved = 0;
  let subscriptionSaved = 0;
  let failures = 0;

  for (const ipo of gmpTargets) {
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
  }

  for (const ipo of targets) {
    try {
      const subscription = await provider.fetchSubscription(ipo.slug, ipo.symbol, ipo.ipoType);
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

  // Registrars (for the allotment page) come from NSE issue information.
  let registrarsFilled = 0;
  try {
    registrarsFilled = (await fillRegistrars(now)).filled;
  } catch (error) {
    failures++;
    logger.error("Failed to fill registrars", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  clearIpoLiveCache();

  return {
    provider: provider.name,
    fetched: ipos.length,
    ...ingest,
    marketDataTargets: targets.length,
    gmpTargets: gmpTargets.length,
    gmpSaved,
    subscriptionSaved,
    listingPricesFilled,
    registrarsFilled,
    failures,
    apiUsage: provider.apiUsage?.() ?? null,
  };
}
