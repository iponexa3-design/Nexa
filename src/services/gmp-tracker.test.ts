import { describe, expect, it } from "vitest";
import {
  calculateActualListingFigures,
  classifyGmpFreshness,
  resolvePriceBasis,
} from "@/services/calculations";
import {
  compareTrackerRows,
  deriveIpoFigures,
  dropSupersededAnnouncements,
  listedWithin,
  summarizeListedRows,
  filterTrackerRows,
  type GmpTrackerRow,
  type IpoFigureInputs,
} from "@/services/gmp-tracker";

const NOW = new Date("2026-10-24T12:00:00Z");

function inputs(overrides: Partial<IpoFigureInputs> = {}): IpoFigureInputs {
  return {
    issuePrice: null,
    priceBandLow: 275,
    priceBandHigh: 289,
    lotSize: 51,
    gmp: 40,
    gmpSourceUpdatedAt: "2026-10-24T06:00:00Z",
    actualListingPrice: null,
    sourceMinimumInvestment: null,
    ...overrides,
  };
}

describe("resolvePriceBasis", () => {
  it("uses the upper band for a price band and discloses it", () => {
    expect(resolvePriceBasis({ priceBandLow: 275, priceBandHigh: 289 })).toEqual({
      price: 289,
      kind: "UPPER_PRICE_BAND",
    });
  });

  it("treats a single fixed price as the issue price", () => {
    expect(resolvePriceBasis({ priceBandLow: 105, priceBandHigh: 105 })).toEqual({
      price: 105,
      kind: "ISSUE_PRICE",
    });
  });

  it("prefers a final issue price over the band", () => {
    expect(resolvePriceBasis({ issuePrice: 280, priceBandLow: 275, priceBandHigh: 289 })).toEqual({
      price: 280,
      kind: "ISSUE_PRICE",
    });
  });

  it("returns null when no price is known", () => {
    expect(resolvePriceBasis({})).toBeNull();
  });
});

describe("deriveIpoFigures - GMP estimates", () => {
  it("positive GMP on a price band uses the upper band", () => {
    const figures = deriveIpoFigures(inputs({ gmp: 40, lotSize: 51 }), NOW);
    expect(figures.basisPrice).toBe(289);
    expect(figures.priceBasis).toBe("UPPER_PRICE_BAND");
    expect(figures.estimatedListingPrice).toBe(329);
    expect(figures.estimatedGainPerShare).toBe(40);
    expect(figures.estimatedGainPerLot).toBe(2040);
    expect(figures.gmpPercentage).toBeCloseTo(13.84, 2);
  });

  it("zero GMP gives zero gain, not 'unavailable'", () => {
    const figures = deriveIpoFigures(inputs({ gmp: 0 }), NOW);
    expect(figures.estimatedListingPrice).toBe(289);
    expect(figures.estimatedGainPerShare).toBe(0);
    expect(figures.estimatedGainPerLot).toBe(0);
    expect(figures.gmpPercentage).toBe(0);
    expect(figures.gmpFreshness).toBe("CURRENT");
  });

  it("negative GMP produces a negative estimate", () => {
    const figures = deriveIpoFigures(inputs({ gmp: -12, lotSize: 51 }), NOW);
    expect(figures.estimatedListingPrice).toBe(277);
    expect(figures.estimatedGainPerShare).toBe(-12);
    expect(figures.estimatedGainPerLot).toBe(-612);
    expect(figures.gmpPercentage).toBeCloseTo(-4.15, 2);
  });

  it("missing GMP is never treated as zero", () => {
    const figures = deriveIpoFigures(inputs({ gmp: null, gmpSourceUpdatedAt: null }), NOW);
    expect(figures.gmpFreshness).toBe("UNAVAILABLE");
    expect(figures.estimatedListingPrice).toBeNull();
    expect(figures.estimatedGainPerShare).toBeNull();
    expect(figures.estimatedGainPerLot).toBeNull();
    expect(figures.gmpPercentage).toBeNull();
  });

  it("scales per-lot figures with different lot sizes", () => {
    // SME: fixed price 58, lot of 2000 shares.
    const sme = deriveIpoFigures(
      inputs({ priceBandLow: 58, priceBandHigh: 58, lotSize: 2000, gmp: 4 }),
      NOW,
    );
    expect(sme.priceBasis).toBe("ISSUE_PRICE");
    expect(sme.estimatedGainPerLot).toBe(8000);
    expect(sme.minimumInvestment).toBe(116000);

    const mainboard = deriveIpoFigures(inputs({ lotSize: 14, gmp: 40 }), NOW);
    expect(mainboard.estimatedGainPerLot).toBe(560);
  });

  it("leaves per-lot figures empty when lot size is unknown", () => {
    const figures = deriveIpoFigures(inputs({ lotSize: null }), NOW);
    expect(figures.estimatedGainPerShare).toBe(40);
    expect(figures.estimatedGainPerLot).toBeNull();
    expect(figures.minimumInvestment).toBeNull();
  });

  it("prefers the source's minimum application amount", () => {
    const figures = deriveIpoFigures(inputs({ sourceMinimumInvestment: 111600 }), NOW);
    expect(figures.minimumInvestment).toBe(111600);
  });

  it("does not estimate without any price", () => {
    const figures = deriveIpoFigures(inputs({ priceBandLow: null, priceBandHigh: null }), NOW);
    expect(figures.estimatedListingPrice).toBeNull();
    expect(figures.gmpPercentage).toBeNull();
    // Gain per share is the GMP itself and does not depend on price.
    expect(figures.estimatedGainPerShare).toBe(40);
  });
});

