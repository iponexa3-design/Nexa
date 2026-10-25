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
  fetchIpos(): Promise<NormalizedIpo[]>;
  fetchGmp(ipoSlug: string): Promise<NormalizedGmp | null>;
  fetchSubscription(
    ipoSlug: string,
    symbol?: string | null,
  ): Promise<NormalizedSubscription | null>;
}
