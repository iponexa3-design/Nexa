import type { Metadata } from "next";
import Link from "next/link";
import { Faq, GuideLinks, ProseSection } from "@/components/content/ContentPage";
import { toneClass } from "@/components/gmp/indicators";
import { CLOSE_MARGIN_PTS, type GmpAccuracyStats } from "@/services/gmp-accuracy";
import { getGmpAccuracyData } from "@/services/ipo-query-service";
import { formatCurrency, formatDate, formatSignedPercent } from "@/utils/format";

export const metadata: Metadata = {
  title: "How Accurate Is IPO GMP? Grey Market Premium vs Actual Listing Price",
  description:
    "IPONexa's own comparison of the last grey market premium (GMP) before listing with the actual listing price, for every Indian IPO we tracked: how often GMP was close, how often it pointed the right way, and how SME and mainboard IPOs differ.",
  alternates: { canonical: "/ipo-gmp-accuracy" },
};

// New listings are added after each trading day.
export const revalidate = 3600;

/** Below this many IPOs, figures for a group are shown with a small-sample warning. */
const SMALL_SAMPLE = 20;

export default async function GmpAccuracyPage() {
  const data = await getGmpAccuracyData();
  const { overall, rows } = data;

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#eaf3f2_0%,#f3f7f6_360px,#f3f7f6_100%)]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-6 rounded-[24px] border border-[#174a52] bg-[linear-gradient(125deg,#123a41_0%,#174a52_62%,#28727b_100%)] px-6 py-7 text-white shadow-[0_20px_50px_rgba(23,74,82,0.16)] sm:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c6e0df]">IPONexa research</p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">How accurate is IPO GMP?</h1>
          <p className="mt-2 max-w-3xl text-[15px] leading-7 text-[#d7e8e7]">
            Grey market premium is the most quoted number before an IPO lists, but it is unofficial. We stored every GMP
            quote we tracked and compared the last one before listing day with the price each IPO actually listed at.
            {overall.count > 0 && data.firstListing && data.lastListing
              ? ` This page covers ${overall.count} IPOs listed between ${formatDate(data.firstListing)} and ${formatDate(data.lastListing)}, and updates as new IPOs list.`
              : ""}
          </p>
        </header>

        {overall.count === 0 ? (
          <p className="rounded-2xl border border-[#e0e8e6] bg-white p-6 text-sm text-zinc-600">
            No listed IPO has both a stored GMP quote and a listing price yet. Figures appear here after the next listing.
          </p>
        ) : (
          <>
            <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="IPOs compared" value={String(overall.count)} note="with a GMP quote before listing" />
              <StatTile
                label="Typical gap"
                value={`${overall.medianAbsDifferencePts?.toFixed(1)} pts`}
                note="median difference between GMP-implied and actual gain"
              />
              <StatTile
                label={`Within ±${CLOSE_MARGIN_PTS} pts`}
                value={`${overall.closePct}%`}
                note="listed close to what the GMP implied"
              />
              <StatTile label="Right direction" value={`${overall.directionPct}%`} note="GMP correctly signalled a gain or no gain" />
            </section>

            <div className="mt-6 space-y-8 rounded-[22px] border border-[#e0e8e6] bg-white p-6 text-[15px] leading-7 text-zinc-700 shadow-[0_8px_24px_rgba(23,74,82,0.05)] sm:p-8">
              <ProseSection title="What the data shows">
                <ul>
                  {findings(data).map((finding) => (
                    <li key={finding}>{finding}</li>
                  ))}
                </ul>
                {overall.count < SMALL_SAMPLE ? (
                  <p className="text-sm text-amber-800">
                    The sample is still small ({overall.count} IPOs), so treat these figures as early indications. They
                    become more reliable as more IPOs list.
                  </p>
                ) : null}
              </ProseSection>

              <ProseSection title="Mainboard vs SME IPOs">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-xs text-zinc-500">
                        <th className="py-2 pr-3 font-semibold">Board</th>
                        <th className="py-2 pr-3 text-right font-semibold">IPOs</th>
                        <th className="py-2 pr-3 text-right font-semibold">Typical gap</th>
                        <th className="py-2 pr-3 text-right font-semibold">Within ±{CLOSE_MARGIN_PTS} pts</th>
                        <th className="py-2 pr-3 text-right font-semibold">Right direction</th>
                        <th className="py-2 text-right font-semibold">Listed below GMP</th>
                      </tr>
                    </thead>
                    <tbody>
                      <BoardRow label="Mainboard" stats={data.mainboard} />
                      <BoardRow label="SME" stats={data.sme} />
                      <BoardRow label="All IPOs" stats={overall} strong />
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-zinc-500">
                  &ldquo;Typical gap&rdquo; is the median distance, in percentage points, between the gain the final GMP
                  implied and the actual listing gain. Lower is more accurate.
                </p>
              </ProseSection>

              <ProseSection title="Does high subscription mean a better listing?">
                <p>
                  Listing-day gain against the issue price, grouped by how many times each IPO was subscribed. This uses
                  every listed IPO with both figures ({data.bySubscription.reduce((sum, band) => sum + band.count, 0)} of{" "}
                  {data.listedCount}), including those without a GMP quote.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[460px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-xs text-zinc-500">
                        <th className="py-2 pr-3 font-semibold">Subscribed</th>
                        <th className="py-2 pr-3 text-right font-semibold">IPOs</th>
                        <th className="py-2 pr-3 text-right font-semibold">Median listing gain</th>
                        <th className="py-2 text-right font-semibold">Listed above issue price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.bySubscription.map((band) => (
                        <tr key={band.label} className="border-b border-zinc-100">
                          <td className="py-2 pr-3 font-medium text-zinc-800">{band.label}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{band.count}</td>
                          <td className={`py-2 pr-3 text-right tabular-nums ${toneClass(band.medianGainPct)}`}>
                            {band.count > 0 ? formatSignedPercent(band.medianGainPct) : "—"}
                          </td>
                          <td className="py-2 text-right tabular-nums">{band.count > 0 ? `${band.positivePct}%` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-zinc-500">
                  Groups with fewer than five IPOs say little on their own. Subscription is the final overall figure.
                </p>
              </ProseSection>

              <ProseSection title="Every IPO compared">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-xs text-zinc-500">
                        <th className="py-2 pr-3 font-semibold">IPO</th>
                        <th className="py-2 pr-3 font-semibold">Listed</th>
                        <th className="py-2 pr-3 text-right font-semibold">Final GMP</th>
                        <th className="py-2 pr-3 text-right font-semibold">GMP-implied gain</th>
                        <th className="py-2 pr-3 text-right font-semibold">Actual listing gain</th>
                        <th className="py-2 text-right font-semibold">Difference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.slug} className="border-b border-zinc-100 align-top">
                          <td className="py-2 pr-3">
                            <Link href={`/ipo/${row.slug}`} className="font-semibold text-[#174a52] underline-offset-4 hover:underline">
                              {row.companyName}
                            </Link>
                            <span className="ml-2 text-xs text-zinc-500">{row.ipoType === "SME" ? "SME" : "Mainboard"}</span>
                          </td>
                          <td className="whitespace-nowrap py-2 pr-3 text-zinc-600">{formatDate(row.listingDate)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(row.finalGmp)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{formatSignedPercent(row.impliedGainPct)}</td>
                          <td className={`py-2 pr-3 text-right tabular-nums ${toneClass(row.actualGainPct)}`}>
                            {formatSignedPercent(row.actualGainPct)}
                          </td>
                          <td className={`py-2 text-right font-semibold tabular-nums ${toneClass(row.differencePts)}`}>
                            {formatPoints(row.differencePts)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-zinc-500">
                  A negative difference means the IPO listed below what its final GMP implied. Click an IPO for its full GMP
                  history and subscription figures.
                </p>
              </ProseSection>

              <ProseSection title="How we measure it">
                <ul>
                  <li>
                    <strong>Final GMP</strong> is the last grey market premium quote dated before listing day, from the
                    GMP history IPONexa stores for each IPO. Quotes from the listing day itself are ignored, because by then
                    the listing price is about to be known.
                  </li>
                  <li>
                    <strong>GMP-implied gain</strong> = final GMP ÷ issue price. When the final issue price was not
                    reported, the upper end of the price band is used, the same reference price shown on each IPO page.
                  </li>
                  <li>
                    <strong>Actual listing gain</strong> = (listing price − issue price) ÷ issue price, where the listing
                    price is the opening price on listing day, taken from the NSE/BSE end-of-day files (or, when a file
                    does not cover the IPO, entered by hand from the exchange).
                  </li>
                  <li>
                    <strong>Difference</strong> = actual listing gain − GMP-implied gain, in percentage points. An IPO
                    counts as &ldquo;right direction&rdquo; when a positive GMP was followed by a listing above the issue
                    price, or a GMP of zero or less by a listing at or below it.
                  </li>
                  <li>
                    Only IPOs with both a stored GMP quote and a listing price are included. IPOs for which no GMP was
                    reported are left out rather than counted as a GMP of zero.
                  </li>
                </ul>
              </ProseSection>

              <Faq
                items={[
                  {
                    question: "Can I use GMP to predict the listing price?",
                    answer:
                      "Only as a rough indication. Even when GMP points the right way, the listing price often differs from it by several percentage points, and for SME IPOs the gap is usually larger. GMP is an unofficial, unregulated quote from a small market, not a forecast.",
                  },
                  {
                    question: "Why do listings so often fall short of the GMP?",
                    answer:
                      "Grey market quotes are made by a small number of dealers and tend to reflect the most optimistic buyers just before listing. On listing day the price is set by the whole market, including investors who were allotted shares and want to sell. Market conditions on the day also matter.",
                  },
                  {
                    question: "Where does IPONexa's GMP data come from?",
                    answer: (
                      <>
                        From our IPO data provider and, for IPOs it does not cover, quotes entered by hand from published
                        sources; each IPO page shows the source and time of every quote. See{" "}
                        <Link href="/about">about our data</Link>.
                      </>
                    ),
                  },
                ]}
              />

              <GuideLinks
                title="Related"
                links={[
                  { href: "/guides/ipo-gmp-explained", label: "What is IPO GMP?", text: "Why GMP is unofficial and how the estimate is calculated." },
                  { href: "/gmp-tracker", label: "Live GMP tracker", text: "Today's GMP for open and upcoming IPOs." },
                  { href: "/recently-listed-ipos", label: "Recently listed IPOs", text: "Listing-day results of the last 45 days." },
                  { href: "/guides/listing-gain-calculation", label: "Listing gain calculation", text: "Why your real profit differs from the listing gain." },
                ]}
              />

              <p className="text-xs leading-5 text-zinc-500">
                Past GMP accuracy does not tell you how a future IPO will list. Information only, not investment advice.{" "}
                <Link href="/disclaimer" className="underline underline-offset-2">
                  Disclaimer
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Plain-language findings, written from the figures so they stay true as data changes. */
function findings(data: Awaited<ReturnType<typeof getGmpAccuracyData>>): string[] {
  const { overall, mainboard, sme } = data;
  const lines: string[] = [];
  if (overall.belowGmpPct !== null && overall.averageDifferencePts !== null) {
    const below = Math.round((overall.belowGmpPct / 100) * overall.count);
    lines.push(
      `${below} of ${overall.count} IPOs listed below what their final GMP implied. On average the listing gain was ${Math.abs(overall.averageDifferencePts).toFixed(1)} percentage points ${overall.averageDifferencePts < 0 ? "lower" : "higher"} than the GMP suggested.`,
    );
  }
  if (overall.directionPct !== null) {
    lines.push(
      `GMP pointed the right way (a gain, or no gain) for ${overall.directionPct}% of IPOs, but only ${overall.closePct}% listed within ${CLOSE_MARGIN_PTS} percentage points of it. It is better at signalling direction than size.`,
    );
  }
  if (mainboard.count > 0 && sme.count > 0 && mainboard.medianAbsDifferencePts !== null && sme.medianAbsDifferencePts !== null) {
    const smeWorse = sme.medianAbsDifferencePts > mainboard.medianAbsDifferencePts;
    lines.push(
      `For mainboard IPOs the typical gap was ${mainboard.medianAbsDifferencePts.toFixed(1)} points; for SME IPOs it was ${sme.medianAbsDifferencePts.toFixed(1)} points. ${smeWorse ? "SME grey market quotes were the less reliable guide, which fits their thinner trading." : "Mainboard quotes were not more reliable than SME quotes in this sample."}`,
    );
  }
  return lines;
}

function formatPoints(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(1)} pts`;
}

function StatTile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-[#e0e8e6] bg-white px-4 py-4 shadow-[0_4px_14px_rgba(23,74,82,0.04)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-zinc-900">{value}</p>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{note}</p>
    </div>
  );
}

function BoardRow({ label, stats, strong = false }: { label: string; stats: GmpAccuracyStats; strong?: boolean }) {
  const cell = (value: string) => (stats.count > 0 ? value : "—");
  return (
    <tr className={`border-b border-zinc-100 ${strong ? "font-semibold text-zinc-900" : ""}`}>
      <td className="py-2 pr-3">{label}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{stats.count}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{cell(`${stats.medianAbsDifferencePts?.toFixed(1)} pts`)}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{cell(`${stats.closePct}%`)}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{cell(`${stats.directionPct}%`)}</td>
      <td className="py-2 text-right tabular-nums">{cell(`${stats.belowGmpPct}%`)}</td>
    </tr>
  );
}
