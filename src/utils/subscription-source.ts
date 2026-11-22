/** Prefix of subscription figures entered by hand with `npm run subscription:set`. */
export const MANUAL_SUBSCRIPTION_PREFIX = "manual:";

/** Stored source code for a manual entry, e.g. "manual:BSE". */
export function manualSubscriptionSource(publisher: string): string {
  return `${MANUAL_SUBSCRIPTION_PREFIX}${publisher.trim()}`;
}

export function isManualSubscriptionSource(source: string | null | undefined): boolean {
  return source?.startsWith(MANUAL_SUBSCRIPTION_PREFIX) ?? false;
}

/** Readable name of a stored subscription source. */
export function subscriptionSourceLabel(source: string | null | undefined, short = false): string {
  if (isManualSubscriptionSource(source)) {
    const publisher = source!.slice(MANUAL_SUBSCRIPTION_PREFIX.length).trim();
    if (short) return publisher ? `${publisher} (manual)` : "Manual";
    return publisher ? `Entered manually from ${publisher}` : "Entered manually";
  }
  switch (source) {
    case "bse+nse":
      return short ? "BSE + NSE" : "BSE + NSE combined (from NSE)";
    case "nse-sme-total":
      return short ? "NSE (total only)" : "NSE official total (category figures not published for SME issues)";
    case "nse":
      return "NSE bids only";
    case null:
    case undefined:
      return "Not available";
    default:
      return source === "IPO data feed" ? (short ? "IPO Alert" : "IPO Alert data feed") : source;
  }
}
