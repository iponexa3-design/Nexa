export type ComputedIpoStatus = "UPCOMING" | "OPEN" | "CLOSED" | "LISTED";

/**
 * Derives IPO status purely from dates - never stored as a hand-set flag,
 * so it can't drift from reality (per product spec section 3).
 */
export function computeIpoStatus(dates: {
  openDate?: Date | string | null;
  closeDate?: Date | string | null;
  listingDate?: Date | string | null;
}): ComputedIpoStatus {
  const now = Date.now();
  const openDate = toTime(dates.openDate);
  const closeDate = toTime(dates.closeDate);
  const listingDate = toTime(dates.listingDate);

  if (listingDate !== null && now >= listingDate) return "LISTED";
  if (closeDate !== null && now > closeDate) return "CLOSED";
  if (openDate !== null && now >= openDate) return "OPEN";
  return "UPCOMING";
}

function toTime(value?: Date | string | null): number | null {
  if (!value) return null;
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isNaN(time) ? null : time;
}
