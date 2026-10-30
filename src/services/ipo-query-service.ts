import { cache } from "react";
import { prisma } from "@/db/prisma";
import { getIpoDataProvider } from "@/providers";
import { OFFICIAL_SUBSCRIPTION_SOURCES } from "@/providers/http-api-provider";
import { computeIpoStatus, toDateKey, type ComputedIpoStatus } from "@/utils/ipo-status";
import {
  compareTrackerRows,
  deriveIpoFigures,
  dropSupersededAnnouncements,
  LISTED_HISTORY_DAYS,
  trackerCategoryOf,
  type GmpTrackerRow,
  type IpoDerivedFigures,
} from "@/services/gmp-tracker";
import { buildWeekCalendar, type CalendarDay } from "@/services/homepage-insights";
import { buildSubscriptionRows, type SubscriptionTrackerRow } from "@/services/subscription-tracker";
import { allotmentDateFromSchedule, selectAllotmentIpos, type AllotmentStage } from "@/services/allotment";
import {
  buildDaywiseSubscription,
  type DaywiseSubscriptionRow,
  type SubscriptionFigures,
} from "@/services/subscription-history";
import type { IpoResearchData, NormalizedIpo } from "@/types/ipo";
import type { IpoType } from "@/generated/prisma/enums";

export interface IpoListItem extends IpoDerivedFigures {
  slug: string;
  companyName: string;
  ipoType: IpoType;
  exchange: string;
  status: ComputedIpoStatus;
  priceBandLow: number | null;
  priceBandHigh: number | null;
  lotSize: number | null;
  issueSize: number | null;
  subscriptionTimes: number | null;
  subscriptionSource: string | null;
  subscriptionUpdatedAt: Date | null;
  /** Category figures belonging to `subscriptionTimes`, when that figure came from the exchanges. */
  subscriptionBreakdown: SubscriptionFigures | null;
  issuePrice: number | null;
  actualListingPrice: number | null;
  openDate: Date | null;
  closeDate: Date | null;
  listingDate: Date | null;
  /** Basis-of-allotment date from the issue schedule (YYYY-MM-DD, IST). */
  allotmentDate: string | null;
  /** Registrar to the issue, as NSE names it. */
  registrar: string | null;
  gmp: number | null;
  gmpSource: string | null;
  /** When the source quoted the GMP; null when the source gave no timestamp. */
  gmpSourceUpdatedAt: Date | null;
  /** When IPONexa stored the GMP value. */
  gmpRecordedAt: Date | null;
}

export interface HomepageIpoGroups {
  upcoming: IpoListItem[];
  open: IpoListItem[];
  /** Subscription closed, listing still pending. */
  awaitingListing: IpoListItem[];
  /** Listings of the last 45 days, newest first. */
  recentlyListed: IpoListItem[];
  /** Number of listed IPOs (same as recentlyListed.length). */
  listedCount: number;
  /** Opens, closes and listings over the next 7 IST days. */
  weekCalendar: CalendarDay[];
  liveFeedUnavailable: boolean;
  liveFeedQuotaExceeded: boolean;
}

export interface GmpTrackerData {
  rows: GmpTrackerRow[];
  liveFeedUnavailable: boolean;
  liveFeedQuotaExceeded: boolean;
  /** True when rows came straight from the provider because the database was unavailable or empty. */
  servedFromLiveFeed: boolean;
  dataUpdatedAt: Date | null;
}

interface IpoListItemsResult {
  items: IpoListItem[];
  liveFeedUnavailable: boolean;
  liveFeedQuotaExceeded: boolean;
  servedFromLiveFeed: boolean;
  dataUpdatedAt: Date | null;
}

const listItemInclude = {
  gmps: { orderBy: { recordedAt: "desc" as const }, take: 1 },
  subscriptions: { orderBy: { subscriptionDate: "desc" as const }, take: 1 },
};

const LIVE_CACHE_TTL_MS = 60_000;

let liveListCache: { expiresAt: number; value: IpoListItemsResult } | null = null;
let liveIpoRecordsCache: { expiresAt: number; value: NormalizedIpo[] } | null = null;
const ipoDetailLiveCache: Map<string, { expiresAt: number; value: IpoDetail }> = new Map();

