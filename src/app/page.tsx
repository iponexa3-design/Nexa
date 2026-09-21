import { IpoSection, EmptyState } from "@/components/ipo/IpoSection";
import { IpoCard } from "@/components/ipo/IpoCard";
import { RecentlyListedIpoCard } from "@/components/ipo/RecentlyListedIpoCard";
import { getHomepageIpoGroups } from "@/services/ipo-query-service";

export default async function Home() {
  const { upcoming, open, recentlyListed } = await getHomepageIpoGroups();

  return (
    <div className="bg-gradient-to-b from-indigo-50/60 via-white to-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-12 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 px-6 py-12 text-white shadow-lg shadow-indigo-200 sm:px-10">
          <h1 className="max-w-2xl text-2xl font-extrabold tracking-tight sm:text-4xl">
            Indian IPO GMP, Subscription &amp; Estimated Listing Analysis
          </h1>
          <p className="mt-3 max-w-xl text-sm text-indigo-100 sm:text-base">
            Track upcoming, open and recently listed IPOs with unofficial
            GMP, subscription status and data-based estimated listing gains.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-white/15 px-3 py-1.5">
              GMP % Tracking
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1.5">
              Estimated Gain / Lot
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1.5">
              Mainboard &amp; SME
            </span>
          </div>
        </div>

        <IpoSection
          title="Upcoming IPOs"
          description="IPOs that have not opened for subscription yet."
          accent="blue"
          icon={<CalendarIcon />}
        >
          {upcoming.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((ipo) => (
                <IpoCard key={ipo.slug} ipo={ipo} />
              ))}
            </div>
          ) : (
            <EmptyState accent="blue" message="No upcoming IPOs right now." />
          )}
        </IpoSection>

        <IpoSection
          title="Open IPOs"
          description="IPOs where subscription is currently open."
          accent="emerald"
          icon={<PulseIcon />}
        >
          {open.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {open.map((ipo) => (
                <IpoCard key={ipo.slug} ipo={ipo} />
              ))}
            </div>
          ) : (
            <EmptyState accent="emerald" message="No IPOs are open for subscription right now." />
          )}
        </IpoSection>

        <IpoSection
          title="Recently Listed IPOs"
          description="IPOs that have recently been listed on the exchange."
          accent="violet"
          icon={<ChartIcon />}
        >
          {recentlyListed.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentlyListed.map((ipo) => (
                <RecentlyListedIpoCard key={ipo.slug} ipo={ipo} />
              ))}
            </div>
          ) : (
            <EmptyState accent="violet" message="No recently listed IPOs yet." />
          )}
        </IpoSection>
      </div>
    </div>
  );
}


function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M7 3v3M17 3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PulseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M3 12h4l2 7 4-14 2 7h6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M4 20V10M12 20V4M20 20v-7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
