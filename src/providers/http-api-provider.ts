import type { IpoDataProvider } from "@/providers/ipo-data-provider";
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

interface NseIpoBidDetailsResponse {
  data?: Array<{
    category?: string;
    noOfTime?: string | number;
    noOfSharesOffered?: string | number;
    noOfsharesBid?: string | number;
  }>;
}

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

  constructor({
    name,
    baseUrl,
    apiKey,
    timeoutMs = 10_000,
    statuses = ["open"],
    pageLimit = 1,
    closedLookbackDays = 21,
    closedMaxPages = DEFAULT_MAX_TAIL_PAGES,
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
  }

  private async request<T>(pathname: string, params?: Record<string, string | number | boolean>): Promise<T> {
    return withRetry(async () => {
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

  async fetchIpos(): Promise<NormalizedIpo[]> {
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

    for (const status of this.statuses) {
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
  ): Promise<NormalizedSubscription | null> {
    if (!symbol) return null;

    try {
      const response = await withRetry(async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
          const query = new URLSearchParams({ symbol, series: "EQ" });
          const result = await fetch(
            `https://www.nseindia.com/api/ipo-bid-details?${query.toString()}`,
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
          return (await result.json()) as NseIpoBidDetailsResponse;
        } finally {
          clearTimeout(timeout);
        }
      });

      const rows = response.data ?? [];
      const qib = findNseCategory(rows, /^Qualified Institutional Buyers/i);
      const nii = findNseCategory(rows, /^Non Institutional Investors$/i);
      const retail = findNseCategory(rows, /^Retail Individual Investors/i);
      const employee = findNseCategory(rows, /^Employees$/i);
      const total = findNseCategory(rows, /^Total$/i);
      if (!qib && !nii && !retail) return null;

      const ratios = {
        qib: parseNseRatio(qib?.noOfTime),
        nii: parseNseRatio(nii?.noOfTime),
        retail: parseNseRatio(retail?.noOfTime),
        employee: parseNseRatio(employee?.noOfTime),
        total: parseNseRatio(total?.noOfTime),
      };
      // NSE answers an SME symbol queried as series EQ with all-zero rows;
      // that means "no data", not "nobody applied".
      if (!Object.values(ratios).some((value) => value !== null && value > 0)) return null;

      const updatedAt = new Date().toISOString();
      return {
        ipoSlug,
        ...ratios,
        subscriptionDate: updatedAt,
        source: "nse",
        sourceUpdatedAt: updatedAt,
      };
    } catch {
      return null;
    }
  }
}

function findNseCategory(
  rows: NonNullable<NseIpoBidDetailsResponse["data"]>,
  category: RegExp,
) {
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
