import type {
  NormalizedGmp,
  NormalizedIpo,
  NormalizedSubscription,
} from "@/types/ipo";

/**
 * Any IPO/GMP data source (a paid API, an official exchange feed, or a
 * manually maintained file) implements this. The rest of the app only
 * ever talks to this interface, never to a specific vendor - so swapping
 * providers later needs no changes outside src/providers.
 */
export interface IpoDataProvider {
  readonly name: string;
  fetchIpos(options?: FetchIposOptions): Promise<NormalizedIpo[]>;
  /** Paid requests used this month, for providers that count them. */
  apiUsage?(): { month: string; count: number; limit: number } | null;
  fetchGmp(ipoSlug: string): Promise<NormalizedGmp | null>;
  fetchSubscription(
    ipoSlug: string,
    symbol?: string | null,
  ): Promise<NormalizedSubscription | null>;
}

export interface FetchIposOptions {
  /** Provider list statuses to leave out of this fetch (e.g. "announced"). */
  skipStatuses?: string[];
}
