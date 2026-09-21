import { describe, expect, it } from "vitest";
import {
  calculateEstimatedGainPerLot,
  calculateEstimatedGainPerShare,
  calculateEstimatedListingPrice,
  calculateGmpPercentage,
  calculateListingDifference,
} from "@/services/calculations";

// Spec section 5/39 worked example: priceBandHigh=420, gmp=50, lotSize=35.
describe("calculation engine", () => {
  it("calculates estimated listing price", () => {
    expect(calculateEstimatedListingPrice(420, 50)).toBe(470);
  });

  it("calculates estimated gain per share", () => {
    expect(calculateEstimatedGainPerShare(50)).toBe(50);
  });

  it("calculates estimated gain per lot", () => {
    expect(calculateEstimatedGainPerLot(50, 35)).toBe(1750);
  });

  it("calculates gmp percentage", () => {
    expect(calculateGmpPercentage(50, 420)).toBeCloseTo(11.9, 1);
  });

  it("returns null when gmp is missing", () => {
    expect(calculateEstimatedListingPrice(420, null)).toBeNull();
    expect(calculateEstimatedGainPerShare(null)).toBeNull();
    expect(calculateEstimatedGainPerLot(null, 35)).toBeNull();
    expect(calculateGmpPercentage(null, 420)).toBeNull();
  });

  it("returns null when lot size is missing or invalid", () => {
    expect(calculateEstimatedGainPerLot(50, null)).toBeNull();
    expect(calculateEstimatedGainPerLot(50, 0)).toBeNull();
    expect(calculateEstimatedGainPerLot(50, -10)).toBeNull();
  });

  it("returns null when price band is missing or invalid", () => {
    expect(calculateEstimatedListingPrice(null, 50)).toBeNull();
    expect(calculateGmpPercentage(50, 0)).toBeNull();
    expect(calculateGmpPercentage(50, -420)).toBeNull();
  });

  it("supports a negative gmp (discount to issue price)", () => {
    expect(calculateEstimatedListingPrice(420, -10)).toBe(410);
    expect(calculateEstimatedGainPerLot(-10, 35)).toBe(-350);
  });

  it("calculates the factual difference between actual and estimated listing price", () => {
    expect(calculateListingDifference(470, 465)).toBe(-5);
    expect(calculateListingDifference(470, 480)).toBe(10);
    expect(calculateListingDifference(null, 465)).toBeNull();
    expect(calculateListingDifference(470, null)).toBeNull();
  });
});
