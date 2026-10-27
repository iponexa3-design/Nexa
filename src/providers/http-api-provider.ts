import type { FetchIposOptions, IpoDataProvider } from "@/providers/ipo-data-provider";
import type { MonthlyApiBudget } from "@/utils/api-budget";
import type {
  NormalizedGmp,
  NormalizedIpo,
  NormalizedSubscription,
} from "@/types/ipo";
import { withRetry } from "@/utils/retry";

interface HttpApiProviderConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
  /** IPOAlerts list statuses to fetch, e.g. ["open", "upcoming", "listed"]. */
  statuses?: string[];
  /** Results per page; IPOAlerts allows 1 on the free plan and 3 on the paid plan. */
  pageLimit?: number;
  /** How far back (by listing/close date) to read the "closed" list. */
  closedLookbackDays?: number;
  /** Safety cap on "closed" pages read per fetch (a one-time backfill raises it). */
  closedMaxPages?: number;
  /** Counts every request and stops at the plan's monthly limit. */
  budget?: MonthlyApiBudget;
}

interface IpoAlertsListResponse {
  ipos?: IpoAlertsIpo[];
  meta?: {
    count?: number;
    countOnPage?: number;
    totalPages?: number;
    page?: number;
    limit?: number;
    info?: string;
  };
}

interface IpoAlertsIpo {
  id?: string | number;
  source?: string | null;
  name?: string | null;
  symbol?: string | null;
  type?: string | null;
  typeOfIssue?: string | null;
  slug?: string | null;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  listingDate?: string | null;
  priceRange?: string | null;
  listingGain?: string | null;
  minQty?: number | null;
  minAmount?: number | null;
  issueSize?: string | number | null;
  lotSize?: number | string | null;
  logo?: string | null;
  prospectusUrl?: string | null;
  schedule?: Array<{ event?: string | null; date?: string | null }> | null;
  about?: string | null;
  strengths?: string[] | null;
  risks?: string[] | null;
  mediaCoverageLinks?: string[] | null;
  nseInfoUrl?: string | null;
  bseInfoUrl?: string | null;
  infoUrl?: string | null;
  subscription?: {
    noOfSharesOffered?: number | null;
    noOfsharesBid?: number | null;
    timesSubscribed?: number | null;
    updatedAt?: string | null;
  } | null;
}

interface IpoAlertsGmpResponse {
  ipoId?: string | number;
  symbol?: string | null;
  series?: Array<{ timestamp?: string | null; price?: number | string | null }>;
  meta?: {
    from?: string | null;
    to?: string | null;
    count?: number | null;
  };
}

/**
 * NSE issue information. `activeCat` holds the CONSOLIDATED bids of BSE and
 * NSE (the official subscription figures); `bidDetails` only NSE's own
 * bids, which understates every mainboard IPO and is not used.
 */
interface NseIpoDetailResponse {
  /** NSE's own overall figure; the only one NSE publishes for SME issues. */
  demandGraphALL?: { noOfTimesIssueSubscribed?: string | number } | null;
  activeCat?: {
    /** e.g. "Updated as on 27-Oct-2026 17:00:00" (IST). */
    updateTime?: string;
    dataList?: NseCategoryRow[];
  } | null;
}

interface NseCategoryRow {
  category?: string;
  /** Times subscribed for the category. */
  noOfTotalMeant?: string | number;
}

/** Subscription figures that combine BSE and NSE bids. */
export const CONSOLIDATED_SUBSCRIPTION_SOURCE = "bse+nse";
/** NSE's official overall figure for an SME issue (no category multiples published). */
export const NSE_SME_TOTAL_SOURCE = "nse-sme-total";
/** Sources that are the exchanges' own figures and always win over the IPO feed. */
export const OFFICIAL_SUBSCRIPTION_SOURCES = new Set([CONSOLIDATED_SUBSCRIPTION_SOURCE, NSE_SME_TOTAL_SOURCE]);

// Safety bounds so one refresh can never run away with quota. They are far
// above real list sizes (a few pages each); hitting one is logged loudly.
const MAX_IPO_PAGES_PER_FETCH = 50;
const DEFAULT_MAX_TAIL_PAGES = 40;