export function clearIpoLiveCache(): void {
  liveListCache = null;
  liveIpoRecordsCache = null;
  ipoDetailLiveCache.clear();
}

/**
 * All IPO records, read from the database (populated by the scheduled
 * ingest job). The provider is only called when the database is empty or
 * unreachable, and that response is cached, so page renders never fan out
 * to the external API. Wrapped in React cache() so several sections of
 * one render share a single database query.
 */
const loadIpoListItems = cache(async (): Promise<IpoListItemsResult> => {
  try {
    const ipos = await prisma.ipo.findMany({
      include: listItemInclude,
      orderBy: { updatedAt: "desc" },
    });

    if (ipos.length === 0) {
      console.warn("Database is empty; falling back to live provider for IPO list data");
      return loadLiveIpoListItems();
    }

    const now = new Date();
    return {
      items: withinListedHistory(
        dropSupersededAnnouncements(ipos.map((ipo) => toListItem(ipo, now))),
        now,
      ),
      liveFeedUnavailable: false,
      liveFeedQuotaExceeded: false,
      servedFromLiveFeed: false,
      dataUpdatedAt: ipos[0]?.updatedAt ?? null,
    };
  } catch (error) {
    console.warn("Falling back to live provider for IPO list data", error);
    return loadLiveIpoListItems();
  }
});

export async function getHomepageIpoGroups(): Promise<HomepageIpoGroups> {
  const { items, liveFeedUnavailable, liveFeedQuotaExceeded } = await loadIpoListItems();
  const now = new Date();

  return {
    upcoming: items
      .filter((item) => item.status === "UPCOMING")
      .sort(byDateAsc((item) => item.openDate)),
    open: items
      .filter((item) => item.status === "OPEN")
      .sort(byDateAsc((item) => item.closeDate)),
    awaitingListing: items
      .filter((item) => item.status === "CLOSED")
      .sort(byDateAsc((item) => item.listingDate)),
    recentlyListed: items
      .filter((item) => item.status === "LISTED")
      .sort(byDateDesc((item) => item.listingDate)),
    listedCount: items.filter((item) => item.status === "LISTED").length,
    weekCalendar: buildWeekCalendar(items, now),
    liveFeedUnavailable,
    liveFeedQuotaExceeded,
  };
}

export interface AllotmentPageData {
  ipos: Array<IpoListItem & { stage: AllotmentStage }>;
  liveFeedUnavailable: boolean;
}

/** IPOs whose allotment is out, due today or coming up, for the allotment status page. */
export async function getAllotmentData(now: Date = new Date()): Promise<AllotmentPageData> {
  const { items, liveFeedUnavailable } = await loadIpoListItems();
  return { ipos: selectAllotmentIpos(items, now), liveFeedUnavailable };
}

/** IPOs that have opened for bidding, with their latest subscription figures, for the subscription tracker. */
export async function getSubscriptionTrackerData(): Promise<{ rows: SubscriptionTrackerRow[]; dataUpdatedAt: Date | null }> {
  const { items, dataUpdatedAt } = await loadIpoListItems();
  return { rows: buildSubscriptionRows(items), dataUpdatedAt };
}

/** Every available IPO (upcoming, open, awaiting listing and listed) for the GMP tracker. */
export async function getGmpTrackerData(): Promise<GmpTrackerData> {
  const result = await loadIpoListItems();
  return {
    rows: result.items.map(toTrackerRow).sort(compareTrackerRows),
    liveFeedUnavailable: result.liveFeedUnavailable,
    liveFeedQuotaExceeded: result.liveFeedQuotaExceeded,
    servedFromLiveFeed: result.servedFromLiveFeed,
    dataUpdatedAt: result.dataUpdatedAt,
  };
}

