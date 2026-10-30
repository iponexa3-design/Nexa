/**
 * NSE's public "issue information" for an IPO (free, no API key). Used for
 * details the IPO feed does not always provide: the registrar to the issue
 * and the lot size.
 */

interface NseIpoDetailResponse {
  issueInfo?: { dataList?: Array<{ title?: string | null; value?: unknown }> | null } | null;
}

export interface NseIssueInfo {
  registrar: string | null;
  lotSize: number | null;
}

const NSE_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.nseindia.com/market-data/issue-information",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
};

function issueInfoValue(response: NseIpoDetailResponse | null | undefined, title: RegExp): string {
  const row = response?.issueInfo?.dataList?.find((item) => title.test(item.title ?? ""));
  return typeof row?.value === "string" ? row.value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";
}

/** "Name of the Registrar" from an NSE issue-information response. */
export function registrarFromIssueInfo(response: NseIpoDetailResponse | null | undefined): string | null {
  const value = issueInfoValue(response, /name of the registrar/i);
  return value && value !== "-" ? value.slice(0, 120) : null;
}

/** Shares per lot from "Bid Lot" ("182 Equity Shares and in multiples thereof") or the minimum order. */
export function lotSizeFromIssueInfo(response: NseIpoDetailResponse | null | undefined): number | null {
  for (const title of [/^bid lot/i, /^minimum order quantity/i]) {
    const match = /^([\d,]+)\s*(equity\s+)?shares?/i.exec(issueInfoValue(response, title));
    const shares = match ? Number(match[1].replace(/,/g, "")) : NaN;
    if (Number.isInteger(shares) && shares > 0 && shares < 1_000_000) return shares;
  }
  return null;
}

/**
 * Registrar and lot size NSE lists for an IPO symbol, trying each series in
 * turn (mainboard IPOs are "EQ", SME IPOs "SME"). Null when NSE has no such issue.
 */
export async function fetchNseIssueInfo(
  symbol: string,
  series: string[],
  timeoutMs = 15_000,
): Promise<NseIssueInfo | null> {
  for (const code of series) {
    const query = new URLSearchParams({ symbol, series: code });
    const response = await fetch(`https://www.nseindia.com/api/ipo-detail?${query.toString()}`, {
      headers: NSE_HEADERS,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) continue;
    const body = (await response.json()) as NseIpoDetailResponse;
    const info = { registrar: registrarFromIssueInfo(body), lotSize: lotSizeFromIssueInfo(body) };
    if (info.registrar || info.lotSize) return info;
  }
  return null;
}
