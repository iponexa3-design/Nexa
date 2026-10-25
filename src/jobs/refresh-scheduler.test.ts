import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/ipo-refresh-service", () => ({ refreshIpoData: vi.fn() }));

import { isDailyRunDue } from "@/jobs/refresh-scheduler";

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