export function toTrackerRow(item: IpoListItem): GmpTrackerRow {
  return {
    slug: item.slug,
    companyName: item.companyName,
    ipoType: item.ipoType,
    exchange: item.exchange,
    status: item.status,
    category: trackerCategoryOf(item.status),
    priceBandLow: item.priceBandLow,
    priceBandHigh: item.priceBandHigh,
    issuePrice: item.issuePrice,
    lotSize: item.lotSize,
    openDate: toIso(item.openDate),
    closeDate: toIso(item.closeDate),
    listingDate: toIso(item.listingDate),
    actualListingPrice: item.actualListingPrice,
    gmp: item.gmp,
    gmpSource: item.gmpSource,
    gmpSourceUpdatedAt: toIso(item.gmpSourceUpdatedAt),
    gmpRecordedAt: toIso(item.gmpRecordedAt),
    subscriptionTimes: item.subscriptionTimes,
    basisPrice: item.basisPrice,
    priceBasis: item.priceBasis,
    minimumInvestment: item.minimumInvestment,
    gmpFreshness: item.gmpFreshness,
    gmpPercentage: item.gmpPercentage,
    estimatedListingPrice: item.estimatedListingPrice,
    estimatedGainPerShare: item.estimatedGainPerShare,
    estimatedGainPerLot: item.estimatedGainPerLot,
    actualGainPerShare: item.actualGainPerShare,
    actualGainPerLot: item.actualGainPerLot,
    actualGainPercentage: item.actualGainPercentage,
  };
}

export interface IpoGmpHistoryEntry {
  gmp: number;
  gmpPercentage: number | null;
  estimatedListingPrice: number | null;
  recordedAt: Date;
  source: string;
  sourceUpdatedAt: Date | null;
}

export interface IpoSubscriptionEntry {
  qib: number | null;
  nii: number | null;
  niiBig: number | null;
  niiSmall: number | null;
  retail: number | null;
  employee: number | null;
  shareholders: number | null;
  total: number | null;
  subscriptionDate: Date | null;
  source: string;
  sourceUpdatedAt: Date | null;
}

export interface IpoDetail extends IpoListItem {
  symbol: string | null;
  issueSize: number | null;
  faceValue: number | null;
  gmpHistory: IpoGmpHistoryEntry[];
  latestSubscription: IpoSubscriptionEntry | null;
  /** Last official figures of each bidding day (Day 1, Day 2, ...). */
  daywiseSubscription: DaywiseSubscriptionRow[];
  research: IpoResearchData;
  updatedAt: Date;
}

const emptyResearchData: IpoResearchData = {
  minimumInvestment: null,
  listingGain: null,
  logoUrl: null,
  prospectusUrl: null,
  infoUrl: null,
  nseInfoUrl: null,
  bseInfoUrl: null,
  about: null,
  strengths: [],
  risks: [],
  mediaCoverageLinks: [],
  schedule: [],
  subscription: null,
};

export async function getIpoBySlug(slug: string): Promise<IpoDetail | null> {
  const cached = ipoDetailLiveCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const ipo = await prisma.ipo.findUnique({
      where: { slug },
      include: {
        gmps: { orderBy: { recordedAt: "desc" }, take: 30 },
        // Newest first; the history feeds the day-wise table.
        subscriptions: { orderBy: { subscriptionDate: "desc" }, take: 300 },
      },
    });

    if (!ipo) return getLiveIpoBySlug(slug);

    const latestSubscription = ipo.subscriptions[0];
    const listItem = toListItem(ipo, new Date());

    return {
      ...listItem,
      symbol: ipo.symbol,
      faceValue: toNumber(ipo.faceValue),
      // Recomputed against the current price basis so history and the
      // headline estimate always use the same issue price.
      gmpHistory: ipo.gmps.map((gmp) => {
        const value = toNumber(gmp.gmp) as number;
        const figures = deriveIpoFigures(
          { ...figureInputsOf(listItem), gmp: value, gmpSourceUpdatedAt: gmp.sourceUpdatedAt },
          new Date(),
        );
        return {
          gmp: value,
          gmpPercentage: figures.gmpPercentage,
          estimatedListingPrice: figures.estimatedListingPrice,
          recordedAt: gmp.recordedAt,
          source: gmp.source,
          sourceUpdatedAt: gmp.sourceUpdatedAt,
        };
      }),
      latestSubscription: latestSubscription
        ? {
            qib: toNumber(latestSubscription.qib),
            nii: toNumber(latestSubscription.nii),
            niiBig: toNumber(latestSubscription.niiBig),
            niiSmall: toNumber(latestSubscription.niiSmall),
            retail: toNumber(latestSubscription.retail),
            employee: toNumber(latestSubscription.employee),
            shareholders: toNumber(latestSubscription.shareholders),
            total: toNumber(latestSubscription.total),
            subscriptionDate: latestSubscription.subscriptionDate,
            source: latestSubscription.source,
            sourceUpdatedAt: latestSubscription.sourceUpdatedAt,
          }
        : null,
      daywiseSubscription: buildDaywiseSubscription(
        ipo.subscriptions.map((row) => ({
          qib: toNumber(row.qib),
          nii: toNumber(row.nii),
          niiBig: toNumber(row.niiBig),
          niiSmall: toNumber(row.niiSmall),
          retail: toNumber(row.retail),
          employee: toNumber(row.employee),
          shareholders: toNumber(row.shareholders),
          total: toNumber(row.total),
          source: row.source,
          sourceUpdatedAt: row.sourceUpdatedAt,
        })),
        ipo.openDate,
        ipo.closeDate,
      ),
      research: (ipo.researchData as unknown as IpoResearchData | null) ?? emptyResearchData,
      updatedAt: ipo.updatedAt,
    };
  } catch (error) {
    console.warn("Falling back to live provider for IPO detail", error);
    return getLiveIpoBySlug(slug);
  }
}

