import { readFile } from "node:fs/promises";
import path from "node:path";
import type { IpoDataProvider } from "@/providers/ipo-data-provider";
import type {
  NormalizedGmp,
  NormalizedIpo,
  NormalizedSubscription,
} from "@/types/ipo";

interface ManualFeedFile {
  ipos: NormalizedIpo[];
  gmp: Array<{ ipoSlug: string; gmp: number; sourceUpdatedAt?: string | null }>;
  subscription: Array<Omit<NormalizedSubscription, "source">>;
}

const FEED_PATH = path.join(process.cwd(), "data", "manual-ipo-feed.json");

/**
 * Reads a manually maintained JSON file as the IPO/GMP data source.
 * Legitimate first-party data (no scraping), useful until a paid
 * GMP/IPO API vendor is selected and configured (see HttpApiProvider).
 */
export class ManualJsonProvider implements IpoDataProvider {
  readonly name = "manual-json";

  private async readFeed(): Promise<ManualFeedFile> {
    const raw = await readFile(FEED_PATH, "utf-8");
    return JSON.parse(raw) as ManualFeedFile;
  }

  async fetchIpos(): Promise<NormalizedIpo[]> {
    const feed = await this.readFeed();
    return feed.ipos;
  }

  async fetchGmp(ipoSlug: string): Promise<NormalizedGmp | null> {
    const feed = await this.readFeed();
    const entry = feed.gmp.find((item) => item.ipoSlug === ipoSlug);
    if (!entry) return null;
    return {
      ipoSlug: entry.ipoSlug,
      gmp: entry.gmp,
      source: this.name,
      sourceUpdatedAt: entry.sourceUpdatedAt ?? null,
    };
  }

  async fetchSubscription(
    ipoSlug: string,
    _symbol?: string | null,
  ): Promise<NormalizedSubscription | null> {
    const feed = await this.readFeed();
    const entry = feed.subscription.find((item) => item.ipoSlug === ipoSlug);
    if (!entry) return null;
    return { ...entry, source: this.name };
  }
}
