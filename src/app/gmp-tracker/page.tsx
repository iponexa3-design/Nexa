import type { Metadata } from "next";
import Link from "next/link";
import { GmpTracker } from "@/components/gmp/GmpTracker";
import { getGmpTrackerData } from "@/services/ipo-query-service";
import { GMP_STALE_AFTER_HOURS } from "@/services/calculations";
import type { TrackerFilters } from "@/services/gmp-tracker";
import { formatDateTime } from "@/utils/format";
import { Faq, GuideLinks } from "@/components/content/ContentPage";

export const metadata: Metadata = {
  title: "IPO GMP Tracker - Open, Upcoming & Listed IPOs",
  description:
    "Latest IPO grey market premium (GMP), indicative listing price, estimated gain per share and per lot, and actual listing performance for Mainboard and SME IPOs.",
  // Filter and search links (?status=, ?q=) are views of the same page.
  alternates: { canonical: "/gmp-tracker" },
};

const categories = new Set<TrackerFilters["category"]>(["all", "open", "upcoming", "closed", "listed"]);

function parseFilters(params: Record<string, string | string[] | undefined>): TrackerFilters {
  const first = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
  const status = first(params.status).toLowerCase() as TrackerFilters["category"];
  const type = first(params.type).toUpperCase();
  return {
    category: categories.has(status) ? status : "all",
    ipoType: type === "SME" || type === "MAINBOARD" ? type : "all",
    query: first(params.q).slice(0, 80),
  };
}

