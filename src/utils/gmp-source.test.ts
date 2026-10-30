import { describe, expect, it } from "vitest";
import { gmpSourceLabel, manualGmpSource } from "@/utils/gmp-source";

describe("gmpSourceLabel", () => {
  it("names each GMP source in plain words", () => {
    expect(gmpSourceLabel("ipoalerts")).toBe("IPO Alert");
    expect(gmpSourceLabel(manualGmpSource(" InvestorGain "))).toBe("Entered manually from InvestorGain");
    expect(gmpSourceLabel("manual:")).toBe("Entered manually");
    expect(gmpSourceLabel(null)).toBe("Not available");
  });
});
