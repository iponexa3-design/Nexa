import type { ComputedIpoStatus } from "@/utils/ipo-status";
import { getIndiaDateKey, toDateKey } from "@/utils/ipo-status";
import { formatCurrency, formatDate, formatDateTime, formatSignedPercent, formatSubscriptionTimes } from "@/utils/format";

/**
 * Plain-language facts for one IPO page, written only from the data we hold.
 * Every sentence is skipped when its data is missing; nothing is estimated
 * or filled in.
 */
export interface IpoSummaryInput {
  companyName: string;
  ipoType: "MAINBOARD" | "SME";
  exchange: string;
  status: ComputedIpoStatus;
  priceBandLow: number | null;
  priceBandHigh: number | null;
  issueSize: number | null;
  lotSize: number | null;
  minimumInvestment: number | null;
  openDate: Date | string | null;
  closeDate: Date | string | null;
  listingDate: Date | string | null;
  allotmentDate: string | null;
  subscriptionTimes: number | null;
  subscriptionUpdatedAt: Date | string | null;
  /** Category multiples belonging to the same figure as `subscriptionTimes`, if known. */
  subscriptionCategories: { qib: number | null; nii: number | null; retail: number | null } | null;
  basisPrice: number | null;
  priceBasis: "ISSUE_PRICE" | "UPPER_PRICE_BAND" | null;
  actualListingPrice: number | null;
  actualGainPercentage: number | null;
  actualGainPerLot: number | null;
  gmp: number | null;
  gmpPercentage: number | null;
  gmpSourceUpdatedAt: Date | string | null;
  gmpFreshness: string;
}

/** A closed IPO with no listing date this long after closing is treated as stale. */
export const STALE_CLOSED_DAYS = 10;

function daysSince(value: Date | string | null, now: Date): number | null {
  const key = toDateKey(value);
  if (!key) return null;
  const today = Date.parse(`${getIndiaDateKey(now)}T00:00:00Z`);
  return Math.round((today - Date.parse(`${key}T00:00:00Z`)) / 86_400_000);
}

/** True when bidding closed long ago and no listing date has been reported. */
export function isStaleClosedIpo(ipo: Pick<IpoSummaryInput, "status" | "closeDate" | "listingDate">, now: Date): boolean {
  if (ipo.status !== "CLOSED" || ipo.listingDate) return false;
  const days = daysSince(ipo.closeDate, now);
  return days !== null && days > STALE_CLOSED_DAYS;
}

/** Shorter than this, a company overview is a one-liner, not a description. */
const MIN_OVERVIEW_CHARS = 120;

export type IpoIndexInput = Pick<
  IpoSummaryInput,
  "status" | "priceBandHigh" | "openDate" | "closeDate" | "listingDate" | "subscriptionTimes" | "gmp" | "actualListingPrice"
> & {
  /** The company overview shown on the page, if any. */
  companyOverview: string | null | undefined;
};

/**
 * Whether an IPO page has enough real information to be indexed by search
 * engines. Announced IPOs without a price band or dates, and stale closed
 * records, are kept out. So are pages that would only repeat facts every IPO
 * site carries:
 * - an IPO not yet listed needs the company overview or a market figure
 *   (subscription or GMP);
 * - a listed IPO needs at least two of subscription figures, a GMP quote and
 *   the actual listing result, since its value is how the issue played out
 *   (the overview comes from the data feed and is not counted).
 * Pages left out stay reachable on the site and become indexable once that
 * data arrives.
 */
export function isIpoIndexable(ipo: IpoIndexInput, now: Date): boolean {
  if (!ipo.priceBandHigh && !ipo.openDate) return false;
  if (isStaleClosedIpo(ipo, now)) return false;
  const marketData = [ipo.subscriptionTimes !== null, ipo.gmp !== null, ipo.actualListingPrice !== null].filter(Boolean).length;
  if (ipo.status === "LISTED") return marketData >= 2;
  const hasOverview = (ipo.companyOverview?.trim().length ?? 0) >= MIN_OVERVIEW_CHARS;
  return hasOverview || marketData >= 1;
}

function priceText(ipo: IpoSummaryInput): string | null {
  if (!ipo.priceBandHigh) return null;
  if (!ipo.priceBandLow || ipo.priceBandLow === ipo.priceBandHigh) {
    return `at a fixed price of ${formatCurrency(ipo.priceBandHigh)} per share`;
  }
  return `with a price band of ${formatCurrency(ipo.priceBandLow)} to ${formatCurrency(ipo.priceBandHigh)} per share`;
}

