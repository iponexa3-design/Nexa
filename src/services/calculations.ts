/**
 * Pure calculation engine (spec section 14). Never compute these values
 * in UI components - always call these from the backend/service layer,
 * so results are consistent and testable.
 *
 * All functions return null when inputs are missing/invalid, per spec
 * section 27: if GMP is unavailable, never show 0 or a fabricated result.
 */

export type PriceBasisKind = "ISSUE_PRICE" | "UPPER_PRICE_BAND";

export interface PriceBasis {
  price: number;
  kind: PriceBasisKind;
}

/**
 * Picks the per-share price every estimate is measured against. A final or
 * fixed issue price always wins; otherwise the upper end of the price band
 * is used, and callers must disclose that assumption (kind=UPPER_PRICE_BAND).
 */
export function resolvePriceBasis(prices: {
  issuePrice?: number | null;
  priceBandLow?: number | null;
  priceBandHigh?: number | null;
}): PriceBasis | null {
  if (isPositive(prices.issuePrice)) {
    return { price: prices.issuePrice, kind: "ISSUE_PRICE" };
  }
  if (!isPositive(prices.priceBandHigh)) return null;
  const isFixedPrice =
    !isPositive(prices.priceBandLow) || prices.priceBandLow === prices.priceBandHigh;
  return {
    price: prices.priceBandHigh,
    kind: isFixedPrice ? "ISSUE_PRICE" : "UPPER_PRICE_BAND",
  };
}

export function calculateGmpPercentage(
  gmp: number | null | undefined,
  basisPrice: number | null | undefined,
): number | null {
  if (!isFiniteNumber(gmp) || !isPositive(basisPrice)) return null;
  return (gmp / basisPrice) * 100;
}

export function calculateEstimatedListingPrice(
  basisPrice: number | null | undefined,
  gmp: number | null | undefined,
): number | null {
  if (!isPositive(basisPrice) || !isFiniteNumber(gmp)) return null;
  return basisPrice + gmp;
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
  basisPrice: number | null | undefined,
  lotSize: number | null | undefined,
): ListingCalculations {
  return {
    gmpPercentage: calculateGmpPercentage(gmp, basisPrice),
    estimatedListingPrice: calculateEstimatedListingPrice(basisPrice, gmp),
    estimatedGainPerShare: calculateEstimatedGainPerShare(gmp),
    estimatedGainPerLot: calculateEstimatedGainPerLot(gmp, lotSize),
  };
}

export interface ActualListingCalculations {
  actualGainPerShare: number | null;
  actualGainPerLot: number | null;
  actualGainPercentage: number | null;
}

/**
 * Historical listing performance from the reported listing price. Kept
 * separate from the GMP estimates so one can never overwrite the other.
 */
export function calculateActualListingFigures(
  actualListingPrice: number | null | undefined,
  basisPrice: number | null | undefined,
  lotSize: number | null | undefined,
): ActualListingCalculations {
  if (!isPositive(actualListingPrice) || !isPositive(basisPrice)) {
    return { actualGainPerShare: null, actualGainPerLot: null, actualGainPercentage: null };
  }
  const perShare = actualListingPrice - basisPrice;
  return {
    actualGainPerShare: perShare,
    actualGainPerLot: isPositive(lotSize) ? perShare * lotSize : null,
    actualGainPercentage: (perShare / basisPrice) * 100,
  };
}

export function calculateMinimumApplication(
  basisPrice: number | null | undefined,
  lotSize: number | null | undefined,
): number | null {
  if (!isPositive(basisPrice) || !isPositive(lotSize)) return null;
  return basisPrice * lotSize;
}

/**
 * Factual difference between what actually listed and what GMP estimated -
 * a comparison only, never framed as a "winner" or "better" outcome.
 */
export function calculateListingDifference(
  estimatedListingPrice: number | null | undefined,
  actualListingPrice: number | null | undefined,
): number | null {
  if (!isFiniteNumber(estimatedListingPrice) || !isFiniteNumber(actualListingPrice)) {
    return null;
  }
  return actualListingPrice - estimatedListingPrice;
}

export type GmpFreshness = "CURRENT" | "STALE" | "UNDATED" | "UNAVAILABLE";

/** GMP older than this is shown as outdated rather than current. */
export const GMP_STALE_AFTER_HOURS = 48;

/**
 * Freshness is judged only from the source's own timestamp. The time we
 * fetched a value says nothing about when the market quoted it, so a value
 * without a source timestamp is UNDATED, never CURRENT.
 */
export function classifyGmpFreshness(
  gmp: number | null | undefined,
  sourceUpdatedAt: Date | string | null | undefined,
  now: Date,
): GmpFreshness {
  if (!isFiniteNumber(gmp)) return "UNAVAILABLE";
  if (!sourceUpdatedAt) return "UNDATED";
  const updated = new Date(sourceUpdatedAt).getTime();
  if (Number.isNaN(updated)) return "UNDATED";
  const ageMs = now.getTime() - updated;
  return ageMs > GMP_STALE_AFTER_HOURS * 3_600_000 ? "STALE" : "CURRENT";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositive(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}
