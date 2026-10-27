import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/ipo-refresh-service", () => ({ refreshIpoData: vi.fn() }));
vi.mock("@/services/subscription-refresh-service", () => ({ refreshOpenSubscriptions: vi.fn() }));

import { isDailyRunDue, isSubscriptionRunDue } from "@/jobs/refresh-scheduler";

describe("isDailyRunDue", () => {
  it("runs once per IST day, only after the configured time", () => {
    // 19:30 IST on 25 Oct: before 20:00.
    expect(isDailyRunDue(new Date("2026-10-25T14:00:00Z"), "20:00", "2026-10-24")).toBe(false);
    // 20:05 IST, not yet run today.
    expect(isDailyRunDue(new Date("2026-10-25T14:35:00Z"), "20:00", "2026-10-24")).toBe(true);
    // Already ran today: a restart later that night must not run again.
    expect(isDailyRunDue(new Date("2026-10-25T17:00:00Z"), "20:00", "2026-10-25")).toBe(false);
    // Never run before.
    expect(isDailyRunDue(new Date("2026-10-25T15:00:00Z"), "20:00", null)).toBe(true);
  });
});

describe("isSubscriptionRunDue", () => {
  // Tue 27 Oct 2026: 13:00 IST.
  const tuesdayAfternoon = new Date("2026-10-27T07:30:00Z");

  it("runs on weekdays during bidding, at most every 30 minutes", () => {
    expect(isSubscriptionRunDue(tuesdayAfternoon, null)).toBe(true);
    expect(isSubscriptionRunDue(tuesdayAfternoon, tuesdayAfternoon.getTime() - 10 * 60_000)).toBe(false);
    expect(isSubscriptionRunDue(tuesdayAfternoon, tuesdayAfternoon.getTime() - 30 * 60_000)).toBe(true);
  });

  it("stays idle outside 10:00-19:30 IST and at weekends", () => {
    expect(isSubscriptionRunDue(new Date("2026-10-27T04:00:00Z"), null)).toBe(false); // 09:30 IST
    expect(isSubscriptionRunDue(new Date("2026-10-27T14:30:00Z"), null)).toBe(false); // 20:00 IST
    expect(isSubscriptionRunDue(new Date("2026-10-31T07:30:00Z"), null)).toBe(false); // Saturday
  });
});