function crore(value: number): string {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })} crore`;
}

export function buildIpoSummary(ipo: IpoSummaryInput, now: Date): string[] {
  const facts: string[] = [];
  const kind = ipo.ipoType === "SME" ? "an SME" : "a mainboard";
  const exchange = ipo.exchange ? ` (${ipo.exchange})` : "";
  const price = priceText(ipo);

  if (price) {
    facts.push(
      `${ipo.companyName} is ${kind} IPO${exchange} ${price}${ipo.issueSize ? `, raising about ${crore(ipo.issueSize)}` : ""}.`,
    );
  } else {
    facts.push(
      `${ipo.companyName} is ${kind} IPO${exchange}. Its price band has not been published yet.`,
    );
  }

  if (ipo.lotSize) {
    facts.push(
      `One lot is ${ipo.lotSize} shares${ipo.minimumInvestment ? `, so the minimum application is about ${formatCurrency(ipo.minimumInvestment)}` : ""}${ipo.priceBasis === "UPPER_PRICE_BAND" ? " at the upper end of the band" : ""}.`,
    );
  }

  const open = ipo.openDate ? formatDate(ipo.openDate) : null;
  const close = ipo.closeDate ? formatDate(ipo.closeDate) : null;
  const listing = ipo.listingDate ? formatDate(ipo.listingDate) : null;
  const allotment = ipo.allotmentDate ? formatDate(ipo.allotmentDate) : null;
  switch (ipo.status) {
    case "UPCOMING":
      facts.push(
        open
          ? `Bidding opens on ${open}${close ? ` and closes on ${close}` : ""}${listing ? `, with listing scheduled for ${listing}` : ""}.`
          : "The bidding dates have not been announced yet.",
      );
      break;
    case "OPEN":
      facts.push(
        `Bidding is open${close ? ` until ${close}` : ""}${allotment ? `; allotment is expected on ${allotment}` : ""}${listing ? ` and listing on ${listing}` : ""}.`,
      );
      break;
    case "CLOSED":
      facts.push(
        `Bidding closed${close ? ` on ${close}` : ""}${allotment ? `. Allotment was scheduled for ${allotment}` : ""}${listing ? ` and listing for ${listing}` : ""}.`,
      );
      break;
    case "LISTED":
      if (listing) facts.push(`The shares listed on ${listing}.`);
      break;
  }

  if (ipo.subscriptionTimes !== null) {
    const categories = ipo.subscriptionCategories;
    const parts =
      categories && categories.qib !== null
        ? ` (QIB ${formatSubscriptionTimes(categories.qib)}, NII ${formatSubscriptionTimes(categories.nii)}, retail ${formatSubscriptionTimes(categories.retail)})`
        : "";
    const when = ipo.subscriptionUpdatedAt ? ` as of ${formatDateTime(ipo.subscriptionUpdatedAt)}` : "";
    facts.push(
      ipo.status === "OPEN"
        ? `It has been subscribed ${formatSubscriptionTimes(ipo.subscriptionTimes)} overall${when}${parts}.`
        : `It was subscribed ${formatSubscriptionTimes(ipo.subscriptionTimes)} overall${parts}.`,
    );
  }

  if (ipo.status === "LISTED" && ipo.actualListingPrice !== null && ipo.basisPrice !== null && ipo.actualGainPercentage !== null) {
    const direction = ipo.actualGainPercentage > 0 ? "above" : ipo.actualGainPercentage < 0 ? "below" : "level with";
    const pct = ipo.actualGainPercentage === 0 ? "" : ` ${formatSignedPercent(Math.abs(ipo.actualGainPercentage)).replace("+", "")}`;
    const reference = ipo.priceBasis === "UPPER_PRICE_BAND" ? "upper price band" : "issue price";
    facts.push(
      `On listing day the share opened at ${formatCurrency(ipo.actualListingPrice)},${pct} ${direction} the ${reference} of ${formatCurrency(ipo.basisPrice)}.`,
    );
  } else if (ipo.status === "LISTED") {
    facts.push("The listing price is not available yet.");
  } else if (ipo.gmp !== null) {
    const when = ipo.gmpSourceUpdatedAt ? `, quoted on ${formatDate(ipo.gmpSourceUpdatedAt)}` : "";
    const old = ipo.gmpFreshness === "STALE" ? " That figure is more than two days old." : "";
    facts.push(
      `The latest grey market premium${when}, is ${formatCurrency(ipo.gmp)}${ipo.gmpPercentage !== null ? ` (${formatSignedPercent(ipo.gmpPercentage)})` : ""}. GMP is unofficial and can change quickly.${old}`,
    );
  }

  if (isStaleClosedIpo(ipo, now)) {
    facts.push(
      `No listing date had been reported ${daysSince(ipo.closeDate, now)} days after bidding closed. The issue may have been delayed or withdrawn; check the exchange's notices for its current status.`,
    );
  }

  return facts;
}

/** A specific, factual meta description for the IPO page (max ~160 characters). */
export function buildIpoMetaDescription(ipo: IpoSummaryInput): string {
  const parts: string[] = [];
  if (ipo.priceBandHigh) {
    parts.push(
      !ipo.priceBandLow || ipo.priceBandLow === ipo.priceBandHigh
        ? `price ${formatCurrency(ipo.priceBandHigh)}`
        : `price band ${formatCurrency(ipo.priceBandLow)}-${formatCurrency(ipo.priceBandHigh)}`,
    );
  }
  if (ipo.lotSize) parts.push(`lot ${ipo.lotSize} shares`);
  if (ipo.subscriptionTimes !== null) parts.push(`subscribed ${formatSubscriptionTimes(ipo.subscriptionTimes)}`);
  if (ipo.status === "LISTED" && ipo.actualListingPrice !== null && ipo.actualGainPercentage !== null) {
    parts.push(`listed at ${formatCurrency(ipo.actualListingPrice)} (${formatSignedPercent(ipo.actualGainPercentage)})`);
  } else if (ipo.status !== "LISTED" && ipo.gmp !== null) {
    parts.push(`GMP ${formatCurrency(ipo.gmp)}`);
  }
  const kind = ipo.ipoType === "SME" ? "SME IPO" : "IPO";
  const head = `${ipo.companyName} ${kind}${parts.length > 0 ? `: ${parts.join(", ")}` : ""}.`;
  const tail = " Dates, allotment, subscription and listing details.";
  const text = head + tail;
  return text.length <= 160 ? text : head.length <= 160 ? head : `${head.slice(0, 157)}...`;
}
