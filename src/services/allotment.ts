import type { ComputedIpoStatus } from "@/utils/ipo-status";
import { getIndiaDateKey, toDateKey } from "@/utils/ipo-status";
import type { IpoScheduleItem } from "@/types/ipo";

export interface AllotmentSite {
  key: string;
  name: string;
  url: string;
}

interface RegistrarSite extends AllotmentSite {
  /** Matches the registrar name as NSE writes it (spellings vary). */
  match: RegExp;
}

/** Official allotment-status pages of the registrars that handle most Indian IPOs. */
export const REGISTRARS: RegistrarSite[] = [
  { key: "kfin", name: "KFin Technologies", url: "https://ipostatus.kfintech.com/", match: /\bk\s*fin/i },
  {
    key: "mufg",
    name: "MUFG Intime (Link Intime)",
    url: "https://in.mpms.mufg.com/Initial_Offer/public-issues.html",
    match: /mufg|link\s*intime/i,
  },
  { key: "bigshare", name: "Bigshare Services", url: "https://ipo.bigshareonline.com/IPO_Status.html", match: /big\s*share/i },
  { key: "skyline", name: "Skyline Financial Services", url: "https://www.skylinerta.com/ipo.php", match: /skyline/i },
  { key: "cameo", name: "Cameo Corporate Services", url: "https://ipostatus1.cameoindia.com/", match: /cameo/i },
  { key: "purva", name: "Purva Sharegistry", url: "https://www.purvashare.com/investor-service/ipo-query", match: /purva/i },
  { key: "maashitla", name: "Maashitla Securities", url: "https://maashitla.com/allotment-status/public-issues", match: /maashitla/i },
  { key: "mas", name: "MAS Services", url: "https://www.masserv.com/opt.asp", match: /^\s*mas\s+serv/i },
];

/** The exchanges' own allotment check works for every IPO listed there. */
export const EXCHANGE_ALLOTMENT: Record<"BSE" | "NSE", AllotmentSite> = {
  BSE: { key: "bse", name: "BSE", url: "https://www.bseindia.com/investors/appli_check.aspx" },
  NSE: { key: "nse", name: "NSE", url: "https://www.nseindia.com/invest/check-trades-bids-verify-ipo-bids" },
};

/** The registrar's allotment page for a registrar name, or null when it is not one we link to. */
export function findRegistrar(name: string | null | undefined): AllotmentSite | null {
  if (!name?.trim()) return null;
  const site = REGISTRARS.find((registrar) => registrar.match.test(name));
  return site ? { key: site.key, name: site.name, url: site.url } : null;
}

/**
 * Exchanges whose allotment check applies. Mainboard IPOs list on both BSE
 * and NSE (the feed names only one); SME IPOs only on the exchange named.
 */
export function allotmentExchanges(exchange: string, ipoType: "MAINBOARD" | "SME"): AllotmentSite[] {
  if (ipoType === "MAINBOARD") return [EXCHANGE_ALLOTMENT.BSE, EXCHANGE_ALLOTMENT.NSE];
  const text = exchange.toUpperCase();
  const sites = (["BSE", "NSE"] as const).filter((code) => text.includes(code)).map((code) => EXCHANGE_ALLOTMENT[code]);
  // Unknown exchange text: offer both rather than nothing.
  return sites.length > 0 ? sites : [EXCHANGE_ALLOTMENT.BSE, EXCHANGE_ALLOTMENT.NSE];
}

/** The "basis of allotment" date from the issue schedule, as YYYY-MM-DD. */
export function allotmentDateFromSchedule(schedule: IpoScheduleItem[] | null | undefined): string | null {
  const entry = schedule?.find((item) => /allot/i.test(item.event) && !/lock/i.test(item.event));
  return entry ? toDateKey(entry.date) : null;
}

export type AllotmentStage = "out" | "today" | "pending" | "due";

export interface AllotmentCandidate {
  status: ComputedIpoStatus;
  allotmentDate: string | null;
  listingDate: Date | string | null;
}

/** Listed IPOs stay on the allotment page this long after listing. */
export const ALLOTMENT_LISTED_DAYS = 10;

/**
 * Where an IPO is in the allotment process, or null when it does not belong
 * on the allotment page (not open yet, or listed long ago).
 */
export function allotmentStage(ipo: AllotmentCandidate, now: Date): AllotmentStage | null {
  const today = getIndiaDateKey(now);
  if (ipo.status === "UPCOMING") return null;
  if (ipo.status === "LISTED") {
    const listed = toDateKey(ipo.listingDate);
    const cutoff = getIndiaDateKey(new Date(now.getTime() - ALLOTMENT_LISTED_DAYS * 86_400_000));
    return listed !== null && listed >= cutoff ? "out" : null;
  }
  if (ipo.allotmentDate === null) return ipo.status === "CLOSED" ? "due" : "pending";
  if (ipo.allotmentDate === today) return "today";
  return ipo.allotmentDate < today ? "out" : "pending";
}

const stageOrder: Record<AllotmentStage, number> = { today: 0, out: 1, due: 2, pending: 3 };

/**
 * IPOs for the allotment page: allotment today first, then allotment out
 * (newest first), then those waiting for allotment (soonest first).
 */
export function selectAllotmentIpos<T extends AllotmentCandidate>(
  ipos: T[],
  now: Date,
): Array<T & { stage: AllotmentStage }> {
  // Undated IPOs sort after dated ones in their group.
  const key = (ipo: T) => ipo.allotmentDate ?? toDateKey(ipo.listingDate) ?? "9999-12-31";
  return ipos
    .flatMap((ipo) => {
      const stage = allotmentStage(ipo, now);
      return stage ? [{ ...ipo, stage }] : [];
    })
    .sort((a, b) => {
      if (a.stage !== b.stage) return stageOrder[a.stage] - stageOrder[b.stage];
      const order = key(a).localeCompare(key(b));
      return a.stage === "out" ? -order : order;
    });
}
