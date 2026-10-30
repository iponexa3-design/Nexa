/** Prefix of GMP sources entered by hand with `npm run gmp:set`. */
export const MANUAL_GMP_PREFIX = "manual:";

/** Stored GMP source code for a manual entry, e.g. "manual:InvestorGain". */
export function manualGmpSource(publisher: string): string {
  return `${MANUAL_GMP_PREFIX}${publisher.trim()}`;
}

/** Readable GMP source for visitors ("IPO Alert", "Entered manually from InvestorGain"). */
export function gmpSourceLabel(source: string | null | undefined): string {
  if (!source) return "Not available";
  if (source === "ipoalerts") return "IPO Alert";
  if (source.startsWith(MANUAL_GMP_PREFIX)) {
    const publisher = source.slice(MANUAL_GMP_PREFIX.length).trim();
    return publisher ? `Entered manually from ${publisher}` : "Entered manually";
  }
  return source;
}