type IpoWithLatestRecords = Awaited<
  ReturnType<typeof prisma.ipo.findMany<{ include: typeof listItemInclude }>>
>[number];

function toListItem(ipo: IpoWithLatestRecords, now: Date): IpoListItem {
  const latestGmp = ipo.gmps[0];
  const latestSubscription = ipo.subscriptions[0];
  const subscription = pickLatestSubscription(
    ipo.researchData as unknown as IpoResearchData | null,
    latestSubscription
      ? {
          total: toNumber(latestSubscription.total),
          source: latestSubscription.source,
          updatedAt: latestSubscription.sourceUpdatedAt ?? latestSubscription.subscriptionDate,
        }
      : null,
  );

  const base = {
    slug: ipo.slug,
    companyName: ipo.companyName,
    ipoType: ipo.ipoType,
    exchange: ipo.exchange,
    status: computeIpoStatus(ipo),
    priceBandLow: toNumber(ipo.priceBandLow),
    priceBandHigh: toNumber(ipo.priceBandHigh),
    lotSize: ipo.lotSize,
    issueSize: toNumber(ipo.issueSize),
    subscriptionTimes: subscription.times,
    subscriptionSource: subscription.source,
    subscriptionUpdatedAt: subscription.updatedAt,
    subscriptionBreakdown:
      latestSubscription && subscription.source === latestSubscription.source
        ? {
            qib: toNumber(latestSubscription.qib),
            nii: toNumber(latestSubscription.nii),
            niiBig: toNumber(latestSubscription.niiBig),
            niiSmall: toNumber(latestSubscription.niiSmall),
            retail: toNumber(latestSubscription.retail),
            employee: toNumber(latestSubscription.employee),
            shareholders: toNumber(latestSubscription.shareholders),
            total: toNumber(latestSubscription.total),
          }
        : null,
    issuePrice: toNumber(ipo.issuePrice),
    actualListingPrice: toNumber(ipo.actualListingPrice),
    openDate: ipo.openDate,
    closeDate: ipo.closeDate,
    listingDate: ipo.listingDate,
    allotmentDate:
      allotmentDateFromSchedule((ipo.researchData as unknown as IpoResearchData | null)?.schedule) ??
      toDateKey(ipo.allotmentDate),
    registrar: ipo.registrar,
    gmp: latestGmp ? toNumber(latestGmp.gmp) : null,
    gmpSource: latestGmp?.source ?? null,
    gmpSourceUpdatedAt: latestGmp?.sourceUpdatedAt ?? null,
    gmpRecordedAt: latestGmp?.recordedAt ?? null,
  };

  return {
    ...base,
    ...deriveIpoFigures(
      {
        ...base,
        sourceMinimumInvestment: getResearchNumber(ipo.researchData, "minimumInvestment"),
      },
      now,
    ),
  };
}

function figureInputsOf(item: IpoListItem) {
  return {
    issuePrice: item.issuePrice,
    priceBandLow: item.priceBandLow,
    priceBandHigh: item.priceBandHigh,
    lotSize: item.lotSize,
    gmp: item.gmp,
    gmpSourceUpdatedAt: item.gmpSourceUpdatedAt,
    actualListingPrice: item.actualListingPrice,
    sourceMinimumInvestment: item.minimumInvestment,
  };
}

