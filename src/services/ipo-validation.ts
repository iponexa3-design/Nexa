import type { NormalizedGmp, NormalizedIpo, NormalizedSubscription } from "@/types/ipo";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateIpo(ipo: NormalizedIpo): ValidationResult {
  const errors: string[] = [];

  if (!ipo.companyName?.trim()) errors.push("companyName is required");
  if (!ipo.slug?.trim() || !SLUG_PATTERN.test(ipo.slug)) {
    errors.push("slug is missing or not a valid URL slug");
  }
  if (ipo.ipoType !== "MAINBOARD" && ipo.ipoType !== "SME") {
    errors.push("ipoType must be MAINBOARD or SME");
  }
  if (!ipo.exchange?.trim()) errors.push("exchange is required");

  if (isPresent(ipo.priceBandLow) && !isPositiveNumber(ipo.priceBandLow)) {
    errors.push("priceBandLow must be a positive number");
  }
  if (isPresent(ipo.priceBandHigh) && !isPositiveNumber(ipo.priceBandHigh)) {
    errors.push("priceBandHigh must be a positive number");
  }
  if (
    isPresent(ipo.priceBandLow) &&
    isPresent(ipo.priceBandHigh) &&
    ipo.priceBandLow! > ipo.priceBandHigh!
  ) {
    errors.push("priceBandLow cannot be greater than priceBandHigh");
  }

  if (isPresent(ipo.lotSize) && !isPositiveInteger(ipo.lotSize)) {
    errors.push("lotSize must be a positive integer");
  }
  if (isPresent(ipo.issueSize) && !isPositiveNumber(ipo.issueSize)) {
    errors.push("issueSize must be a positive number");
  }

  for (const field of ["openDate", "closeDate", "allotmentDate", "listingDate"] as const) {
    const value = ipo[field];
    if (isPresent(value) && Number.isNaN(Date.parse(value!))) {
      errors.push(`${field} is not a valid date`);
    }
  }
  if (
    isPresent(ipo.openDate) &&
    isPresent(ipo.closeDate) &&
    Date.parse(ipo.openDate!) > Date.parse(ipo.closeDate!)
  ) {
    errors.push("openDate cannot be after closeDate");
  }

  return { valid: errors.length === 0, errors };
}

export function validateGmp(gmp: NormalizedGmp): ValidationResult {
  const errors: string[] = [];

  if (!gmp.ipoSlug?.trim()) errors.push("ipoSlug is required");
  if (!Number.isFinite(gmp.gmp)) errors.push("gmp must be a finite number");
  if (!gmp.source?.trim()) errors.push("source is required");

  return { valid: errors.length === 0, errors };
}

export function validateSubscription(
  subscription: NormalizedSubscription,
): ValidationResult {
  const errors: string[] = [];

  if (!subscription.ipoSlug?.trim()) errors.push("ipoSlug is required");
  if (!subscription.source?.trim()) errors.push("source is required");

  for (const field of ["qib", "nii", "niiBig", "niiSmall", "retail", "employee", "shareholders", "total"] as const) {
    const value = subscription[field];
    if (isPresent(value) && (!Number.isFinite(value) || value! < 0)) {
      errors.push(`${field} must be a non-negative number`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function findDuplicateSlugs(ipos: NormalizedIpo[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const ipo of ipos) {
    if (seen.has(ipo.slug)) duplicates.add(ipo.slug);
    seen.add(ipo.slug);
  }
  return [...duplicates];
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function isPositiveNumber(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}
