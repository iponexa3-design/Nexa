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
  const today = getIndiaDateKey(new Date());
  const openDate = toDateKey(dates.openDate);
  const closeDate = toDateKey(dates.closeDate);
  const listingDate = toDateKey(dates.listingDate);

  if (listingDate !== null && today >= listingDate) return "LISTED";
  if (closeDate !== null && today > closeDate) return "CLOSED";
  if (openDate !== null && today >= openDate) return "OPEN";
  return "UPCOMING";
}

function toDateKey(value?: Date | string | null): string | null {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : getIndiaDateKey(date);
}

function getIndiaDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