/**
 * The provider's subscription snapshot and the NSE bid-details row can
 * both exist; show whichever the source stamped most recently.
 */
function pickLatestSubscription(
  research: IpoResearchData | null,
  stored: { total: number | null; source: string; updatedAt: Date | null } | null,
): { times: number | null; source: string | null; updatedAt: Date | null } {
  const feedTimes = toNumber(research?.subscription?.timesSubscribed);
  const feed =
    feedTimes !== null
      ? {
          times: feedTimes,
          source: "IPO data feed",
          updatedAt: research?.subscription?.updatedAt
            ? new Date(research.subscription.updatedAt)
            : null,
        }
      : null;
  // A stored 0x is an artefact of NSE's empty SME response, never a real total.
  const nse = stored && stored.total !== null && stored.total > 0
    ? { times: stored.total, source: stored.source, updatedAt: stored.updatedAt }
    : null;

  // The exchanges' own figures (BSE + NSE combined, or NSE's SME total) are
  // the official ones; the feed and older NSE-only rows never replace them.
  if (nse && OFFICIAL_SUBSCRIPTION_SOURCES.has(nse.source)) return nse;
  if (feed && nse) {
    return (nse.updatedAt?.getTime() ?? 0) > (feed.updatedAt?.getTime() ?? 0) ? nse : feed;
  }
  return feed ?? nse ?? { times: null, source: null, updatedAt: null };
}

function liveToListItem(ipo: NormalizedIpo, now: Date): IpoListItem {
  const base = {
    slug: ipo.slug,
    companyName: ipo.companyName,
    ipoType: ipo.ipoType,
    exchange: ipo.exchange,
    status: computeIpoStatus(ipo),
    priceBandLow: ipo.priceBandLow ?? null,
    priceBandHigh: ipo.priceBandHigh ?? null,
    lotSize: ipo.lotSize ?? null,
    issueSize: ipo.issueSize ?? null,
    subscriptionTimes: ipo.research?.subscription?.timesSubscribed ?? null,
    subscriptionSource: ipo.research?.subscription?.timesSubscribed != null ? "IPO data feed" : null,
    subscriptionUpdatedAt: ipo.research?.subscription?.updatedAt
      ? new Date(ipo.research.subscription.updatedAt)
      : null,
    subscriptionBreakdown: null,
    issuePrice: ipo.issuePrice ?? null,
    actualListingPrice: ipo.actualListingPrice ?? null,
    openDate: ipo.openDate ? new Date(ipo.openDate) : null,
    closeDate: ipo.closeDate ? new Date(ipo.closeDate) : null,
    listingDate: ipo.listingDate ? new Date(ipo.listingDate) : null,
    allotmentDate: allotmentDateFromSchedule(ipo.research?.schedule),
    registrar: null,
    // GMP is deliberately not fetched per IPO for list views; that would be
    // one extra API call per row on every cache miss.
    gmp: null,
    gmpSource: null,
    gmpSourceUpdatedAt: null,
    gmpRecordedAt: null,
  };

  return {
    ...base,
    ...deriveIpoFigures(
      { ...base, sourceMinimumInvestment: ipo.research?.minimumInvestment ?? null },
      now,
    ),
  };
}

async function fetchLiveIpoRecords(): Promise<NormalizedIpo[]> {
  if (liveIpoRecordsCache && liveIpoRecordsCache.expiresAt > Date.now()) {
    return liveIpoRecordsCache.value;
  }
  const records = await getIpoDataProvider().fetchIpos();
  liveIpoRecordsCache = { expiresAt: Date.now() + LIVE_CACHE_TTL_MS, value: records };
  return records;
}

