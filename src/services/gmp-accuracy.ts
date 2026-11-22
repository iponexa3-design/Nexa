import { getIndiaDateKey, toDateKey } from "@/utils/ipo-status";

/**
 * How well the grey market premium predicted listing-day prices, measured on
 * IPONexa's own stored records: for every listed IPO, the last GMP quote
 * before listing day is compared with the actual listing price, both as a
 * percentage of the same reference price (issue price, or the upper price
 * band when the issue price is unknown) used everywhere else on the site.
 */

export interface GmpQuote {
  gmp: number;
  /** When the source quoted it; falls back to when it was stored. */
  quotedAt: Date;
}

export interface ListedIpoOutcome {
  slug: string;
  companyName: string;
  ipoType: "MAINBOARD" | "SME";
  listingDate: Date | string | null;
  basisPrice: number | null;
  actualListingPrice: number | null;
  subscriptionTimes: number | null;
  /** Every stored GMP quote, in any order. */
  gmpQuotes: GmpQuote[];
}

export interface GmpAccuracyRow {
  slug: string;
  companyName: string;
  ipoType: "MAINBOARD" | "SME";
  listingDate: string;
  basisPrice: number;
  actualListingPrice: number;
  finalGmp: number;
  finalGmpQuotedAt: Date;
  /** Gain the final GMP implied: GMP / reference price. */
  impliedGainPct: number;
  /** Listing-day gain: (listing price - reference price) / reference price. */
  actualGainPct: number;
  /** actual - implied, in percentage points. Positive: listed better than GMP suggested. */
  differencePts: number;
  /** GMP pointed the right way: a positive GMP and a listing above the reference price, or a GMP of zero or less and a listing at or below it. */
  directionMatched: boolean;
}

/** Within this many percentage points, the GMP is counted as "close". */
export const CLOSE_MARGIN_PTS = 5;

const round2 = (value: number) => Math.round(value * 100) / 100;

/** The last GMP quote dated before listing day (IST), or null. */
export function finalGmpBeforeListing(quotes: GmpQuote[], listingDate: Date | string | null): GmpQuote | null {
  const listingKey = toDateKey(listingDate);
  if (!listingKey) return null;
  let best: GmpQuote | null = null;
  for (const quote of quotes) {
    if (getIndiaDateKey(quote.quotedAt) >= listingKey) continue;
    if (!best || quote.quotedAt.getTime() > best.quotedAt.getTime()) best = quote;
  }
  return best;
}

export function buildGmpAccuracyRow(ipo: ListedIpoOutcome): GmpAccuracyRow | null {
  const listingDate = toDateKey(ipo.listingDate);
  if (!listingDate || !ipo.basisPrice || ipo.basisPrice <= 0 || ipo.actualListingPrice === null) return null;
  const final = finalGmpBeforeListing(ipo.gmpQuotes, ipo.listingDate);
  if (!final) return null;
  const impliedGainPct = round2((final.gmp / ipo.basisPrice) * 100);
  const actualGainPct = round2(((ipo.actualListingPrice - ipo.basisPrice) / ipo.basisPrice) * 100);
  return {
    slug: ipo.slug,
    companyName: ipo.companyName,
    ipoType: ipo.ipoType,
    listingDate,
    basisPrice: ipo.basisPrice,
    actualListingPrice: ipo.actualListingPrice,
    finalGmp: final.gmp,
    finalGmpQuotedAt: final.quotedAt,
    impliedGainPct,
    actualGainPct,
    differencePts: round2(actualGainPct - impliedGainPct),
    directionMatched: final.gmp > 0 ? ipo.actualListingPrice > ipo.basisPrice : ipo.actualListingPrice <= ipo.basisPrice,
  };
}

export interface GmpAccuracyStats {
  count: number;
  /** Median of |actual - implied|, in percentage points. */
  medianAbsDifferencePts: number | null;
  /** Average of (actual - implied): negative means listings fell short of GMP on average. */
  averageDifferencePts: number | null;
  /** Share of IPOs listed within CLOSE_MARGIN_PTS of the GMP, 0-100. */
  closePct: number | null;
  /** Share where the GMP pointed the right way, 0-100. */
  directionPct: number | null;
  /** Share that listed below what the GMP implied, 0-100. */
  belowGmpPct: number | null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

const pct = (part: number, whole: number) => (whole === 0 ? null : Math.round((part / whole) * 1000) / 10);

export function summarizeGmpAccuracy(rows: GmpAccuracyRow[]): GmpAccuracyStats {
  const count = rows.length;
  const differences = rows.map((row) => row.differencePts);
  const medianAbs = median(differences.map(Math.abs));
  return {
    count,
    medianAbsDifferencePts: medianAbs === null ? null : round2(medianAbs),
    averageDifferencePts: count === 0 ? null : round2(differences.reduce((sum, value) => sum + value, 0) / count),
    closePct: pct(rows.filter((row) => Math.abs(row.differencePts) <= CLOSE_MARGIN_PTS).length, count),
    directionPct: pct(rows.filter((row) => row.directionMatched).length, count),
    belowGmpPct: pct(rows.filter((row) => row.differencePts < 0).length, count),
  };
}

export interface SubscriptionBand {
  label: string;
  /** Inclusive lower bound, in times subscribed. */
  min: number;
  /** Exclusive upper bound; null for the last band. */
  max: number | null;
  count: number;
  medianGainPct: number | null;
  /** Share that listed above the reference price, 0-100. */
  positivePct: number | null;
}

const SUBSCRIPTION_BANDS: Array<{ label: string; min: number; max: number | null }> = [
  { label: "Under 10x", min: 0, max: 10 },
  { label: "10x to 50x", min: 10, max: 50 },
  { label: "50x to 150x", min: 50, max: 150 },
  { label: "150x and above", min: 150, max: null },
];

/** Listing-day gains of listed IPOs grouped by how many times they were subscribed. */
export function listingGainBySubscription(ipos: ListedIpoOutcome[]): SubscriptionBand[] {
  const outcomes = ipos.flatMap((ipo) =>
    ipo.subscriptionTimes !== null && ipo.basisPrice && ipo.basisPrice > 0 && ipo.actualListingPrice !== null
      ? [{ times: ipo.subscriptionTimes, gain: ((ipo.actualListingPrice - ipo.basisPrice) / ipo.basisPrice) * 100 }]
      : [],
  );
  return SUBSCRIPTION_BANDS.map((band) => {
    const inBand = outcomes.filter((row) => row.times >= band.min && (band.max === null || row.times < band.max));
    const medianGain = median(inBand.map((row) => row.gain));
    return {
      ...band,
      count: inBand.length,
      medianGainPct: medianGain === null ? null : round2(medianGain),
      positivePct: pct(inBand.filter((row) => row.gain > 0).length, inBand.length),
    };
  });
}
