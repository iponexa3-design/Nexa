import Link from "next/link";
import type { CalendarDay, CalendarEventType } from "@/services/homepage-insights";

/* ------------------------------------------------------------------ */
/* This week: every open, close and listing over the next 7 days.      */
/* ------------------------------------------------------------------ */

const eventStyles: Record<CalendarEventType, { label: string; chip: string }> = {
  lists: { label: "Lists", chip: "bg-amber-50 text-amber-800 ring-amber-200" },
  opens: { label: "Opens", chip: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  closes: { label: "Closes", chip: "bg-zinc-100 text-zinc-700 ring-zinc-200" },
};

const weekdayFormatter = new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" });
const dayFormatter = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

export function WeekCalendar({ days }: { days: CalendarDay[] }) {
  const total = days.reduce((sum, day) => sum + day.events.length, 0);

  return (
    <section aria-labelledby="week-heading" className="mb-12">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 id="week-heading" className="text-xl font-bold tracking-tight text-zinc-900">This week in IPOs</h2>
          <p className="text-sm text-zinc-500">
            {total > 0 ? `${total} openings, closings and listings over the next 7 days.` : "No IPO events in the next 7 days."}
          </p>
        </div>
        <div className="hidden gap-2 text-[11px] font-semibold sm:flex">
          {(Object.keys(eventStyles) as CalendarEventType[]).map((type) => (
            <span key={type} className={`rounded-full px-2 py-0.5 ring-1 ring-inset ${eventStyles[type].chip}`}>
              {eventStyles[type].label}
            </span>
          ))}
        </div>
      </div>
      <ol className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-7 sm:overflow-visible sm:px-0">
        {days.map((day) => {
          const date = new Date(`${day.dateKey}T00:00:00Z`);
          return (
            <li
              key={day.dateKey}
              className={`flex min-h-36 w-40 shrink-0 snap-start flex-col rounded-2xl border p-3 sm:w-auto ${
                day.isToday ? "border-[#4f8f93] bg-[#eef6f5]" : "border-[#dce7e5] bg-white"
              }`}
            >
              <p className="flex items-baseline justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-600">
                  {day.isToday ? "Today" : weekdayFormatter.format(date)}
                </span>
                <span className="text-xs font-semibold text-zinc-700">{dayFormatter.format(date)}</span>
              </p>
              {day.events.length > 0 ? (
                <ul className="mt-2.5 space-y-1.5">
                  {day.events.map((event) => (
                    <li key={`${event.type}-${event.slug}`}>
                      <Link
                        href={`/ipo/${event.slug}`}
                        title={`${eventStyles[event.type].label}: ${event.companyName}`}
                        className="block rounded-lg px-1.5 py-1 transition-colors hover:bg-[#f1f7f6]"
                      >
                        <span className={`inline-block rounded px-1 py-px text-[9px] font-bold uppercase ring-1 ring-inset ${eventStyles[event.type].chip}`}>
                          {eventStyles[event.type].label}
                        </span>
                        <span className="mt-0.5 block text-xs font-semibold leading-4 text-zinc-800">{shortName(event.companyName)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-auto text-xs text-zinc-500">No events</p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function shortName(name: string): string {
  return name.replace(/\s+(Limited|Ltd\.?)$/i, "");
}
