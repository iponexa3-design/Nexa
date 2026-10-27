/**
 * NSE's public "issue information" for an IPO (free, no API key). Used for
 * the registrar to the issue, which the IPO feed does not provide.
 */

interface NseIpoDetailResponse {
  issueInfo?: { dataList?: Array<{ title?: string | null; value?: unknown }> | null } | null;
}

const NSE_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.nseindia.com/market-data/issue-information",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
};

/** "Name of the Registrar" from an NSE issue-information response. */
export function registrarFromIssueInfo(response: NseIpoDetailResponse | null | undefined): string | null {
  const row = response?.issueInfo?.dataList?.find((item) => /name of the registrar/i.test(item.title ?? ""));
  const value = typeof row?.value === "string" ? row.value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";
  return value && value !== "-" ? value.slice(0, 120) : null;
}

/**
 * The registrar NSE lists for an IPO symbol, trying each series in turn
 * (mainboard IPOs are "EQ", SME IPOs "SME"). Null when NSE has no such issue.
 */
export async function fetchNseRegistrar(
  symbol: string,
  series: string[],
  timeoutMs = 15_000,
): Promise<string | null> {
  for (const code of series) {
    const query = new URLSearchParams({ symbol, series: code });
    const response = await fetch(`https://www.nseindia.com/api/ipo-detail?${query.toString()}`, {
      headers: NSE_HEADERS,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) continue;
    const registrar = registrarFromIssueInfo((await response.json()) as NseIpoDetailResponse);
    if (registrar) return registrar;
  }
  return null;
}
