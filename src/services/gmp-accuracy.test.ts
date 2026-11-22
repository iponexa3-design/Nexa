import { describe, expect, it } from "vitest";
import {
  buildGmpAccuracyRow,
  finalGmpBeforeListing,
  listingGainBySubscription,
  summarizeGmpAccuracy,
  type ListedIpoOutcome,
} from "@/services/gmp-accuracy";

const ist = (text: string) => new Date(`${text}+05:30`);

const ipo = (overrides: Partial<ListedIpoOutcome> = {}): ListedIpoOutcome => ({
  slug: "example",
  companyName: "Example Limited",
  ipoType: "MAINBOARD",
  listingDate: new Date("2026-11-06T00:00:00Z"),
  basisPrice: 200,
  actualListingPrice: 230,
  subscriptionTimes: 40,
  gmpQuotes: [
    { gmp: 20, quotedAt: ist("2026-11-03T18:00:00") },
    { gmp: 40, quotedAt: ist("2026-11-05T21:00:00") },
    // Quoted on listing day: not a forecast any more, ignored.
    { gmp: 32, quotedAt: ist("2026-11-06T09:00:00") },
  ],
  ...overrides,
});

describe("finalGmpBeforeListing", () => {
  it("takes the latest quote dated before listing day", () => {
    expect(finalGmpBeforeListing(ipo().gmpQuotes, "2026-11-06")?.gmp).toBe(40);
  });

  it("returns null without a listing date or an earlier quote", () => {
    expect(finalGmpBeforeListing(ipo().gmpQuotes, null)).toBeNull();
    expect(finalGmpBeforeListing(ipo().gmpQuotes, "2026-11-01")).toBeNull();
  });
});

describe("buildGmpAccuracyRow", () => {
  it("compares the implied and actual listing gains on the same reference price", () => {
    const row = buildGmpAccuracyRow(ipo())!;
    expect(row.finalGmp).toBe(40);
    expect(row.impliedGainPct).toBe(20);
    expect(row.actualGainPct).toBe(15);
    expect(row.differencePts).toBe(-5);
    expect(row.directionMatched).toBe(true);
  });

  it("flags a positive GMP that listed below the reference price", () => {
    expect(buildGmpAccuracyRow(ipo({ actualListingPrice: 190 }))!.directionMatched).toBe(false);
  });

  it("treats a zero GMP and a flat listing as a match", () => {
    const row = buildGmpAccuracyRow(ipo({ actualListingPrice: 200, gmpQuotes: [{ gmp: 0, quotedAt: ist("2026-11-05T12:00:00") }] }))!;
    expect(row.directionMatched).toBe(true);
  });

  it("skips IPOs without a listing price, a reference price or a GMP quote", () => {
    expect(buildGmpAccuracyRow(ipo({ actualListingPrice: null }))).toBeNull();
    expect(buildGmpAccuracyRow(ipo({ basisPrice: null }))).toBeNull();
    expect(buildGmpAccuracyRow(ipo({ gmpQuotes: [] }))).toBeNull();
  });
});

describe("summarizeGmpAccuracy", () => {
  it("summarizes the differences", () => {
    const rows = [
      buildGmpAccuracyRow(ipo())!, // -5
      buildGmpAccuracyRow(ipo({ slug: "b", actualListingPrice: 270 }))!, // +15
      buildGmpAccuracyRow(ipo({ slug: "c", actualListingPrice: 190 }))!, // -25, wrong way
    ];
    expect(summarizeGmpAccuracy(rows)).toEqual({
      count: 3,
      medianAbsDifferencePts: 15,
      averageDifferencePts: -5,
      closePct: 33.3,
      directionPct: 66.7,
      belowGmpPct: 66.7,
    });
  });

  it("returns empty figures without data", () => {
    expect(summarizeGmpAccuracy([]).medianAbsDifferencePts).toBeNull();
  });
});

describe("listingGainBySubscription", () => {
  it("groups listing gains by subscription band", () => {
    const bands = listingGainBySubscription([
      ipo({ subscriptionTimes: 2, actualListingPrice: 190 }),
      ipo({ subscriptionTimes: 5, actualListingPrice: 210 }),
      ipo({ subscriptionTimes: 200, actualListingPrice: 300 }),
      ipo({ subscriptionTimes: null }),
    ]);
    expect(bands[0]).toMatchObject({ label: "Under 10x", count: 2, medianGainPct: 0, positivePct: 50 });
    expect(bands[1].count).toBe(0);
    expect(bands[3]).toMatchObject({ count: 1, medianGainPct: 50, positivePct: 100 });
  });
});
