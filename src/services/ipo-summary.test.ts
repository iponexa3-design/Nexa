import { describe, expect, it } from "vitest";
import {
  buildIpoMetaDescription,
  buildIpoSummary,
  isIpoIndexable,
  isStaleClosedIpo,
  type IpoSummaryInput,
} from "@/services/ipo-summary";

// 30 Oct 2026, 12:00 IST.
const NOW = new Date("2026-10-30T06:30:00Z");

const listed: IpoSummaryInput = {
  companyName: "Jio Platforms Limited",
  ipoType: "MAINBOARD",
  exchange: "NSE",
  status: "LISTED",
  priceBandLow: 1065,
  priceBandHigh: 1119,
  issueSize: 30188,
  lotSize: 12,
  minimumInvestment: 13428,
  openDate: "2026-10-21",
  closeDate: "2026-10-23",
  listingDate: "2026-10-28",
  allotmentDate: "2026-10-26",
  subscriptionTimes: 22.19,
  subscriptionUpdatedAt: new Date("2026-10-23T13:30:00Z"),
  subscriptionCategories: { qib: 70.55, nii: 14, retail: 2.72 },
  basisPrice: 1119,
  priceBasis: "ISSUE_PRICE",
  actualListingPrice: 1358,
  actualGainPercentage: 21.36,
  actualGainPerLot: 2868,
  gmp: 247,
  gmpPercentage: 22.07,
  gmpSourceUpdatedAt: "2026-10-27",
  gmpFreshness: "STALE",
};

describe("buildIpoSummary", () => {
  it("states the facts of a listed IPO, including the real listing result and no GMP", () => {
    const text = buildIpoSummary(listed, NOW).join(" ");
    expect(text).toContain("Jio Platforms Limited is a mainboard IPO (NSE) with a price band of ₹1,065 to ₹1,119 per share, raising about ₹30,188 crore.");
    expect(text).toContain("One lot is 12 shares, so the minimum application is about ₹13,428.");
    expect(text).toContain("The shares listed on 28 Oct 2026.");
    expect(text).toContain("It was subscribed 22.19x overall (QIB 70.55x, NII 14.00x, retail 2.72x).");
    expect(text).toContain("opened at ₹1,358, 21.36% above the issue price of ₹1,119.");
    expect(text).not.toContain("grey market");
  });

  it("leaves out sentences whose data is missing instead of guessing", () => {
    const announced: IpoSummaryInput = {
      ...listed,
      companyName: "Example Announced Limited",
      status: "UPCOMING",
      priceBandLow: null,
      priceBandHigh: null,
      issueSize: null,
      lotSize: null,
      minimumInvestment: null,
      openDate: null,
      closeDate: null,
      listingDate: null,
      allotmentDate: null,
      subscriptionTimes: null,
      subscriptionCategories: null,
      basisPrice: null,
      priceBasis: null,
      actualListingPrice: null,
      actualGainPercentage: null,
      actualGainPerLot: null,
      gmp: null,
      gmpPercentage: null,
      gmpSourceUpdatedAt: null,
    };
    expect(buildIpoSummary(announced, NOW)).toEqual([
      "Example Announced Limited is a mainboard IPO (NSE). Its price band has not been published yet.",
      "The bidding dates have not been announced yet.",
    ]);
  });

  it("describes an open IPO's GMP as unofficial and flags an old quote", () => {
    const open: IpoSummaryInput = {
      ...listed,
      status: "OPEN",
      listingDate: "2026-11-03",
      allotmentDate: "2026-10-31",
      closeDate: "2026-10-30",
      actualListingPrice: null,
      actualGainPercentage: null,
      priceBasis: "UPPER_PRICE_BAND",
      gmp: 40,
      gmpPercentage: 3.57,
    };
    const text = buildIpoSummary(open, NOW).join(" ");
    expect(text).toContain("Bidding is open until 30 Oct 2026; allotment is expected on 31 Oct 2026 and listing on 3 Nov 2026.");
    expect(text).toContain("at the upper end of the band");
    expect(text).toContain("The latest grey market premium, quoted on 27 Oct 2026, is ₹40 (+3.57%). GMP is unofficial");
    expect(text).toContain("more than two days old");
  });

  it("warns when a closed IPO has had no listing date for weeks", () => {
    const stale = { ...listed, status: "CLOSED" as const, closeDate: "2026-09-17", listingDate: null };
    expect(buildIpoSummary(stale, NOW).at(-1)).toContain("No listing date had been reported 43 days after bidding closed.");
  });
});

