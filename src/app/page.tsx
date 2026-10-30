import type { Metadata } from "next";
import Link from "next/link";
import { GuideLinks } from "@/components/content/ContentPage";
import { IpoSection } from "@/components/ipo/IpoSection";
import { IpoCollection } from "@/components/ipo/IpoCollection";
import { WeekCalendar } from "@/components/home/HomeInsights";
import { PageSearchBox, PageSearchProvider } from "@/components/search/PageSearch";
import { getHomepageIpoGroups } from "@/services/ipo-query-service";

// IPO status and GMP freshness change over time; re-read the database (never
// the external API) at most every 5 minutes instead of serving build-time data.
export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  const {
    upcoming,
    open,
    awaitingListing,
    recentlyListed,
    listedCount,
    weekCalendar,
    liveFeedUnavailable,
    liveFeedQuotaExceeded,
  } = await getHomepageIpoGroups();
  // Announced IPOs (no dates or price yet) live in the tracker; the homepage
  // only shows issues with a schedule so it stays compact.
  const scheduledUpcoming = upcoming.filter((ipo) => ipo.openDate);
  const announcedCount = upcoming.length - scheduledUpcoming.length;
  const stats = [
    { value: open.length, label: "Open", href: "/gmp-tracker?status=open" },
    { value: upcoming.length, label: "Upcoming", href: "/gmp-tracker?status=upcoming" },
    ...(awaitingListing.length > 0
      ? [{ value: awaitingListing.length, label: "Awaiting listing", href: "/gmp-tracker?status=closed" }]
      : []),
    { value: listedCount, label: "Listed", href: "/gmp-tracker?status=listed" },
  ];

  return (
    <div className="bg-[linear-gradient(180deg,#eaf3f2_0%,#f3f7f6_520px,#f3f7f6_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="relative mb-10 overflow-hidden rounded-[28px] border border-[#174a52] bg-[linear-gradient(125deg,#0f3138_0%,#174a52_55%,#28727b_100%)] px-6 py-8 text-white shadow-[0_24px_60px_rgba(23,74,82,0.2)] sm:px-8 lg:px-10 lg:py-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.09)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]"
          />
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#3aa3a0]/25 blur-3xl" />

          <div className="relative max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#e5f0ef]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e0a065] opacity-60 motion-reduce:hidden" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#e0a065]" />
                </span>
                Updated daily
              </span>
              <h1 className="mt-5 text-3xl font-black leading-[1.06] sm:text-5xl">
                Indian IPOs, their GMP and how they listed.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[#d7e8e7] sm:text-base">
                Track open and upcoming issues, official subscription figures, indicative listing gains
                per lot, and real listing-day results. GMP is refreshed daily; subscription every 30 minutes
                during bidding.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/gmp-tracker" className={heroButton}>
                  GMP Tracker
                </Link>
                <Link href="/compare" className={heroButton}>
                  Compare IPO
                </Link>
              </div>

              <nav aria-label="Browse IPOs in the GMP Tracker" className="mt-7 flex flex-wrap gap-2">
                {stats.map((stat) => (
                  <StatPill key={stat.label} value={String(stat.value)} label={stat.label} href={stat.href} />
                ))}
              </nav>
          </div>
        </div>

        {liveFeedUnavailable && (
          <div
            role="status"
            className="mb-8 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          >
            {liveFeedQuotaExceeded
              ? "Live IPO data is unavailable because the IPOAlerts API key has reached its usage limit. Check the API quota or plan to restore the live feed."
              : "Live IPO data is temporarily unavailable. Please check back shortly."}
          </div>
        )}

        <WeekCalendar days={weekCalendar} />

        <PageSearchProvider>
          <PageSearchBox className="mb-8 max-w-md" />

          <IpoSection
            title="Open IPOs"
            description="Subscription is open now. GMP figures are unofficial and indicative."
            accent="emerald"
            icon={<PulseIcon />}
          >
            <IpoCollection items={open} pageSize={SECTION_PAGE_SIZE} accent="emerald" emptyMessage="No IPOs are open for subscription right now." />
          </IpoSection>

          {awaitingListing.length > 0 ? (
            <IpoSection
              title="Awaiting Listing"
              description="Subscription has closed; these IPOs list on the exchange soon."
              accent="slate"
              icon={<ClockIcon />}
            >
              <IpoCollection items={awaitingListing} pageSize={SECTION_PAGE_SIZE} accent="slate" emptyMessage="No IPOs are awaiting listing." />
            </IpoSection>
          ) : null}

          <IpoSection
            title="Upcoming IPOs"
            description="Scheduled issues that have not opened for subscription yet."
            accent="blue"
            icon={<CalendarIcon />}
          >
            <IpoCollection items={scheduledUpcoming} pageSize={SECTION_PAGE_SIZE} accent="blue" emptyMessage="No scheduled upcoming IPOs right now." />
            {announcedCount > 0 ? (
              <Link
                href="/gmp-tracker?status=upcoming"
                className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#174a52] hover:underline"
              >
                + {announcedCount} announced {announcedCount === 1 ? "IPO" : "IPOs"} without dates yet: view in GMP Tracker →
              </Link>
            ) : null}
          </IpoSection>

          <IpoSection
            title="Recently Listed IPOs"
            description="Actual listing-day price and gain versus issue price."
            accent="amber"
            icon={<ChartIcon />}
          >
            <IpoCollection items={recentlyListed} pageSize={SECTION_PAGE_SIZE} listed accent="amber" emptyMessage="No recently listed IPOs yet." />
          </IpoSection>
        </PageSearchProvider>

        <section className="mb-10 rounded-[22px] border border-[#e0e8e6] bg-white p-6 shadow-[0_8px_24px_rgba(23,74,82,0.05)] sm:p-8">
          <h2 className="text-xl font-black text-zinc-900">New to IPOs? How to read this page</h2>
          <div className="mt-3 grid gap-4 text-[15px] leading-7 text-zinc-700 md:grid-cols-3">
            <p>
              <strong className="text-zinc-900">Official figures</strong> such as the price band, lot size,
              subscription and listing price come from the companies&apos; filings and the stock exchanges, and show
              when they were last updated.
            </p>
            <p>
              <strong className="text-zinc-900">GMP is unofficial.</strong> It is a grey-market quote that can be
              wrong or change quickly, so the estimated gains built on it are indications, not predictions.
            </p>
            <p>
              <strong className="text-zinc-900">Real results</strong> appear after listing: the listing-day opening
              price and the actual gain or loss, before brokerage and tax.
            </p>
          </div>
          <div className="mt-6">
            <GuideLinks
              title="IPO guides"
              links={[
                { href: "/guides/ipo-gmp-explained", label: "What is IPO GMP?", text: "What the grey market premium means and its limits." },
                { href: "/guides/ipo-subscription-explained", label: "Subscription explained", text: "QIB, NII and retail figures, and day-wise demand." },
                { href: "/guides/ipo-allotment-process", label: "How allotment works", text: "The T+3 timeline and how to check your status." },
                { href: "/guides/listing-gain-calculation", label: "Listing gain calculation", text: "Why estimated and actual gains differ from your profit." },
              ]}
            />
          </div>
        </section>

        <p className="text-xs leading-5 text-zinc-500">
          *Estimated gain per lot = latest GMP × shares per lot. Indicative only; excludes brokerage, taxes and charges.
        </p>
      </div>
    </div>
  );
}

/** IPOs per homepage section before "Show more". */
const SECTION_PAGE_SIZE = 12;

// Both primary actions share one high-contrast style so they read as the
// main things to do on the page.
const heroButton =
  "inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-[15px] font-extrabold text-[#123a41] shadow-[0_10px_28px_rgba(0,0,0,0.22)] ring-2 ring-white/40 ring-offset-2 ring-offset-[#174a52] transition duration-200 hover:-translate-y-0.5 hover:bg-[#f2fbfa] hover:shadow-[0_16px_36px_rgba(0,0,0,0.28)] focus-visible:outline-none focus-visible:ring-[#e0a065] motion-reduce:transform-none";

function StatPill({ value, label, href }: { value: string; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="group flex items-baseline gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 backdrop-blur-sm transition-colors hover:border-white/30 hover:bg-white/20"
    >
      <span className="text-xl font-black tabular-nums text-white">{value}</span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d4e5e4]">{label}</span>
    </Link>
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

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
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
