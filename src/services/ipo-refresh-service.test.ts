import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/ipo-ingest-service", () => ({
  ingestIpos: vi.fn(async () => ({ inserted: 0, updated: 0, skipped: 0 })),
  ingestGmp: vi.fn(async () => true),
  ingestSubscription: vi.fn(async () => true),
}));
vi.mock("@/services/ipo-query-service", () => ({ clearIpoLiveCache: vi.fn() }));
vi.mock("@/services/listing-price-service", () => ({
  fillListingPrices: vi.fn(async () => ({ candidates: 0, filled: 0 })),
}));
vi.mock("@/services/registrar-service", () => ({
  fillRegistrars: vi.fn(async () => ({ candidates: 0, filled: 0 })),
}));
vi.mock("@/providers", () => ({ getIpoDataProvider: vi.fn() }));

import { needsGmp, needsMarketData, refreshIpoData } from "@/services/ipo-refresh-service";
import type { IpoDataProvider } from "@/providers/ipo-data-provider";
import type { NormalizedIpo } from "@/types/ipo";

const NOW = new Date("2026-10-25T00:00:00Z");

function ipo(slug: string, dates: Partial<NormalizedIpo>): NormalizedIpo {
  return { slug, companyName: slug, ipoType: "MAINBOARD", exchange: "NSE", ...dates };
}

describe("needsMarketData", () => {
  it("covers upcoming, open, awaiting-listing and recently listed IPOs", () => {
    expect(needsMarketData(ipo("upcoming", { openDate: "2026-10-28" }), NOW)).toBe(true);
    expect(needsMarketData(ipo("awaiting", { openDate: "2026-10-21", listingDate: "2026-10-28" }), NOW)).toBe(true);
    expect(needsMarketData(ipo("recent", { openDate: "2026-10-01", listingDate: "2026-10-10" }), NOW)).toBe(true);
  });

  it("skips announced IPOs without dates and long-listed IPOs", () => {
    expect(needsMarketData(ipo("announced", {}), NOW)).toBe(false);
    expect(needsMarketData(ipo("old", { openDate: "2026-08-01", listingDate: "2026-08-08" }), NOW)).toBe(false);
  });
});

describe("refreshIpoData", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refreshes GMP for every IPO in its market window, with no fixed cap", async () => {
    const dated = Array.from({ length: 40 }, (_, index) =>
      ipo(`ipo-${index}`, { openDate: "2026-10-27", closeDate: "2026-10-29" }),
    );
    const fetchGmp = vi.fn(async (slug: string) => ({ ipoSlug: slug, gmp: 1, source: "test" }));
    const provider: IpoDataProvider = {
      name: "test",
      fetchIpos: async () => [...dated, ipo("announced", {})],
      fetchGmp,
      fetchSubscription: async () => null,
    };

    const summary = await refreshIpoData(provider, NOW);

    expect(summary.fetched).toBe(41);
    expect(summary.marketDataTargets).toBe(40);
    expect(fetchGmp).toHaveBeenCalledTimes(40);
    expect(fetchGmp).not.toHaveBeenCalledWith("announced");
  });

  it("keeps going when one IPO's GMP request fails", async () => {
    const provider: IpoDataProvider = {
      name: "test",
      fetchIpos: async () => [ipo("a", { openDate: "2026-10-27" }), ipo("b", { openDate: "2026-10-27" })],
      fetchGmp: vi.fn()
        .mockRejectedValueOnce(new Error("timeout"))
        .mockResolvedValueOnce({ ipoSlug: "b", gmp: 5, source: "test" }),
      fetchSubscription: async () => null,
    };
    vi.spyOn(console, "error").mockImplementation(() => {});

    const summary = await refreshIpoData(provider, NOW);

    expect(summary.failures).toBe(1);
    expect(summary.gmpSaved).toBe(1);
  });

  it("refuses an empty provider response so existing records are never wiped", async () => {
    const provider: IpoDataProvider = {
      name: "test",
      fetchIpos: async () => [],
      fetchGmp: async () => null,
      fetchSubscription: async () => null,
    };
    await expect(refreshIpoData(provider, NOW)).rejects.toThrow("no IPOs");
  });
});

describe("needsGmp", () => {
  it("fetches GMP only for dated IPOs that have not listed yet", () => {
    expect(needsGmp(ipo("upcoming", { openDate: "2026-10-28" }), NOW)).toBe(true);
    expect(needsGmp(ipo("awaiting", { openDate: "2026-10-21", listingDate: "2026-10-28" }), NOW)).toBe(true);
    expect(needsGmp(ipo("listed", { openDate: "2026-10-15", listingDate: "2026-10-23" }), NOW)).toBe(false);
    expect(needsGmp(ipo("announced", {}), NOW)).toBe(false);
  });

  it("skips GMP and announced IPOs when asked, to save paid calls", async () => {
    const fetchIpos = vi.fn(async () => [ipo("a", { openDate: "2026-10-27" })]);
    const fetchGmp = vi.fn(async () => null);
    const provider: IpoDataProvider = { name: "test", fetchIpos, fetchGmp, fetchSubscription: async () => null };

    const summary = await refreshIpoData(provider, NOW, { refreshGmp: false, includeAnnounced: false });

    expect(fetchIpos).toHaveBeenCalledWith({ skipStatuses: ["announced"] });
    expect(fetchGmp).not.toHaveBeenCalled();
    expect(summary.gmpTargets).toBe(0);
  });
});
