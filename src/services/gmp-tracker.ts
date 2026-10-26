import {
  calculateActualListingFigures,
  calculateListingFigures,
  calculateMinimumApplication,
  classifyGmpFreshness,
  resolvePriceBasis,
  type GmpFreshness,
  type PriceBasisKind,
} from "@/services/calculations";
import type { ComputedIpoStatus } from "@/utils/ipo-status";
import type { IpoType } from "@/types/ipo";

export interface IpoFigureInputs {
  issuePrice: number | null;
  priceBandLow: number | null;
  priceBandHigh: number | null;
  lotSize: number | null;
  gmp: number | null;
  gmpSourceUpdatedAt: Date | string | null;
  actualListingPrice: number | null;
  sourceMinimumInvestment: number | null;
}

export interface IpoDerivedFigures {
  basisPrice: number | null;
  priceBasis: PriceBasisKind | null;
  minimumInvestment: number | null;
  gmpFreshness: GmpFreshness;
  gmpPercentage: number | null;
  estimatedListingPrice: number | null;
  estimatedGainPerShare: number | null;
  estimatedGainPerLot: number | null;
  actualGainPerShare: number | null;
  actualGainPerLot: number | null;
  actualGainPercentage: number | null;
}

/**
 * Single place where every displayed figure is derived from raw IPO data,
 * so the tracker table, homepage, detail page and comparison always agree.
 */
export function deriveIpoFigures(input: IpoFigureInputs, now: Date): IpoDerivedFigures {
  const basis = resolvePriceBasis(input);
  const basisPrice = basis?.price ?? null;
  const estimates = calculateListingFigures(input.gmp, basisPrice, input.lotSize);
  const actuals = calculateActualListingFigures(
    input.actualListingPrice,
    basisPrice,
    input.lotSize,
  );

  return {
    basisPrice,
    priceBasis: basis?.kind ?? null,
    minimumInvestment:
      input.sourceMinimumInvestment ?? calculateMinimumApplication(basisPrice, input.lotSize),
    gmpFreshness: classifyGmpFreshness(input.gmp, input.gmpSourceUpdatedAt, now),
    ...estimates,
    ...actuals,
  };
}

/** Listed IPOs are shown for this long after listing (tracker, homepage, compare). */
export const LISTED_HISTORY_DAYS = 45;

/** Compare IPO accepts at least two and at most three IPOs. */
export const COMPARE_MIN = 2;
export const COMPARE_MAX = 3;

export type TrackerCategory = "open" | "upcoming" | "closed" | "listed";

