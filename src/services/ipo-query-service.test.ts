import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db/prisma", () => ({
  prisma: {
    ipo: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/providers", () => ({
  getIpoDataProvider: vi.fn(),
}));

import { prisma } from "@/db/prisma";
import { getIpoDataProvider } from "@/providers";
import type { IpoDataProvider } from "@/providers/ipo-data-provider";
import {
  clearIpoLiveCache,
  getGmpTrackerData,
  getHomepageIpoGroups,
  getIpoBySlug,
} from "@/services/ipo-query-service";

describe("getHomepageIpoGroups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearIpoLiveCache();
  });

  it("falls back to the live provider when the database has no IPO rows", async () => {
    vi.mocked(prisma.ipo.findMany).mockResolvedValue([] as never[]);
    vi.mocked(getIpoDataProvider).mockReturnValue({
      name: "http-api",
      fetchIpos: async () => [
        {
          slug: "example-ipo",
          companyName: "Example IPO",
          ipoType: "MAINBOARD",
          exchange: "NSE, BSE",
          priceBandLow: 100,
          priceBandHigh: 120,
          lotSize: 50,
          issuePrice: 110,
          actualListingPrice: null,
          openDate: "2026-09-10",
          closeDate: "2026-11-20",
          listingDate: null,
          status: "OPEN",
          symbol: "EXAMPLE",
        },
      ],
      fetchGmp: async () => ({
        ipoSlug: "example-ipo",
        gmp: 15,
        source: "ipoalerts",
        sourceUpdatedAt: "2026-02-12T10:00:00.000Z",
      }),
      fetchSubscription: async () => null,
    } as unknown as IpoDataProvider);

    const groups = await getHomepageIpoGroups();

    expect(groups.open).toHaveLength(1);
    expect(groups.open[0]?.companyName).toBe("Example IPO");
    expect(groups.open[0]?.gmp).toBeNull();
  });

  it("reuses cached live homepage data to avoid repeated provider calls", async () => {
    vi.mocked(prisma.ipo.findMany).mockResolvedValue([] as never[]);
    const fetchIpos = vi.fn().mockResolvedValue([
      {
        slug: "example-ipo",
        companyName: "Example IPO",
        ipoType: "MAINBOARD",
        exchange: "NSE, BSE",
        priceBandLow: 100,
        priceBandHigh: 120,
        lotSize: 50,
        issuePrice: 110,
        actualListingPrice: null,
        openDate: "2026-09-10",
        closeDate: "2026-11-20",
        listingDate: null,
        status: "OPEN",
        symbol: "EXAMPLE",
      },
    ]);
    const fetchGmp = vi.fn().mockResolvedValue({
      ipoSlug: "example-ipo",
      gmp: 15,
      source: "ipoalerts",
      sourceUpdatedAt: "2026-02-12T10:00:00.000Z",
    });

    vi.mocked(getIpoDataProvider).mockReturnValue({
      name: "http-api",
      fetchIpos,
      fetchGmp,
      fetchSubscription: async () => null,
    } as unknown as IpoDataProvider);

    await getHomepageIpoGroups();
    await getHomepageIpoGroups();

    expect(fetchIpos).toHaveBeenCalledTimes(1);
    expect(fetchGmp).not.toHaveBeenCalled();
  });

  it("marks the live feed unavailable when the provider quota is exhausted", async () => {
    vi.mocked(prisma.ipo.findMany).mockResolvedValue([] as never[]);
    vi.mocked(getIpoDataProvider).mockReturnValue({
      name: "http-api",
      fetchIpos: async () => {
        throw new Error("Usage limit reached (ERR:QTAEXCEEDED)");
      },
      fetchGmp: async () => null,
      fetchSubscription: async () => null,
    } as unknown as IpoDataProvider);

    const groups = await getHomepageIpoGroups();

    expect(groups.liveFeedUnavailable).toBe(true);
    expect(groups.liveFeedQuotaExceeded).toBe(true);
  });
});

describe("getIpoBySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearIpoLiveCache();
  });

  it("loads enriched live details when the database has no matching IPO", async () => {
    vi.mocked(prisma.ipo.findUnique).mockResolvedValue(null as never);
    vi.mocked(getIpoDataProvider).mockReturnValue({
      name: "http-api",
      fetchIpos: async () => [{
        slug: "example-ipo",
        companyName: "Example IPO",
        ipoType: "MAINBOARD",
        exchange: "NSE",
        openDate: "2026-10-15",
        closeDate: "2026-10-20",
        research: {
          minimumInvestment: 15000,
          listingGain: null,
          logoUrl: null,
          prospectusUrl: "https://example.test/rhp.pdf",
          infoUrl: null,
          nseInfoUrl: null,
          bseInfoUrl: null,
          about: "Company overview from the provider.",
          strengths: ["Strong distribution"],
          risks: ["Customer concentration"],
          mediaCoverageLinks: [],
          schedule: [{ event: "Allotment", date: "2026-10-21" }],
          subscription: {
            sharesOffered: 1000,
            sharesBid: 2000,
            timesSubscribed: 2,
            updatedAt: "2026-10-19T12:00:00Z",
          },
        },
      }],
      fetchGmp: async () => null,
      fetchSubscription: async () => null,
    } as unknown as IpoDataProvider);

    const ipo = await getIpoBySlug("example-ipo");

    expect(ipo?.research.about).toBe("Company overview from the provider.");
    expect(ipo?.research.strengths).toEqual(["Strong distribution"]);
    expect(ipo?.research.schedule).toHaveLength(1);
    expect(ipo?.research.subscription?.timesSubscribed).toBe(2);
  });

  it("reuses the homepage IPO response for the detail page", async () => {
    vi.mocked(prisma.ipo.findMany).mockResolvedValue([] as never[]);
    vi.mocked(prisma.ipo.findUnique).mockResolvedValue(null as never);
    const fetchIpos = vi.fn().mockResolvedValue([{
      slug: "cached-ipo",
      companyName: "Cached IPO",
      ipoType: "MAINBOARD",
      exchange: "NSE",
      openDate: "2026-10-15",
      closeDate: "2026-10-20",
      research: {
        minimumInvestment: 10000,
        listingGain: null,
        logoUrl: null,
        prospectusUrl: null,
        infoUrl: null,
        nseInfoUrl: null,
        bseInfoUrl: null,
        about: "Cached company overview.",
        strengths: [],
        risks: [],
        mediaCoverageLinks: [],
        schedule: [],
        subscription: null,
      },
    }]);
    vi.mocked(getIpoDataProvider).mockReturnValue({
      name: "http-api",
      fetchIpos,
      fetchGmp: async () => null,
      fetchSubscription: async () => null,
    } as unknown as IpoDataProvider);

    await getHomepageIpoGroups();
    const ipo = await getIpoBySlug("cached-ipo");

    expect(fetchIpos).toHaveBeenCalledTimes(1);
    expect(ipo?.research.about).toBe("Cached company overview.");
  });
});