// Statuses whose newest records are on the LAST page and are read from the end.
const TAIL_STATUSES = new Set(["closed"]);

const EQUITY_TYPES = new Set(["EQ", "SME", "MAINBOARD"]);

class RateLimitedError extends Error {
  retryAfterMs: number;
  retryable: boolean;
  constructor(retryAfterMs: number, message: string, retryable: boolean) {
    super(message);
    this.retryAfterMs = retryAfterMs;
    this.retryable = retryable;
  }
}

/**
 * Adapter for IPOAlerts-style vendor APIs. The app only consumes the
 * normalized shapes and stays provider-agnostic; this mapping turns the
 * real IPOAlerts response into the project schema.
 */
export class HttpApiProvider implements IpoDataProvider {
  readonly name: string;
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly statuses: string[];
  private readonly pageLimit: number;
  private readonly closedLookbackDays: number;
  private readonly closedMaxPages: number;
  private readonly budget?: MonthlyApiBudget;

  constructor({
    name,
    baseUrl,
    apiKey,
    timeoutMs = 10_000,
    statuses = ["open"],
    pageLimit = 1,
    closedLookbackDays = 21,
    closedMaxPages = DEFAULT_MAX_TAIL_PAGES,
    budget,
  }: HttpApiProviderConfig) {
    this.name = name;
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
    this.statuses = statuses.length > 0 ? statuses : ["open"];
    this.pageLimit = Number.isInteger(pageLimit) && pageLimit > 0 ? pageLimit : 1;
    this.closedLookbackDays =
      Number.isFinite(closedLookbackDays) && closedLookbackDays > 0 ? closedLookbackDays : 21;
    this.closedMaxPages =
      Number.isInteger(closedMaxPages) && closedMaxPages > 0 ? closedMaxPages : DEFAULT_MAX_TAIL_PAGES;
    this.budget = budget;
  }

  /** Requests made this month and the monthly limit (0 = unlimited). */
  apiUsage() {
    return this.budget?.usage() ?? null;
  }

