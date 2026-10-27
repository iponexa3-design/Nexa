import { describe, expect, it } from "vitest";
import { buildWeekCalendar, summarizeListings } from "@/services/homepage-insights";

// 25 Oct 2026, 00:30 IST.
const NOW = new Date("2026-10-24T19:00:00Z");
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("buildWeekCalendar", () => {
  it("places opens, closes and listings on IST days, starting today", () => {
    const calendar = buildWeekCalendar(
      [
        { slug: "jpl", companyName: "Jio Platforms Limited", openDate: day("2026-10-21"), closeDate: day("2026-10-23"), listingDate: day("2026-10-28") },
        { slug: "edel", companyName: "Eaaa India", openDate: day("2026-10-26"), closeDate: day("2026-10-28"), listingDate: day("2026-11-02") },
        { slug: "far", companyName: "Far Future", openDate: day("2026-12-01"), closeDate: null, listingDate: null },
      ],
      NOW,
    );

    expect(calendar).toHaveLength(7);
    expect(calendar[0]).toMatchObject({ dateKey: "2026-10-25", isToday: true, events: [] });
    expect(calendar.find((d) => d.dateKey === "2026-10-26")?.events).toEqual([
      { type: "opens", slug: "edel", companyName: "Eaaa India" },
    ]);
    // Listings sort before closes on the same day.
    expect(calendar.find((d) => d.dateKey === "2026-10-28")?.events.map((e) => e.type)).toEqual(["lists", "closes"]);
    expect(calendar.flatMap((d) => d.events).some((e) => e.slug === "far")).toBe(false);
  });
});

describe("summarizeListings", () => {
  it("counts only real listing results within the window, most recent first", () => {
    const scorecard = summarizeListings(
      [
        { slug: "tonbo", companyName: "Tonbo", listingDate: day("2026-10-23"), actualListingPrice: 1160, actualGainPercentage: 65.71 },
        { slug: "vnl", companyName: "Vishal Nirmiti", listingDate: day("2026-10-08"), actualListingPrice: 215, actualGainPercentage: -2.27 },
        { slug: "flat", companyName: "Bonfiglioli", listingDate: day("2026-10-23"), actualListingPrice: 586, actualGainPercentage: 0 },
        { slug: "noprice", companyName: "No Price", listingDate: day("2026-10-20"), actualListingPrice: null, actualGainPercentage: null },
        { slug: "old", companyName: "Old", listingDate: day("2026-08-01"), actualListingPrice: 100, actualGainPercentage: 10 },
        { slug: "future", companyName: "Jio", listingDate: day("2026-10-28"), actualListingPrice: null, actualGainPercentage: null },
      ],
      NOW,
    );

    expect(scorecard.count).toBe(3);
    expect(scorecard.positive).toBe(1);
    expect(scorecard.negative).toBe(1);
    expect(scorecard.averageGainPercentage).toBeCloseTo((65.71 - 2.27 + 0) / 3, 5);
    expect(scorecard.results.map((r) => r.slug)).toEqual(["tonbo", "flat", "vnl"]);
  });

  it("has no average when nothing listed with a price", () => {
    expect(summarizeListings([], NOW)).toMatchObject({ count: 0, averageGainPercentage: null, results: [] });
  });
});
