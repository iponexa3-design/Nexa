import { OFFICIAL_SUBSCRIPTION_SOURCES } from "@/providers/http-api-provider";
import { isManualSubscriptionSource } from "@/utils/subscription-source";
import { getIndiaDateKey, toDateKey } from "@/utils/ipo-status";

export interface SubscriptionFigures {
  qib: number | null;
  nii: number | null;
  niiBig: number | null;
  niiSmall: number | null;
  retail: number | null;
  employee: number | null;
  shareholders: number | null;
  total: number | null;
}

export interface SubscriptionSnapshot extends SubscriptionFigures {
  source: string;
  sourceUpdatedAt: Date | null;
}

export interface DaywiseSubscriptionRow extends SubscriptionFigures {
  /** Bidding day, YYYY-MM-DD (IST). */
  date: string;
  /** 1 for the opening day; counts weekdays, as bidding happens Monday to Friday. */
  day: number;
  updatedAt: Date;
}

/** Weekdays from `from` to `to` (YYYY-MM-DD), both included. */
function weekdaysBetween(from: string, to: string): number {
  let count = 0;
  for (let time = Date.parse(`${from}T00:00:00Z`); time <= Date.parse(`${to}T00:00:00Z`); time += 86_400_000) {
    const weekday = new Date(time).getUTCDay();
    if (weekday !== 0 && weekday !== 6) count++;
  }
  return count;
}

/**
 * One row per bidding day: the last official snapshot (the exchanges' own
 * figures, never the IPO feed) taken that IST day between opening and
 * closing. Days without a stored snapshot are left out rather than guessed.
 */
export function buildDaywiseSubscription(
  snapshots: SubscriptionSnapshot[],
  openDate: Date | string | null,
  closeDate: Date | string | null,
): DaywiseSubscriptionRow[] {
  const opens = toDateKey(openDate);
  const closes = toDateKey(closeDate);
  if (!opens || !closes) return [];

  const latestByDay = new Map<string, SubscriptionSnapshot & { sourceUpdatedAt: Date }>();
  for (const snapshot of snapshots) {
    const usable = OFFICIAL_SUBSCRIPTION_SOURCES.has(snapshot.source) || isManualSubscriptionSource(snapshot.source);
    if (!snapshot.sourceUpdatedAt || !usable) continue;
    const date = getIndiaDateKey(snapshot.sourceUpdatedAt);
    if (date < opens || date > closes) continue;
    const current = latestByDay.get(date);
    if (!current || snapshot.sourceUpdatedAt > current.sourceUpdatedAt) {
      latestByDay.set(date, { ...snapshot, sourceUpdatedAt: snapshot.sourceUpdatedAt });
    }
  }

  return [...latestByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, snapshot]) => ({
      date,
      day: weekdaysBetween(opens, date),
      updatedAt: snapshot.sourceUpdatedAt,
      qib: snapshot.qib,
      nii: snapshot.nii,
      niiBig: snapshot.niiBig,
      niiSmall: snapshot.niiSmall,
      retail: snapshot.retail,
      employee: snapshot.employee,
      shareholders: snapshot.shareholders,
      total: snapshot.total,
    }));
}