  private async request<T>(pathname: string, params?: Record<string, string | number | boolean>): Promise<T> {
    return withRetry(async () => {
      // Every attempt, retries included, counts against the paid plan.
      this.budget?.consume();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const query = new URLSearchParams();
        for (const [key, value] of Object.entries(params ?? {})) {
          if (value !== undefined && value !== null && value !== "") {
            query.set(key, String(value));
          }
        }

        const url = `${this.baseUrl}${pathname}${query.size ? `?${query.toString()}` : ""}`;
        const headers: Record<string, string> = {
          Accept: "application/json",
          "x-api-key": this.apiKey ?? "",
        };

        const response = await fetch(url, {
          headers,
          signal: controller.signal,
        });

        if (response.status === 429) {
          const retryAfterHeader = response.headers.get("Retry-After");
          let retryAfterMs = retryAfterHeader
            ? Number(retryAfterHeader) * 1000
            : 2000;
          let message = "Rate limited";
          let retryable = true;
          try {
            const body = (await response.json()) as {
              detail?: string;
              error?: string;
              meta?: { expiresIn?: number };
            };
            if (!retryAfterHeader && typeof body.meta?.expiresIn === "number") {
              retryAfterMs = body.meta.expiresIn * 1000;
            }
            if (body.error) message = body.error;
            else if (body.detail) message = body.detail;
            retryable = !(body.error?.includes("ERR:QTAEXCEEDED") ?? false);
          } catch {
            // Keep the header or default retry delay when no JSON body is present.
          }
          throw new RateLimitedError(retryAfterMs, message, retryable);
        }

        if (!response.ok) {
          const error = new Error(
            `${this.name} request to ${pathname} failed with status ${response.status}`,
          );
          // A 4xx (e.g. a parameter the plan does not support) fails the same
          // way every time; retrying would only spend API quota.
          if (response.status >= 400 && response.status < 500) {
            Object.assign(error, { retryable: false });
          }
          throw error;
        }

        return (await response.json()) as T;
      } finally {
        clearTimeout(timeout);
      }
    });
  }

  async fetchIpos(options: FetchIposOptions = {}): Promise<NormalizedIpo[]> {
    // IPOAlerts caps results per page (1 free, 3 paid), so this pages through
    // each status list instead of returning all results in one request.
    // The free plan also rejects every status except "open"; paid plans can
    // add "upcoming,listed" via IPO_API_STATUSES without code changes.
    const unique = new Set<string>();
    const results: NormalizedIpo[] = [];
    let firstError: unknown = null;
    let succeeded = 0;

    const collect = (response: IpoAlertsListResponse) => {
      for (const item of response.ipos ?? []) {
        const normalized = normalizeIpo(item);
        if (!normalized || unique.has(normalized.slug)) continue;
        unique.add(normalized.slug);
        results.push(normalized);
      }
    };
    const fetchPage = (status: string, page: number) =>
      this.request<IpoAlertsListResponse>("/ipos", { status, page, limit: this.pageLimit });

    const skip = new Set(options.skipStatuses ?? []);
    for (const status of this.statuses.filter((item) => !skip.has(item))) {
      try {
        if (TAIL_STATUSES.has(status)) {
          // "closed" holds every past issue, oldest first, so the newest
          // closures (IPOs awaiting listing) are on the last pages. Walk
          // backwards until a whole page is older than the lookback window,
          // so a busy week can never push a recent IPO out of reach.
          const cutoff = Date.now() - this.closedLookbackDays * 86_400_000;
          const isRecent = (item: IpoAlertsIpo) => {
            const time = Date.parse(item.listingDate ?? item.endDate ?? item.startDate ?? "");
            // Undated records cannot be ruled out, so keep them.
            return !Number.isFinite(time) || time >= cutoff;
          };
          const first = await fetchPage(status, 1);
          const totalPages = first.meta?.totalPages ?? 1;
          let pagesRead = 0;
          for (let page = totalPages; page >= 1; page--) {
            if (pagesRead >= this.closedMaxPages) {
              console.warn(`${this.name}: stopped reading "${status}" after ${this.closedMaxPages} pages; older IPOs in the window may be missing`);
              break;
            }
            const response = page === 1 ? first : await fetchPage(status, page);
            pagesRead++;
            const items = response.ipos ?? [];
            collect({ ...response, ipos: items.filter(isRecent) });
            if (items.length > 0 && !items.some(isRecent)) break;
          }
        } else {
          const first = await fetchPage(status, 1);
          collect(first);
          const reported = first.meta?.totalPages ?? 1;
          const totalPages = Math.min(reported, MAX_IPO_PAGES_PER_FETCH);
          if (reported > totalPages) {
            console.warn(`${this.name}: "${status}" has ${reported} pages; only the first ${totalPages} were read`);
          }
          for (let page = 2; page <= totalPages; page++) {
            collect(await fetchPage(status, page));
          }
        }
        succeeded++;
      } catch (error) {
        // One unsupported or failing status must not discard the others.
        console.warn(`${this.name}: fetching "${status}" IPOs failed`, error);
        firstError ??= error;
      }
    }

    if (succeeded === 0 && firstError) throw firstError;
    return results;
  }

  async fetchGmp(ipoSlug: string): Promise<NormalizedGmp | null> {
    try {
      const response = await this.request<IpoAlertsGmpResponse>(`/ipos/${encodeURIComponent(ipoSlug)}/gmp`);
      const latest = response.series?.at(-1);
      if (!latest || latest.price === undefined || latest.price === null) {
        return null;
      }

      const gmpValue = Number(latest.price);
      if (!Number.isFinite(gmpValue)) return null;

      return {
        ipoSlug,
        gmp: gmpValue,
        source: "ipoalerts",
        sourceUpdatedAt: latest.timestamp ?? response.meta?.to ?? null,
      };
    } catch {
      return null;
    }
  }

  async fetchSubscription(
    ipoSlug: string,
    symbol?: string | null,
    ipoType: "MAINBOARD" | "SME" = "MAINBOARD",
  ): Promise<NormalizedSubscription | null> {
    if (!symbol) return null;

    try {
      const response = await withRetry(async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
          const query = new URLSearchParams({ symbol, series: ipoType === "SME" ? "SME" : "EQ" });
          const result = await fetch(
            `https://www.nseindia.com/api/ipo-detail?${query.toString()}`,
            {
              headers: {
                Accept: "application/json, text/plain, */*",
                "Accept-Language": "en-US,en;q=0.9",
                Referer: "https://www.nseindia.com/market-data/issue-information",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
              },
              signal: controller.signal,
            },
          );
          if (!result.ok) {
            throw new Error(`NSE subscription request failed with status ${result.status}`);
          }
          return (await result.json()) as NseIpoDetailResponse;
        } finally {
          clearTimeout(timeout);
        }
      });

      const fetchedAt = new Date().toISOString();
      // NSE's own timestamp, so the site shows when the figures are from.
      const sourceUpdatedAt = parseNseUpdateTime(response.activeCat?.updateTime) ?? fetchedAt;
      const rows = response.activeCat?.dataList ?? [];
      const qib = findNseCategory(rows, /^Qualified Institutional Buyers/i);
      const nii = findNseCategory(rows, /^Non Institutional Investors$/i);
      const niiBig = findNseCategory(rows, /^Non Institutional Investors\s*\(Bid amount of more than Ten Lakh/i);
      const niiSmall = findNseCategory(rows, /^Non Institutional Investors\s*\(Bid amount of more than Two Lakh/i);
      const retail = findNseCategory(rows, /^Retail Individual Investors/i);
      const employee = findNseCategory(rows, /^Employees$/i);
      const shareholders = findNseCategory(rows, /^Shareholders$/i);
      const total = findNseCategory(rows, /^Total$/i);

      // SME issues: NSE publishes only the overall figure (shares offered
      // per category are not given), so store that alone.
      if (ipoType === "SME") {
        const overall = parseNseRatio(response.demandGraphALL?.noOfTimesIssueSubscribed);
        if (overall === null || overall <= 0) return null;
        return {
          ipoSlug,
          qib: null,
          nii: null,
          niiBig: null,
          niiSmall: null,
          retail: null,
          employee: null,
          shareholders: null,
          total: overall,
          subscriptionDate: fetchedAt,
          source: NSE_SME_TOTAL_SOURCE,
          sourceUpdatedAt,
        };
      }
      if (!qib && !nii && !retail) return null;

      const ratios = {
        qib: parseNseRatio(qib?.noOfTotalMeant),
        nii: parseNseRatio(nii?.noOfTotalMeant),
        niiBig: parseNseRatio(niiBig?.noOfTotalMeant),
        niiSmall: parseNseRatio(niiSmall?.noOfTotalMeant),
        retail: parseNseRatio(retail?.noOfTotalMeant),
        employee: parseNseRatio(employee?.noOfTotalMeant),
        shareholders: parseNseRatio(shareholders?.noOfTotalMeant),
        total: parseNseRatio(total?.noOfTotalMeant),
      };
      // All zero means "no data yet", not "nobody applied".
      if (!Object.values(ratios).some((value) => value !== null && value > 0)) return null;

      return {
        ipoSlug,
        ...ratios,
        subscriptionDate: fetchedAt,
        source: CONSOLIDATED_SUBSCRIPTION_SOURCE,
        sourceUpdatedAt,
      };
    } catch {
      return null;
    }
  }
}

