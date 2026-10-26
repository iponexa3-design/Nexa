/**
 * Pure summaries behind the homepage's calendar strip and listing
 * scorecard. Dates are compared as IST calendar days.
 */

export type CalendarEventType = "opens" | "closes" | "lists";

export interface CalendarEvent {
  type: CalendarEventType;
  slug: string;
  companyName: string;
}

export interface CalendarDay {
  /** YYYY-MM-DD in IST. */
  dateKey: string;
  isToday: boolean;
  events: CalendarEvent[];
}

interface DatedIpo {
  slug: string;
  companyName: string;
  openDate: Date | null;
  closeDate: Date | null;
  listingDate: Date | null;
}

const EVENT_ORDER: Record<CalendarEventType, number> = { lists: 0, opens: 1, closes: 2 };

/** The next `days` IST calendar days (today first) with every open/close/listing event. */
export function buildWeekCalendar(ipos: DatedIpo[], now: Date, days = 7): CalendarDay[] {
  const todayKey = toIstDateKey(now);
  const calendar: CalendarDay[] = Array.from({ length: days }, (_, offset) => {
    const dateKey = addDays(todayKey, offset);
    return { dateKey, isToday: offset === 0, events: [] };
  });
  const byKey = new Map(calendar.map((day) => [day.dateKey, day]));

  for (const ipo of ipos) {
    const events: Array<[CalendarEventType, Date | null]> = [
      ["opens", ipo.openDate],
      ["closes", ipo.closeDate],
      ["lists", ipo.listingDate],
    ];
    for (const [type, date] of events) {
      if (!date) continue;
      byKey.get(toIstDateKey(date))?.events.push({ type, slug: ipo.slug, companyName: ipo.companyName });
    }
  }

  for (const day of calendar) {
    day.events.sort(
      (a, b) => EVENT_ORDER[a.type] - EVENT_ORDER[b.type] || a.companyName.localeCompare(b.companyName),
    );
  }
  return calendar;
}

interface ListedIpo {
  slug: string;
  companyName: string;
  listingDate: Date | null;
  actualListingPrice: number | null;
  actualGainPercentage: number | null;
}

export interface ListingScorecard {
  windowDays: number;
  /** Listed IPOs in the window that have a reported listing price. */
  count: number;
  positive: number;
  negative: number;
  averageGainPercentage: number | null;
  /** Most recent first. */
  results: Array<{ slug: string; companyName: string; listingDate: Date; gainPercentage: number }>;
}

/** Actual listing outcomes over the last `windowDays`; only real listing prices count. */
export function summarizeListings(ipos: ListedIpo[], now: Date, windowDays = 30): ListingScorecard {
  const since = now.getTime() - windowDays * 86_400_000;
  const results = ipos
    .flatMap((ipo) =>
      ipo.listingDate &&
      ipo.listingDate.getTime() <= now.getTime() &&
      ipo.listingDate.getTime() >= since &&
      ipo.actualListingPrice !== null &&
      ipo.actualGainPercentage !== null
        ? [{
            slug: ipo.slug,
            companyName: ipo.companyName,
            listingDate: ipo.listingDate,
            gainPercentage: ipo.actualGainPercentage,
          }]
        : [],
    )
    .sort((a, b) => b.listingDate.getTime() - a.listingDate.getTime());

  const total = results.reduce((sum, result) => sum + result.gainPercentage, 0);
  return {
    windowDays,
    count: results.length,
    positive: results.filter((result) => result.gainPercentage > 0).length,
    negative: results.filter((result) => result.gainPercentage < 0).length,
    averageGainPercentage: results.length > 0 ? total / results.length : null,
    results,
  };
}

function toIstDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** IPO cards on the homepage; everything else is one click away in the GMP Tracker. */
export const HOMEPAGE_IPO_LIMIT = 12;

/**
 * Shares `limit` places between lists in priority order: the first list takes
 * as many as it has, the next gets what is left, and so on.
 */
export function takeInOrder<T>(lists: T[][], limit: number): T[][] {
  let left = Math.max(0, limit);
  return lists.map((list) => {
    const taken = list.slice(0, left);
    left -= taken.length;
    return taken;
  });
}