describe("deriveIpoFigures - actual listing", () => {
  it("computes actual listing gains separately from the GMP estimate", () => {
    const figures = deriveIpoFigures(
      inputs({ issuePrice: 289, gmp: 40, lotSize: 51, actualListingPrice: 310 }),
      NOW,
    );
    expect(figures.estimatedListingPrice).toBe(329);
    expect(figures.actualGainPerShare).toBe(21);
    expect(figures.actualGainPerLot).toBe(1071);
    expect(figures.actualGainPercentage).toBeCloseTo(7.27, 2);
  });

  it("reports listing losses as negative", () => {
    expect(calculateActualListingFigures(250, 289, 51)).toEqual({
      actualGainPerShare: -39,
      actualGainPerLot: -1989,
      actualGainPercentage: expect.closeTo(-13.49, 2),
    });
  });

  it("does not invent actual figures when the listing price is unknown", () => {
    const figures = deriveIpoFigures(inputs({ actualListingPrice: null }), NOW);
    expect(figures.actualGainPerShare).toBeNull();
    expect(figures.actualGainPerLot).toBeNull();
    expect(figures.actualGainPercentage).toBeNull();
  });
});

describe("classifyGmpFreshness", () => {
  it("is CURRENT within 48 hours of the source timestamp", () => {
    expect(classifyGmpFreshness(10, "2026-10-23T00:00:00Z", NOW)).toBe("CURRENT");
  });

  it("is STALE beyond 48 hours", () => {
    expect(classifyGmpFreshness(10, "2026-10-20T00:00:00Z", NOW)).toBe("STALE");
  });

  it("is UNDATED when the source gives no timestamp", () => {
    expect(classifyGmpFreshness(10, null, NOW)).toBe("UNDATED");
    expect(classifyGmpFreshness(10, "not-a-date", NOW)).toBe("UNDATED");
  });

  it("is UNAVAILABLE without a GMP value", () => {
    expect(classifyGmpFreshness(null, "2026-10-24T00:00:00Z", NOW)).toBe("UNAVAILABLE");
  });
});

function row(overrides: Partial<GmpTrackerRow>): GmpTrackerRow {
  return {
    slug: "x",
    companyName: "X Ltd",
    ipoType: "MAINBOARD",
    exchange: "NSE",
    status: "OPEN",
    category: "open",
    priceBandLow: null,
    priceBandHigh: null,
    issuePrice: null,
    lotSize: null,
    openDate: null,
    closeDate: null,
    listingDate: null,
    actualListingPrice: null,
    gmp: null,
    gmpSource: null,
    gmpSourceUpdatedAt: null,
    gmpRecordedAt: null,
    subscriptionTimes: null,
    ...deriveIpoFigures(inputs({ gmp: null }), NOW),
    ...overrides,
  };
}

describe("tracker filtering and ordering", () => {
  const rows = [
    row({ slug: "a", companyName: "Alpha Tech", category: "open", ipoType: "MAINBOARD", closeDate: "2026-10-27" }),
    row({ slug: "b", companyName: "Beta Foods", category: "open", ipoType: "SME", closeDate: "2026-10-25" }),
    row({ slug: "c", companyName: "Gamma Steel", category: "upcoming", status: "UPCOMING", openDate: "2026-11-02" }),
    row({ slug: "d", companyName: "Delta Power", category: "listed", status: "LISTED", listingDate: "2026-10-10" }),
    row({ slug: "e", companyName: "Epsilon Labs", category: "listed", status: "LISTED", listingDate: "2026-10-20" }),
    row({ slug: "f", companyName: "Zeta Agro", category: "closed", status: "CLOSED", listingDate: "2026-10-28" }),
  ];

  it("filters by category, IPO type and case-insensitive search", () => {
    expect(filterTrackerRows(rows, { category: "open", ipoType: "all", query: "" }).map((r) => r.slug)).toEqual(["a", "b"]);
    expect(filterTrackerRows(rows, { category: "all", ipoType: "SME", query: "" }).map((r) => r.slug)).toEqual(["b"]);
    expect(filterTrackerRows(rows, { category: "all", ipoType: "all", query: "  delta " }).map((r) => r.slug)).toEqual(["d"]);
  });

  it("orders open (closing soonest), awaiting listing, upcoming, then newest listed", () => {
    expect([...rows].sort(compareTrackerRows).map((r) => r.slug)).toEqual(["b", "a", "f", "c", "e", "d"]);
  });
});