describe("isIpoIndexable", () => {
  const overview = "Jio Platforms runs India's largest mobile network and a range of digital services, from broadband and payments to streaming and cloud.";
  const page = { ...listed, companyOverview: overview };

  it("keeps announced IPOs without price or dates, and stale closed records, out of search", () => {
    expect(isIpoIndexable(page, NOW)).toBe(true);
    expect(isIpoIndexable({ ...page, priceBandHigh: null, openDate: null }, NOW)).toBe(false);
    expect(isIpoIndexable({ ...page, status: "CLOSED", closeDate: "2026-09-17", listingDate: null }, NOW)).toBe(false);
    // Closed a few days ago and awaiting listing: still a normal page.
    expect(isIpoIndexable({ ...page, status: "CLOSED", closeDate: "2026-10-27", listingDate: null }, NOW)).toBe(true);
    expect(isStaleClosedIpo({ status: "CLOSED", closeDate: "2026-10-20", listingDate: null }, NOW)).toBe(false);
  });

  it("indexes a listed IPO only with two of subscription, GMP and listing result", () => {
    const bare = { ...page, subscriptionTimes: null, gmp: null, actualListingPrice: null };
    // The feed's overview does not count for a listed IPO.
    expect(isIpoIndexable(bare, NOW)).toBe(false);
    expect(isIpoIndexable({ ...bare, actualListingPrice: 1358 }, NOW)).toBe(false);
    expect(isIpoIndexable({ ...bare, actualListingPrice: 1358, subscriptionTimes: 3.2 }, NOW)).toBe(true);
    expect(isIpoIndexable({ ...bare, actualListingPrice: 1358, gmp: 40 }, NOW)).toBe(true);
  });

  it("indexes a current IPO with an overview or a market figure", () => {
    const upcoming = {
      ...page,
      status: "UPCOMING" as const,
      openDate: "2026-11-05",
      closeDate: "2026-11-07",
      listingDate: null,
      companyOverview: null,
      subscriptionTimes: null,
      gmp: null,
      actualListingPrice: null,
    };
    expect(isIpoIndexable(upcoming, NOW)).toBe(false);
    // A one-line overview is not enough.
    expect(isIpoIndexable({ ...upcoming, companyOverview: "A telecom company." }, NOW)).toBe(false);
    expect(isIpoIndexable({ ...upcoming, companyOverview: overview }, NOW)).toBe(true);
    expect(isIpoIndexable({ ...upcoming, gmp: 12 }, NOW)).toBe(true);
  });
});

describe("buildIpoMetaDescription", () => {
  it("is specific to the IPO and at most 160 characters", () => {
    const text = buildIpoMetaDescription(listed);
    expect(text).toBe(
      "Jio Platforms Limited IPO: price band ₹1,065-₹1,119, lot 12 shares, subscribed 22.19x, listed at ₹1,358 (+21.36%).",
    );
    expect(text.length).toBeLessThanOrEqual(160);
    const smeOpen = buildIpoMetaDescription({ ...listed, ipoType: "SME", status: "OPEN", companyName: "Small Co Limited", gmp: 12 });
    expect(smeOpen.startsWith("Small Co Limited SME IPO:")).toBe(true);
    expect(smeOpen).toContain("GMP ₹12");
  });
});