const MONTHS: Record<string, string> = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
  JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};

/** "Updated as on 27-Oct-2026 17:00:09 hrs" (IST) as an ISO timestamp, or null. */
export function parseNseUpdateTime(text: string | null | undefined): string | null {
  const match = /(\d{1,2})-([A-Za-z]{3})-(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(text ?? "");
  const month = match ? MONTHS[match[2].toUpperCase()] : undefined;
  if (!match || !month) return null;
  const [, day, , year, hour, minute, second = "00"] = match;
  const date = new Date(`${year}-${month}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:${second}+05:30`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function findNseCategory(rows: NseCategoryRow[], category: RegExp) {
  return rows.find((row) => category.test(row.category?.trim() ?? ""));
}

function parseNseRatio(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === "" || value === "-") {
    return null;
  }
  const ratio = Number(value);
  return Number.isFinite(ratio) && ratio >= 0 ? ratio : null;
}

function normalizeIpo(item: IpoAlertsIpo): NormalizedIpo | null {
  const slug = item.slug?.trim();
  const name = item.name?.trim();
  if (!slug || !name) return null;
  // The feed also carries debt/bond issues (e.g. type "DEBT"); only equity
  // (EQ) and SME IPOs belong on the tracker. Announced IPOs have no type yet.
  const type = item.type?.trim().toUpperCase();
  if (type && !EQUITY_TYPES.has(type)) return null;
  // The closed list also carries rights issues, offers for sale and bonds by
  // already-listed companies. IPOs are tagged typeOfIssue "IPO"; a dated
  // record with no tag and no listing date is one of those other issues.
  const issueKind = item.typeOfIssue?.trim().toUpperCase();
  if (issueKind && issueKind !== "IPO") return null;
  if (!issueKind && item.startDate && !item.listingDate) return null;

  const price = parsePriceRange(item.priceRange);

  return {
    companyName: name,
    slug,
    symbol: item.symbol ?? null,
    ipoType: normalizeIpoType(item.type),
    exchange: normalizeExchange(item.source),
    priceBandLow: price.low,
    priceBandHigh: price.high,
    issueSize: parseNumber(item.issueSize),
    lotSize: parseNumber(item.lotSize ?? item.minQty),
    openDate: item.startDate ?? null,
    closeDate: item.endDate ?? null,
    listingDate: item.listingDate ?? null,
    faceValue: null,
    // IPOAlerts only reports the price range. A band (e.g. 275-289) has no
    // final issue price until allotment, so only a fixed price is stored as one.
    issuePrice: price.low !== null && price.low === price.high ? price.low : null,
    research: {
      minimumInvestment: item.minAmount ?? null,
      listingGain: item.listingGain ?? null,
      logoUrl: item.logo ?? null,
      prospectusUrl: item.prospectusUrl ?? null,
      infoUrl: item.infoUrl ?? null,
      nseInfoUrl: item.nseInfoUrl ?? null,
      bseInfoUrl: item.bseInfoUrl ?? null,
      about: item.about ?? null,
      strengths: item.strengths ?? [],
      risks: item.risks ?? [],
      mediaCoverageLinks: item.mediaCoverageLinks ?? [],
      schedule: (item.schedule ?? []).flatMap((entry) =>
        entry.event && entry.date ? [{ event: entry.event, date: entry.date }] : [],
      ),
      subscription: item.subscription
        ? {
            sharesOffered: item.subscription.noOfSharesOffered ?? null,
            sharesBid: item.subscription.noOfsharesBid ?? null,
            timesSubscribed: item.subscription.timesSubscribed ?? null,
            updatedAt: item.subscription.updatedAt ?? null,
          }
        : null,
    },
  };
}

function normalizeExchange(source: string | null | undefined): string {
  switch ((source ?? "").trim().toLowerCase()) {
    case "nse":
      return "NSE";
    case "bse":
      return "BSE";
    case "nse,bse":
    case "bse,nse":
      return "NSE, BSE";
    default:
      return "NSE, BSE";
  }
}

function normalizeIpoType(type: string | null | undefined): NormalizedIpo["ipoType"] {
  const normalized = (type ?? "").trim().toUpperCase();
  if (normalized === "SME") return "SME";
  return "MAINBOARD";
}

function parsePriceRange(value: string | null | undefined): {
  low: number | null;
  high: number | null;
} {
  if (!value) return { low: null, high: null };
  const match = value.match(/(\d+(?:\.\d+)?)/g);
  if (!match || match.length < 2) {
    const single = parseNumber(value);
    return { low: single, high: single };
  }

  const low = parseNumber(match[0]);
  const high = parseNumber(match[1]);
  return { low, high };
}

function parseNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  const match = text.match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}
