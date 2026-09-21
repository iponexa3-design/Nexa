/**
 * Pure calculation engine (spec section 14). Never compute these values
 * in UI components - always call these from the backend/service layer,
 * so results are consistent and testable.
 *
 * All functions return null when inputs are missing/invalid, per spec
 * section 27: if GMP is unavailable, never show 0 or a fabricated result.
 */

export function calculateGmpPercentage(
  gmp: number | null | undefined,
  priceBandHigh: number | null | undefined,
): number | null {
  if (!isFiniteNumber(gmp) || !isPositive(priceBandHigh)) return null;
  return (gmp / priceBandHigh) * 100;
}

export function calculateEstimatedListingPrice(
  priceBandHigh: number | null | undefined,
  gmp: number | null | undefined,
): number | null {
  if (!isPositive(priceBandHigh) || !isFiniteNumber(gmp)) return null;
  return priceBandHigh + gmp;
}

export function calculateEstimatedGainPerShare(
  gmp: number | null | undefined,
): number | null {
  if (!isFiniteNumber(gmp)) return null;
  return gmp;
}

export function calculateEstimatedGainPerLot(
  gmp: number | null | undefined,
  lotSize: number | null | undefined,
): number | null {
  if (!isFiniteNumber(gmp) || !isPositive(lotSize)) return null;
  return gmp * lotSize;
}

export interface ListingCalculations {
  gmpPercentage: number | null;
  estimatedListingPrice: number | null;
  estimatedGainPerShare: number | null;
  estimatedGainPerLot: number | null;
}

export function calculateListingFigures(
  gmp: number | null | undefined,
  priceBandHigh: number | null | undefined,
  lotSize: number | null | undefined,
): ListingCalculations {
  return {
    gmpPercentage: calculateGmpPercentage(gmp, priceBandHigh),
    estimatedListingPrice: calculateEstimatedListingPrice(priceBandHigh, gmp),
    estimatedGainPerShare: calculateEstimatedGainPerShare(gmp),
    estimatedGainPerLot: calculateEstimatedGainPerLot(gmp, lotSize),
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositive(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}
