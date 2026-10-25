import { afterEach, describe, expect, it, vi } from "vitest";
import { computeIpoStatus } from "@/utils/ipo-status";

describe("computeIpoStatus", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps an IPO open through its closing date in India", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-16T10:00:00.000Z"));

    expect(
      computeIpoStatus({ openDate: "2026-10-15", closeDate: "2026-10-16" }),
    ).toBe("OPEN");
  });

  it("marks an IPO closed after its closing date in India", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-17T00:00:00.000Z"));

    expect(
      computeIpoStatus({ openDate: "2026-10-15", closeDate: "2026-10-16" }),
    ).toBe("CLOSED");
  });
});