describe("getGmpTrackerData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearIpoLiveCache();
  });

  it("includes every stored IPO and derives figures from the upper band and stored GMP", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-21T06:00:00Z"));
    const base = {
      exchange: "NSE",
      symbol: null,
      issueSize: null,
      faceValue: null,
      allotmentDate: null,
      researchData: null,
      subscriptions: [],
      updatedAt: new Date("2026-10-24T05:00:00Z"),
    };
    vi.mocked(prisma.ipo.findMany).mockResolvedValue([
      {
        ...base,
        slug: "band-open",
        companyName: "Band Open Ltd",
        ipoType: "MAINBOARD",
        priceBandLow: "275",
        priceBandHigh: "289",
        issuePrice: null,
        lotSize: 51,
        actualListingPrice: null,
        openDate: new Date("2026-10-20T00:00:00Z"),
        closeDate: new Date("2099-01-01T00:00:00Z"),
        listingDate: null,
        gmps: [{
          gmp: "-12",
          source: "ipoalerts",
          sourceUpdatedAt: null,
          recordedAt: new Date("2026-10-24T04:00:00Z"),
        }],
      },
      {
        ...base,
        slug: "listed-ipo",
        companyName: "Listed Ltd",
        ipoType: "SME",
        priceBandLow: "100",
        priceBandHigh: "100",
        issuePrice: "100",
        lotSize: 1200,
        actualListingPrice: "90",
        openDate: new Date("2026-09-01T00:00:00Z"),
        closeDate: new Date("2026-09-03T00:00:00Z"),
        listingDate: new Date("2026-09-08T00:00:00Z"),
        gmps: [],
      },
    ] as never[]);

    const data = await getGmpTrackerData();
    vi.useRealTimers();

    expect(data.rows.map((row) => row.slug)).toEqual(["band-open", "listed-ipo"]);
    const [open, listed] = data.rows;
    expect(open).toMatchObject({
      category: "open",
      priceBasis: "UPPER_PRICE_BAND",
      estimatedListingPrice: 277,
      estimatedGainPerLot: -612,
      // No source timestamp: shown as undated, never as fresh.
      gmpFreshness: "UNDATED",
    });
    expect(listed).toMatchObject({
      category: "listed",
      gmp: null,
      gmpFreshness: "UNAVAILABLE",
      estimatedListingPrice: null,
      actualGainPerShare: -10,
      actualGainPerLot: -12000,
      actualGainPercentage: -10,
    });
  });
});

describe("listed history window", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearIpoLiveCache();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-25T06:00:00Z"));
  });

  it("drops listed IPOs older than 45 days and stale closed non-IPOs from lists", async () => {
    const row = (slug: string, listingDate: string | null, openDate: string | null) => ({
      slug,
      companyName: slug,
      ipoType: "MAINBOARD",
      exchange: "NSE",
      symbol: null,
      issueSize: null,
      faceValue: null,
      allotmentDate: null,
      researchData: null,
      priceBandLow: "100",
      priceBandHigh: "110",
      issuePrice: null,
      lotSize: 10,
      actualListingPrice: null,
      openDate: openDate ? new Date(openDate) : null,
      closeDate: openDate ? new Date(openDate) : null,
      listingDate: listingDate ? new Date(listingDate) : null,
      gmps: [],
      subscriptions: [],
      updatedAt: new Date("2026-10-25T00:00:00Z"),
    });
    vi.mocked(prisma.ipo.findMany).mockResolvedValue([
      row("recent-listing", "2026-10-20T00:00:00Z", "2026-10-14T00:00:00Z"),
      row("day-45", "2026-09-10T12:00:00Z", "2026-09-04T00:00:00Z"),
      row("old-listing", "2026-08-20T00:00:00Z", "2026-08-14T00:00:00Z"),
      row("upcoming", null, "2026-11-02T00:00:00Z"),
      row("announced", null, null),
      { ...row("rights-issue", null, "2026-08-10T00:00:00Z"), closeDate: new Date("2026-08-20T00:00:00Z") },
      { ...row("just-closed", null, "2026-10-20T00:00:00Z"), closeDate: new Date("2026-10-23T00:00:00Z") },
    ] as never[]);

    const slugs = (await getGmpTrackerData()).rows.map((r) => r.slug).sort();
    vi.useRealTimers();

    // "rights-issue" closed weeks ago with no listing date: not an IPO awaiting listing.
    expect(slugs).toEqual(["announced", "day-45", "just-closed", "recent-listing", "upcoming"]);
  });
});
