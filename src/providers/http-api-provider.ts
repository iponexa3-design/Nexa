import type { IpoDataProvider } from "@/providers/ipo-data-provider";
import type {
  NormalizedGmp,
  NormalizedIpo,
  NormalizedSubscription,
} from "@/types/ipo";
import { withRetry } from "@/utils/retry";

interface HttpApiProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
}

class RateLimitedError extends Error {
  retryAfterMs: number;
  constructor(retryAfterMs: number) {
    super("Rate limited");
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Generic REST-based provider for a paid IPO/GMP data API (e.g. an
 * "IPO Guru"/"IPOAlerts"-style vendor). The endpoint paths and response
 * shape below are placeholders - update them to match whichever vendor's
 * documentation you sign up for; nothing else in the app needs to change
 * as long as fetchIpos/fetchGmp/fetchSubscription keep returning the
 * Normalized* shapes.
 */
export class HttpApiProvider implements IpoDataProvider {
  readonly name: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor({ name, baseUrl, apiKey, timeoutMs = 10_000 }: HttpApiProviderConfig) {
    this.name = name;
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  private async request<T>(pathname: string): Promise<T> {
    return withRetry(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(`${this.baseUrl}${pathname}`, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          signal: controller.signal,
        });

        if (response.status === 429) {
          const retryAfterHeader = response.headers.get("Retry-After");
          const retryAfterMs = retryAfterHeader
            ? Number(retryAfterHeader) * 1000
            : 2000;
          throw new RateLimitedError(retryAfterMs);
        }

        if (!response.ok) {
          throw new Error(
            `${this.name} request to ${pathname} failed with status ${response.status}`,
          );
        }

        return (await response.json()) as T;
      } finally {
        clearTimeout(timeout);
      }
    });
  }

  async fetchIpos(): Promise<NormalizedIpo[]> {
    return this.request<NormalizedIpo[]>("/ipos");
  }

  async fetchGmp(ipoSlug: string): Promise<NormalizedGmp | null> {
    try {
      return await this.request<NormalizedGmp>(
        `/gmp/${encodeURIComponent(ipoSlug)}`,
      );
    } catch {
      return null;
    }
  }

  async fetchSubscription(
    ipoSlug: string,
  ): Promise<NormalizedSubscription | null> {
    try {
      return await this.request<NormalizedSubscription>(
        `/subscription/${encodeURIComponent(ipoSlug)}`,
      );
    } catch {
      return null;
    }
  }
}
