import { describe, expect, it } from "vitest";
import { buildDaywiseSubscription, type SubscriptionSnapshot } from "@/services/subscription-history";

const snapshot = (at: string, total: number, source = "bse+nse"): SubscriptionSnapshot => ({
  qib: total * 2,
  nii: total,
  niiBig: null,
  niiSmall: null,
  retail: total / 2,
  employee: null,
  shareholders: null,
  total,
  source,
  sourceUpdatedAt: new Date(at),
});

describe("buildDaywiseSubscription", () => {
  // Jio-like issue: open Wed 21 Oct, close Fri 23 Oct 2026.
  const open = "2026-10-21";
  const close = "2026-10-23";

  it("keeps the last official snapshot of each IST bidding day", () => {
    const rows = buildDaywiseSubscription(
      [
        snapshot("2026-10-21T06:30:00Z", 1.2), // 12:00 IST day 1
        snapshot("2026-10-21T13:30:00Z", 3.04), // 19:00 IST day 1 (last)
        snapshot("2026-10-22T13:30:00Z", 5.4),
        snapshot("2026-10-23T11:30:00Z", 18),
        snapshot("2026-10-23T13:30:00Z", 22.19),
      ],
      open,
      close,
    );
    expect(rows.map((row) => [row.date, row.day, row.total])).toEqual([
      ["2026-10-21", 1, 3.04],
      ["2026-10-22", 2, 5.4],
      ["2026-10-23", 3, 22.19],
    ]);
  });

  it("ignores the IPO feed, figures outside the bidding window and undated rows", () => {
    const rows = buildDaywiseSubscription(
      [
        snapshot("2026-10-22T13:30:00Z", 12.45, "IPO data feed"),
        snapshot("2026-10-22T13:30:00Z", 9.9, "nse"),
        snapshot("2026-10-24T13:30:00Z", 22.19),
        { ...snapshot("2026-10-22T13:30:00Z", 1), sourceUpdatedAt: null },
        snapshot("2026-10-23T13:30:00Z", 22.19),
      ],
      open,
      close,
    );
    expect(rows.map((row) => row.date)).toEqual(["2026-10-23"]);
    expect(rows[0].day).toBe(3);
  });

  it("numbers days by weekdays across a weekend", () => {
    // Open Fri 30 Oct, close Tue 3 Nov 2026: Mon 2 Nov is Day 2.
    const rows = buildDaywiseSubscription([snapshot("2026-11-02T13:30:00Z", 2)], "2026-10-30", "2026-11-03");
    expect(rows[0]).toMatchObject({ date: "2026-11-02", day: 2 });
  });

  it("returns nothing without dates", () => {
    expect(buildDaywiseSubscription([snapshot("2026-10-21T13:30:00Z", 1)], null, close)).toEqual([]);
  });
});