function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(limited|ltd|private|pvt)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The feed keeps an undated "announced" record (e.g. "Paras Healthcare")
 * even after the real issue appears under another id ("Paras Healthcare
 * Limited"). Drop the placeholder once a dated IPO with the same name exists.
 */
export function dropSupersededAnnouncements<
  T extends { companyName: string; openDate: Date | string | null },
>(items: T[]): T[] {
  const datedNames = new Set(
    items.filter((item) => item.openDate).map((item) => normalizeCompanyName(item.companyName)),
  );
  return items.filter(
    (item) => item.openDate || !datedNames.has(normalizeCompanyName(item.companyName)),
  );
}

export function trackerCategoryOf(status: ComputedIpoStatus): TrackerCategory {
  switch (status) {
    case "OPEN":
      return "open";
    case "UPCOMING":
      return "upcoming";
    case "CLOSED":
      return "closed";
    case "LISTED":
      return "listed";
  }
}

/** Serializable row handed to the client-side tracker (dates as ISO strings). */
export interface GmpTrackerRow extends IpoDerivedFigures {
  slug: string;
  companyName: string;
  ipoType: IpoType;
  exchange: string;
  status: ComputedIpoStatus;
  category: TrackerCategory;
  priceBandLow: number | null;
  priceBandHigh: number | null;
  issuePrice: number | null;
  lotSize: number | null;
  openDate: string | null;
  closeDate: string | null;
  listingDate: string | null;
  actualListingPrice: number | null;
  gmp: number | null;
  gmpSource: string | null;
  gmpSourceUpdatedAt: string | null;
  gmpRecordedAt: string | null;
  subscriptionTimes: number | null;
}

export interface TrackerFilters {
  category: TrackerCategory | "all";
  ipoType: IpoType | "all";
  query: string;
}

export function filterTrackerRows<T extends Pick<GmpTrackerRow, "category" | "ipoType" | "companyName">>(
  rows: T[],
  filters: TrackerFilters,
): T[] {
  const query = filters.query.trim().toLowerCase();
  return rows.filter(
    (row) =>
      (filters.category === "all" || row.category === filters.category) &&
      (filters.ipoType === "all" || row.ipoType === filters.ipoType) &&
      (query === "" || row.companyName.toLowerCase().includes(query)),
  );
}

type ListedRowFields = Pick<
  GmpTrackerRow,
  "slug" | "companyName" | "listingDate" | "actualListingPrice" | "actualGainPercentage"
>;

/** Listed on or before `now` and within the last `days` days. */
export function listedWithin(row: Pick<GmpTrackerRow, "listingDate">, now: Date, days: number): boolean {
  const listed = toTime(row.listingDate);
  return listed !== null && listed <= now.getTime() && listed >= now.getTime() - days * 86_400_000;
}

export interface ListedSummary {
  /** Listed IPOs in view. */
  total: number;
  /** Those with a reported listing price; only these count below. */
  withResult: number;
  higher: number;
  lower: number;
  /** Listed exactly at the issue price (0%). */
  unchanged: number;
  averageGainPercentage: number | null;
  best: { slug: string; companyName: string; gainPercentage: number } | null;
  worst: { slug: string; companyName: string; gainPercentage: number } | null;
  /** Other IPOs sharing the best / worst gain (e.g. several SMEs at +90%). */
  bestTies: number;
  worstTies: number;
}

/** Listing-day outcome summary for the Listed tab; never counts missing prices as 0%. */
export function summarizeListedRows(rows: ListedRowFields[]): ListedSummary {
  const results = rows.flatMap((row) =>
    row.actualListingPrice !== null && row.actualGainPercentage !== null
      ? [{ slug: row.slug, companyName: row.companyName, gainPercentage: row.actualGainPercentage }]
      : [],
  );
  // Ties (same %) are ordered by name so the named best/worst is stable.
  const byGain = [...results].sort(
    (a, b) => b.gainPercentage - a.gainPercentage || a.companyName.localeCompare(b.companyName),
  );
  const best = byGain[0] ?? null;
  const worst = byGain.length > 1 ? byGain[byGain.length - 1] : null;
  // Compare at the displayed precision: 95.4 / 106 and 106.2 / 118 are both
  // "+90.00%" but differ in the last floating-point bits.
  const displayed = (gain: number) => Math.round(gain * 100);
  const tiesWith = (pick: { gainPercentage: number } | null) =>
    pick
      ? results.filter((result) => displayed(result.gainPercentage) === displayed(pick.gainPercentage)).length - 1
      : 0;
  return {
    total: rows.length,
    withResult: results.length,
    higher: results.filter((result) => result.gainPercentage > 0).length,
    lower: results.filter((result) => result.gainPercentage < 0).length,
    unchanged: results.filter((result) => result.gainPercentage === 0).length,
    averageGainPercentage:
      results.length > 0 ? results.reduce((sum, result) => sum + result.gainPercentage, 0) / results.length : null,
    best,
    worst,
    bestTies: tiesWith(best),
    worstTies: worst ? tiesWith(worst) : 0,
  };
}

const categoryOrder: Record<TrackerCategory, number> = {
  open: 0,
  closed: 1,
  upcoming: 2,
  listed: 3,
};

/**
 * Open IPOs closing soonest first, then those awaiting listing, then
 * upcoming by open date, then listed IPOs newest first.
 */
export function compareTrackerRows(a: GmpTrackerRow, b: GmpTrackerRow): number {
  if (a.category !== b.category) return categoryOrder[a.category] - categoryOrder[b.category];
  const key = (row: GmpTrackerRow) => {
    switch (row.category) {
      case "open":
        return row.closeDate;
      case "closed":
        return row.listingDate ?? row.closeDate;
      case "upcoming":
        return row.openDate;
      case "listed":
        return row.listingDate;
    }
  };
  const left = toTime(key(a));
  const right = toTime(key(b));
  if (left === right) return a.companyName.localeCompare(b.companyName);
  if (a.category === "listed") return (right ?? 0) - (left ?? 0);
  return (left ?? Infinity) - (right ?? Infinity);
}

function toTime(value: string | null): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

/**
 * Quick-search matches for the header search box: names with a word starting
 * with the query come first, then names containing it anywhere. Within each
 * group the input order is kept (pass rows sorted by `compareTrackerRows`).
 */
export function searchTrackerRows<T extends Pick<GmpTrackerRow, "companyName">>(
  rows: T[],
  query: string,
  limit: number,
): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const wordStart: T[] = [];
  const anywhere: T[] = [];
  for (const row of rows) {
    const name = row.companyName.toLowerCase();
    const at = name.indexOf(needle);
    if (at < 0) continue;
    const startsWord = name.split(/[\s.&()-]+/).some((word) => word.startsWith(needle));
    (at === 0 || startsWord ? wordStart : anywhere).push(row);
  }
  return [...wordStart, ...anywhere].slice(0, limit);
}