export default async function GmpTrackerPage(props: PageProps<"/gmp-tracker">) {
  const [data, params] = await Promise.all([getGmpTrackerData(), props.searchParams]);
  const filters = parseFilters(params);
  const withGmp = data.rows.filter((row) => row.gmp !== null).length;
  const gmpSources = [...new Set(data.rows.flatMap((row) => (row.gmpSource ? [sourceName(row.gmpSource)] : [])))];

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#eaf3f2_0%,#f3f7f6_360px,#f3f7f6_100%)]">
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-6 rounded-[24px] border border-[#174a52] bg-[linear-gradient(125deg,#123a41_0%,#174a52_62%,#28727b_100%)] px-6 py-7 text-white shadow-[0_20px_50px_rgba(23,74,82,0.16)] sm:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c6e0df]">
            IPONexa market board
          </p>
          <div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-3xl font-black leading-tight sm:text-4xl">IPO GMP Tracker</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#d7e8e7]">
                Grey market premium, indicative listing estimates per share and per lot, and actual
                listing results for every Mainboard and SME IPO in our records.
              </p>
            </div>
            <dl className="grid shrink-0 grid-cols-3 gap-2 text-left sm:gap-3">
              <HeaderStat label="IPOs tracked" value={data.rows.length} />
              <HeaderStat label="With GMP" value={withGmp} />
              <HeaderStat label="Open now" value={data.rows.filter((row) => row.category === "open").length} />
            </dl>
          </div>
          <p className="mt-5 border-t border-white/15 pt-4 text-xs text-[#c6e0df]">
            {data.dataUpdatedAt ? `IPO records updated ${formatDateTime(data.dataUpdatedAt)} IST` : "IPO record update time not available"}
          </p>
        </header>

        {isStale(data.dataUpdatedAt) ? (
          <div role="status" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            IPO records were last refreshed {formatDateTime(data.dataUpdatedAt)} IST, more than{" "}
            {STALE_AFTER_HOURS} hours ago. New IPOs, dates and GMP may be missing until the next refresh.
          </div>
        ) : null}

        {data.liveFeedUnavailable ? (
          <div role="status" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            {data.liveFeedQuotaExceeded
              ? "The IPO data feed has reached its API usage limit and no saved records are available right now."
              : "The IPO data feed is temporarily unavailable and no saved records are available right now."}
          </div>
        ) : data.servedFromLiveFeed ? (
          <div role="status" className="mb-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
            Showing IPO details directly from the data feed. GMP figures appear once the scheduled data refresh has stored them.
          </div>
        ) : null}

        <GmpTracker rows={data.rows} initialFilters={filters} nowIso={new Date().toISOString()} />

        <section className="mt-6 grid gap-4 rounded-[20px] border border-[#e0e8e6] bg-white/90 p-5 text-xs leading-5 text-zinc-600 md:grid-cols-2">
          <div>
            <h2 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-800">*How estimates are calculated</h2>
            <ul className="space-y-1">
              <li>Est. listing price = issue price + latest GMP</li>
              <li>Est. P/L per share = est. listing price − issue price</li>
              <li>Est. P/L per lot = est. P/L per share × shares per lot</li>
              <li>GMP % = latest GMP ÷ issue price × 100</li>
            </ul>
            <p className="mt-2">
              Where only a price band is known, the upper end of the band is used and marked
              &ldquo;upper band&rdquo;. Figures exclude brokerage, taxes and other charges.
            </p>
          </div>
          <div>
            <h2 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-800">Reading the data</h2>
            <p>
              GMP is an unofficial grey-market quote. Estimates are indicative only, not a guaranteed
              listing price or profit. GMP older than {GMP_STALE_AFTER_HOURS} hours is marked
              outdated; a dash means the figure is not available, never zero. Actual listing results
              are shown only when the listing price has been reported. The &ldquo;Open&rdquo; badge
              describes the subscription window only and is not a recommendation.
            </p>
            <p className="mt-2">
              <Link href="/compare" className="font-semibold text-[#174a52] underline decoration-[#b9d4d2] underline-offset-4">
                Compare IPO: put 2 or 3 IPOs side by side →
              </Link>
            </p>
          </div>
        </section>

        {gmpSources.length > 0 ? (
          <p className="mt-3 text-xs text-zinc-500">
            Data sources: {gmpSources.join(", ")} (IPO details and GMP); NSE (subscription); NSE/BSE end-of-day files
            (listing prices).{" "}
            <Link href="/about" className="underline underline-offset-2">
              About our data
            </Link>
          </p>
        ) : null}

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Faq
            items={[
              {
                question: "What do the tabs mean?",
                answer:
                  "Open IPOs are accepting bids now. Upcoming IPOs have not opened yet (some have no dates or price band yet). Awaiting listing means bidding has closed and the shares have not started trading. Listed shows IPOs that listed in the last 30 or 45 days with their actual listing results.",
              },
              {
                question: "Why is the GMP of a listed IPO not shown?",
                answer:
                  "Once an IPO lists, its real listing price is known, so the tracker shows the actual listing price and gain instead of a GMP-based estimate.",
              },
              {
                question: "Why do some IPOs show a dash instead of a GMP?",
                answer: (
                  <>
                    A dash means no GMP has been reported for that IPO. It is never treated as zero, and no estimate is
                    shown. See <Link href="/guides/ipo-gmp-explained">what IPO GMP is</Link>.
                  </>
                ),
              },
              {
                question: "How often is the tracker updated?",
                answer:
                  "IPO details and GMP are refreshed once a day in the evening (IST). Subscription figures for open IPOs are refreshed every 30 minutes on weekdays. Each GMP shows the date it was quoted.",
              },
            ]}
          />
          <GuideLinks
            title="IPO guides"
            links={[
              { href: "/guides/ipo-gmp-explained", label: "What is IPO GMP?", text: "Why GMP is unofficial and its limits." },
              { href: "/guides/listing-gain-calculation", label: "Listing gain calculation", text: "Estimated vs actual gains and real profit." },
              { href: "/guides/ipo-subscription-explained", label: "Subscription explained", text: "QIB, NII and retail figures." },
              { href: "/guides/ipo-allotment-process", label: "How allotment works", text: "The T+3 timeline and the retail lottery." },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

/** Readable name for a stored GMP source code. */
function sourceName(source: string): string {
  return source === "ipoalerts" ? "IPO Alert" : source;
}

/** The scheduled refresh runs once a day; older than this means a run was missed. */
const STALE_AFTER_HOURS = 30;

function isStale(updatedAt: Date | null): boolean {
  return updatedAt !== null && Date.now() - updatedAt.getTime() > STALE_AFTER_HOURS * 3_600_000;
}

function HeaderStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col-reverse rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 sm:px-4">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#d4e5e4]">{label}</dt>
      <dd className="text-xl font-black tabular-nums sm:text-2xl">{value}</dd>
    </div>
  );
}
