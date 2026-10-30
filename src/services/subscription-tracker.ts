import type { ComputedIpoStatus } from "@/utils/ipo-status";
import type { SubscriptionFigures } from "@/services/subscription-history";

export type SubscriptionTab = "all" | "open" | "closed" | "listed";

/** One IPO in the subscription tracker; plain values so it can be sent to the browser. */
export interface SubscriptionTrackerRow {
  slug: string;
  companyName: string;
  ipoType: "MAINBOARD" | "SME";
  exchange: string;
  status: Exclude<ComputedIpoStatus, "UPCOMING">;
  openDate: string | null;
  closeDate: string | null;
  listingDate: string | null;
  /** Category figures; null when only an overall figure is known. */
  breakdown: SubscriptionFigures | null;
  total: number | null;
  source: string | null;
  updatedAt: string | null;
}

export interface SubscriptionSourceItem {
  slug: string;
  companyName: string;
  ipoType: "MAINBOARD" | "SME";
  exchange: string;
  status: ComputedIpoStatus;
  openDate: Date | null;
  closeDate: Date | null;
  listingDate: Date | null;
  subscriptionTimes: number | null;
  subscriptionSource: string | null;
  subscriptionUpdatedAt: Date | null;
  subscriptionBreakdown: SubscriptionFigures | null;
}

const statusOrder: Record<SubscriptionTrackerRow["status"], number> = { OPEN: 0, CLOSED: 1, LISTED: 2 };

const time = (value: string | null) => (value ? Date.parse(value) : NaN);

/**
 * IPOs that have opened for bidding (open, awaiting listing, recently
 * listed), open ones closing soonest first, then those awaiting listing and
 * then listed ones, newest first.
 */
export function buildSubscriptionRows(items: SubscriptionSourceItem[]): SubscriptionTrackerRow[] {
  const rows = items.flatMap((item): SubscriptionTrackerRow[] =>
    item.status === "UPCOMING"
      ? []
      : [
          {
            slug: item.slug,
            companyName: item.companyName,
            ipoType: item.ipoType,
            exchange: item.exchange,
            status: item.status,
            openDate: item.openDate?.toISOString() ?? null,
            closeDate: item.closeDate?.toISOString() ?? null,
            listingDate: item.listingDate?.toISOString() ?? null,
            breakdown: item.subscriptionBreakdown,
            total: item.subscriptionTimes,
            source: item.subscriptionSource,
            updatedAt: item.subscriptionUpdatedAt?.toISOString() ?? null,
          },
        ],
  );
  return rows.sort((a, b) => {
    if (a.status !== b.status) return statusOrder[a.status] - statusOrder[b.status];
    if (a.status === "OPEN") return (time(a.closeDate) || Infinity) - (time(b.closeDate) || Infinity);
    const key = (row: SubscriptionTrackerRow) => time(row.status === "LISTED" ? row.listingDate : row.closeDate) || 0;
    return key(b) - key(a) || a.companyName.localeCompare(b.companyName);
  });
}

export function rowsForTab(rows: SubscriptionTrackerRow[], tab: SubscriptionTab): SubscriptionTrackerRow[] {
  if (tab === "all") return rows;
  const status = tab === "open" ? "OPEN" : tab === "closed" ? "CLOSED" : "LISTED";
  return rows.filter((row) => row.status === status);
}
