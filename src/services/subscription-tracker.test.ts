import { describe, expect, it } from "vitest";
import { buildSubscriptionRows, rowsForTab, type SubscriptionSourceItem } from "@/services/subscription-tracker";

const item = (slug: string, status: SubscriptionSourceItem["status"], dates: { close?: string; listing?: string }): SubscriptionSourceItem => ({
  slug,
  companyName: slug.toUpperCase(),
  ipoType: "MAINBOARD",
  exchange: "NSE",
  status,
  openDate: new Date("2026-10-20"),
  closeDate: dates.close ? new Date(dates.close) : null,
  listingDate: dates.listing ? new Date(dates.listing) : null,
  subscriptionTimes: 2,
  subscriptionSource: "bse+nse",
  subscriptionUpdatedAt: new Date("2026-10-30T05:00:00Z"),
  subscriptionBreakdown: null,
});

describe("buildSubscriptionRows", () => {
  const rows = buildSubscriptionRows([
    item("listed-old", "LISTED", { close: "2026-10-10", listing: "2026-10-15" }),
    item("upcoming", "UPCOMING", { close: "2026-11-10" }),
    item("open-late", "OPEN", { close: "2026-11-03" }),
    item("closed", "CLOSED", { close: "2026-10-29" }),
    item("listed-new", "LISTED", { close: "2026-10-23", listing: "2026-10-28" }),
    item("open-soon", "OPEN", { close: "2026-10-30" }),
  ]);

  it("leaves out IPOs that have not opened, and orders open, awaiting listing, then listed", () => {
    expect(rows.map((row) => row.slug)).toEqual(["open-soon", "open-late", "closed", "listed-new", "listed-old"]);
  });

  it("filters by tab", () => {
    expect(rowsForTab(rows, "open").map((row) => row.slug)).toEqual(["open-soon", "open-late"]);
    expect(rowsForTab(rows, "closed").map((row) => row.slug)).toEqual(["closed"]);
    expect(rowsForTab(rows, "listed")).toHaveLength(2);
    expect(rowsForTab(rows, "all")).toHaveLength(5);
  });

  it("keeps the figures as plain values for the browser", () => {
    expect(rows[0]).toMatchObject({ total: 2, source: "bse+nse", updatedAt: "2026-10-30T05:00:00.000Z" });
  });
});
