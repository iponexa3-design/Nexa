/** Readable name of a stored subscription source. */
export function subscriptionSourceLabel(source: string | null | undefined, short = false): string {
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