async function loadLiveIpoListItems(): Promise<IpoListItemsResult> {
  if (liveListCache && liveListCache.expiresAt > Date.now()) {
    return liveListCache.value;
  }

  try {
    const liveIpos = await fetchLiveIpoRecords();
    const now = new Date();
    const result: IpoListItemsResult = {
      items: dropSupersededAnnouncements(liveIpos.map((ipo) => liveToListItem(ipo, now))),
      liveFeedUnavailable: false,
      liveFeedQuotaExceeded: false,
      servedFromLiveFeed: true,
      dataUpdatedAt: now,
    };
    liveListCache = { expiresAt: Date.now() + LIVE_CACHE_TTL_MS, value: result };
    return result;
  } catch (error) {
    console.warn("Live IPO list fetch failed; returning no records", error);
    const quotaExceeded =
      error instanceof Error &&
      (error.message.includes("ERR:QTAEXCEEDED") || error.message.includes("usage limit"));
    const emptyResult: IpoListItemsResult = {
      items: [],
      liveFeedUnavailable: true,
      liveFeedQuotaExceeded: quotaExceeded,
      servedFromLiveFeed: true,
      dataUpdatedAt: null,
    };
    liveListCache = { expiresAt: Date.now() + 30_000, value: emptyResult };
    return emptyResult;
  }
}

async function getLiveIpoBySlug(slug: string): Promise<IpoDetail | null> {
  try {
    const provider = getIpoDataProvider();
    const liveItems = await fetchLiveIpoRecords();
    const match = liveItems.find((ipo) => ipo.slug === slug);
    if (!match) return null;

    const gmp = await provider.fetchGmp(slug);
    const now = new Date();
    const listItem = liveToListItem(match, now);
    const withGmp: IpoListItem = gmp
      ? {
          ...listItem,
          gmp: gmp.gmp,
          gmpSource: gmp.source,
          gmpSourceUpdatedAt: gmp.sourceUpdatedAt ? new Date(gmp.sourceUpdatedAt) : null,
          gmpRecordedAt: now,
        }
      : listItem;
    const item: IpoListItem = { ...withGmp, ...deriveIpoFigures(figureInputsOf(withGmp), now) };

    const result: IpoDetail = {
      ...item,
      symbol: match.symbol ?? null,
      faceValue: match.faceValue ?? null,
      allotmentDate: item.allotmentDate ?? toDateKey(match.allotmentDate),
      gmpHistory: gmp
        ? [{
            gmp: gmp.gmp,
            gmpPercentage: item.gmpPercentage,
            estimatedListingPrice: item.estimatedListingPrice,
            recordedAt: now,
            source: gmp.source,
            sourceUpdatedAt: item.gmpSourceUpdatedAt,
          }]
        : [],
      latestSubscription: null,
      daywiseSubscription: [],
      research: match.research ?? emptyResearchData,
      updatedAt: now,
    };

    ipoDetailLiveCache.set(slug, { expiresAt: Date.now() + LIVE_CACHE_TTL_MS, value: result });
    return result;
  } catch (error) {
    console.warn("Live IPO detail fetch failed; returning null", error);
    return null;
  }
}

/** A closed issue still has no listing date this long after closing: not an IPO awaiting listing. */
const STALE_CLOSED_DAYS = 10;

/**
 * Lists show listed IPOs for LISTED_HISTORY_DAYS after listing; older ones
 * stay in the database and on their detail pages, just not in lists. Closed
 * records that never got a listing date (rights issues, OFS, bonds) are
 * left out too, instead of sitting in "awaiting listing" for ever.
 */
function withinListedHistory(items: IpoListItem[], now: Date): IpoListItem[] {
  const listedCutoff = now.getTime() - LISTED_HISTORY_DAYS * 86_400_000;
  const closedCutoff = now.getTime() - STALE_CLOSED_DAYS * 86_400_000;
  return items.filter((item) => {
    if (item.status === "LISTED") return !item.listingDate || item.listingDate.getTime() >= listedCutoff;
    if (item.status === "CLOSED" && !item.listingDate) {
      return !item.closeDate || item.closeDate.getTime() >= closedCutoff;
    }
    return true;
  });
}

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function getResearchNumber(value: unknown, ...path: string[]): number | null {
  let current = value;
  for (const key of path) {
    if (typeof current !== "object" || current === null || !(key in current)) {
      return null;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return toNumber(current);
}

function byDateAsc<T>(getter: (item: T) => Date | null) {
  return (a: T, b: T) => (getter(a)?.getTime() ?? Infinity) - (getter(b)?.getTime() ?? Infinity);
}

function byDateDesc<T>(getter: (item: T) => Date | null) {
  return (a: T, b: T) => (getter(b)?.getTime() ?? 0) - (getter(a)?.getTime() ?? 0);
}
