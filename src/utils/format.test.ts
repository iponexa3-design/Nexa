import { describe, expect, it } from "vitest";
import { formatCurrency, formatSignedCurrency } from "@/utils/format";

describe("currency formatting", () => {
  it("shows whole rupees without decimals and paise always with two digits", () => {
    expect(formatCurrency(4035)).toBe("₹4,035");
    expect(formatCurrency(855.9)).toBe("₹855.90");
    expect(formatCurrency(40.35)).toBe("₹40.35");
    expect(formatCurrency(123456.5)).toBe("₹1,23,456.50");
    expect(formatCurrency(1769.999)).toBe("₹1,770");
  });

  it("adds the sign for gains and losses", () => {
    expect(formatSignedCurrency(855.9)).toBe("+₹855.90");
    expect(formatSignedCurrency(-12000)).toBe("-₹12,000");
    expect(formatSignedCurrency(0)).toBe("₹0");
  });
});