describe("dropSupersededAnnouncements", () => {
  it("hides an undated announcement once the dated IPO with the same name exists", () => {
    const items = [
      { companyName: "Paras Healthcare", openDate: null },
      { companyName: "Paras Healthcare Limited", openDate: "2026-10-21" },
      { companyName: "Zepto", openDate: null },
      { companyName: "Zetwerk Manufacturing Businesses Ltd.", openDate: "2026-10-15" },
    ];
    expect(dropSupersededAnnouncements(items).map((item) => item.companyName)).toEqual([
      "Paras Healthcare Limited",
      "Zepto",
      "Zetwerk Manufacturing Businesses Ltd.",
    ]);
  });
});

describe("Listed-tab summary", () => {
  const rows = [
    { slug: "tonbo", companyName: "Tonbo", listingDate: "2026-10-23T00:00:00.000Z", actualListingPrice: 1160, actualGainPercentage: 65.71 },
    { slug: "tna", companyName: "TNA Solutions", listingDate: "2026-10-09T00:00:00.000Z", actualListingPrice: 56, actualGainPercentage: -20 },
    { slug: "flat", companyName: "Bonfiglioli", listingDate: "2026-10-23T00:00:00.000Z", actualListingPrice: 586, actualGainPercentage: 0 },
    { slug: "pending", companyName: "No Price Yet", listingDate: "2026-10-24T00:00:00.000Z", actualListingPrice: null, actualGainPercentage: null },
  ];

  it("summarizes only IPOs with a reported listing price", () => {
    expect(summarizeListedRows(rows)).toEqual({
      total: 4,
      withResult: 3,
      higher: 1,
      lower: 1,
      unchanged: 1,
      averageGainPercentage: expect.closeTo((65.71 - 20 + 0) / 3, 5),
      best: { slug: "tonbo", companyName: "Tonbo", gainPercentage: 65.71 },
      worst: { slug: "tna", companyName: "TNA Solutions", gainPercentage: -20 },
      bestTies: 0,
      worstTies: 0,
    });
  });

  it("counts ties at the best and worst gain and names them stably", () => {
    const tied = [
      // Real gains computed from prices, so they differ in the last floating-point bits.
      { slug: "vans", companyName: "Vans", listingDate: null, actualListingPrice: 224.2, actualGainPercentage: ((224.2 - 118) / 118) * 100 },
      { slug: "robokidz", companyName: "Robokidz", listingDate: null, actualListingPrice: 201.4, actualGainPercentage: ((201.4 - 106) / 106) * 100 },
      { slug: "roopa", companyName: "Roopa Screen", listingDate: null, actualListingPrice: 121.6, actualGainPercentage: ((121.6 - 64) / 64) * 100 },
      { slug: "pind", companyName: "Pind", listingDate: null, actualListingPrice: 79.2, actualGainPercentage: -20 },
      { slug: "tna", companyName: "TNA", listingDate: null, actualListingPrice: 56, actualGainPercentage: -20 },
    ];
    const summary = summarizeListedRows(tied);
    expect(summary.best?.slug).toBe("robokidz");
    expect(summary.bestTies).toBe(2);
    expect(summary.worst?.slug).toBe("tna");
    expect(summary.worstTies).toBe(1);
  });

  it("has no best/worst or average without results", () => {
    expect(summarizeListedRows([rows[3]!])).toMatchObject({ withResult: 0, averageGainPercentage: null, best: null, worst: null });
  });

  it("filters by listing window and ignores future listing dates", () => {
    const now = new Date("2026-10-25T00:00:00Z");
    expect(listedWithin({ listingDate: "2026-10-09T00:00:00.000Z" }, now, 30)).toBe(true);
    expect(listedWithin({ listingDate: "2026-09-01T00:00:00.000Z" }, now, 30)).toBe(false);
    expect(listedWithin({ listingDate: "2026-09-01T00:00:00.000Z" }, now, 90)).toBe(true);
    expect(listedWithin({ listingDate: "2026-10-28T00:00:00.000Z" }, now, 30)).toBe(false);
    expect(listedWithin({ listingDate: null }, now, 30)).toBe(false);
  });
});
