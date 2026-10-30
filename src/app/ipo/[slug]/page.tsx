import type { Metadata } from "next";
import { gmpSourceLabel } from "@/utils/gmp-source";
import { subscriptionSourceLabel } from "@/utils/subscription-source";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getIpoBySlug } from "@/services/ipo-query-service";
import { GmpFreshnessNote, toneClass } from "@/components/gmp/indicators";
import { AllotmentLinks, StageBadge } from "@/components/allotment/AllotmentLinks";
import { allotmentStage, findRegistrar } from "@/services/allotment";
import type { DaywiseSubscriptionRow } from "@/services/subscription-history";
import { buildIpoMetaDescription, buildIpoSummary, isIpoIndexable, type IpoSummaryInput } from "@/services/ipo-summary";
import type { IpoDetail } from "@/services/ipo-query-service";
import { GuideLinks } from "@/components/content/ContentPage";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPriceBand,
  formatSignedCurrency,
  formatSignedPercent,
  formatSubscriptionTimes,
} from "@/utils/format";

const statusLabels = {
  UPCOMING: "Upcoming",
  OPEN: "Open for subscription",
  CLOSED: "Closed - awaiting listing",
  LISTED: "Listed",
} as const;

export async function generateMetadata(
  props: PageProps<"/ipo/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const ipo = await getIpoBySlug(slug);
  if (!ipo) return { title: "IPO not found" };
  const indexable = isIpoIndexable(ipo, new Date());
  return {
    title: `${ipo.companyName} IPO - GMP, Price, Subscription & Listing`,
    description: buildIpoMetaDescription(summaryInput(ipo)),
    alternates: { canonical: `/ipo/${ipo.slug}` },
    // Announced IPOs without a price or dates, and stale records, stay out of
    // search results until real data arrives (they are also left out of the sitemap).
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
  };
}

/** The data the page summary and meta description are written from. */
function summaryInput(ipo: IpoDetail): IpoSummaryInput {
  const fromNse = ipo.latestSubscription !== null && ipo.subscriptionSource === ipo.latestSubscription.source;
  return {
    ...ipo,
    subscriptionCategories: fromNse && ipo.latestSubscription ? ipo.latestSubscription : null,
  };
}

export default async function IpoDetailsPage(props: PageProps<"/ipo/[slug]">) {
  const { slug } = await props.params;
  const ipo = await getIpoBySlug(slug);
  if (!ipo) notFound();

  const hasGmp = ipo.gmp !== null;
  const isListed = ipo.status === "LISTED";
  const research = ipo.research;
  // Shown while allotment is relevant: from opening until shortly after listing.
  const allotment = allotmentStage(ipo, new Date());
  const sourceLinks = [
    { label: "Prospectus / RHP", url: research.prospectusUrl },
    { label: "NSE issue page", url: research.nseInfoUrl },
    { label: "BSE issue page", url: research.bseInfoUrl },
  ].filter((link) => isSafeExternalUrl(link.url));
  // Whichever source (NSE or the IPO feed) updated most recently, same as the lists.
  const subscriptionMultiple = ipo.subscriptionTimes;
  const subscriptionFromNse = ipo.latestSubscription !== null && ipo.subscriptionSource === ipo.latestSubscription.source;

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#eef5f1_0%,#f7f8f5_420px,#f7f8f5_100%)]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="relative mb-8 overflow-hidden rounded-[26px] border border-[#24483a] bg-[linear-gradient(125deg,#142820_0%,#1a4033_58%,#275b49_100%)] p-6 text-white shadow-[0_24px_60px_rgba(25,65,49,0.18)] sm:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:34px_34px] [mask-image:linear-gradient(110deg,black,transparent_75%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_250px] lg:items-center">
            <div>
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-emerald-200/25 bg-emerald-100/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-100">
                  {ipo.ipoType === "MAINBOARD" ? "Mainboard" : "SME"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                  <span className={`h-1.5 w-1.5 rounded-full ${ipo.status === "OPEN" ? "bg-emerald-300" : "bg-amber-300"}`} />
                  {statusLabels[ipo.status]}
                </span>
              </div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100/70">
                IPO profile
              </p>
              <h1 className="max-w-3xl text-3xl font-black leading-tight text-white sm:text-4xl">
                {ipo.companyName}
              </h1>
              <p className="mt-3 text-sm font-medium text-emerald-50/75">
                {[ipo.symbol, ipo.exchange].filter(Boolean).join(" · ")}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-5 border-t border-white/15 pt-5 lg:grid-cols-1 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
              <div>
                <dt className="text-xs font-medium text-emerald-100/70">Price band</dt>
                <dd className="mt-1 text-lg font-bold text-white sm:text-xl">
                  {formatPriceBand(ipo.priceBandLow, ipo.priceBandHigh)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-emerald-100/70">Subscription</dt>
                <dd className="mt-1 text-lg font-bold text-white sm:text-xl">
                  {subscriptionMultiple !== null
                    ? formatSubscriptionTimes(subscriptionMultiple)
                    : "Not available"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="relative mt-7 flex flex-wrap items-center justify-between gap-2 border-t border-white/15 pt-4 text-xs text-emerald-50/75">
            <span>{scheduleLine(ipo)}</span>
            <span>Data updated {formatDateTime(ipo.updatedAt)}</span>
          </div>
        </header>

      <Section title="IPO at a Glance">
        <div className="max-w-3xl space-y-2 text-[15px] leading-7 text-zinc-700">
          {buildIpoSummary(summaryInput(ipo), new Date()).map((sentence) => (
            <p key={sentence}>{sentence}</p>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Written automatically from the figures on this page. Each section below shows its source and update time.
        </p>
      </Section>

      <Section title="Application & Issue Details">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Minimum Quantity" value={ipo.lotSize ? `${ipo.lotSize} shares` : "Not available"} />
          <Field label="Minimum Application" value={formatCurrency(ipo.minimumInvestment)} />
          <Field label="Issue Size" value={ipo.issueSize ? `₹${ipo.issueSize.toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr` : "Not available"} />
          <Field label="Face Value" value={formatCurrency(ipo.faceValue)} />
          {ipo.issuePrice ? <Field label="Issue Price" value={formatCurrency(ipo.issuePrice)} /> : null}
          {research.listingGain ? <Field label="Reported Listing Gain" value={`${research.listingGain}%`} /> : null}
        </dl>
      </Section>

      {research.about ? (
        <Section title="Company Overview">
          <p className="max-w-3xl whitespace-pre-line text-sm leading-7 text-zinc-700">
            {research.about}
          </p>
          <p className="mt-3 text-xs text-zinc-500">
            Summary supplied by our IPO data provider (IPO Alert). The offer document (RHP) is the authoritative
            description of the company.
          </p>
        </Section>
      ) : null}

      <Section title="Important Dates">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Open Date" value={formatDate(ipo.openDate)} />
          <Field label="Close Date" value={formatDate(ipo.closeDate)} />
          <Field label="Allotment Date" value={formatDate(ipo.allotmentDate)} />
          <Field label="Listing Date" value={formatDate(ipo.listingDate)} />
        </dl>
      </Section>

      {allotment ? (
        <Section title="Allotment Status">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-zinc-700">
            <StageBadge stage={allotment} allotmentDate={ipo.allotmentDate} />
            <span>
              {ipo.registrar ? `Registrar: ${findRegistrar(ipo.registrar)?.name ?? ipo.registrar}. ` : ""}
              Check with your PAN or application number on the official page.
            </span>
          </div>
          <AllotmentLinks registrar={ipo.registrar} exchange={ipo.exchange} ipoType={ipo.ipoType} />
        </Section>
      ) : null}

      {research.schedule.length > 0 ? (
        <Section title="Issue Timeline">
          <ol className="relative ml-2 border-l border-emerald-200 pl-6">
            {research.schedule.map((item, index) => (
              <li key={`${item.date}-${item.event}-${index}`} className="relative flex flex-col gap-1 border-b border-zinc-100 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                <span aria-hidden="true" className="absolute -left-[32px] top-[17px] h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 ring-2 ring-emerald-100" />
                <span className="text-sm font-medium text-zinc-800">{item.event}</span>
                <time className="text-sm tabular-nums text-zinc-500" dateTime={item.date}>
                  {formatDate(item.date)}
                </time>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {!isListed ? (
      <>
      <Section title="Grey Market Premium (GMP)">
        {hasGmp ? (
          <>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Latest GMP" value={formatSignedCurrency(ipo.gmp)} tone={ipo.gmp} />
              <Field label="GMP %" value={formatSignedPercent(ipo.gmpPercentage)} tone={ipo.gmpPercentage} />
              <Field
                label="Quoted on"
                value={ipo.gmpSourceUpdatedAt ? formatDateTime(ipo.gmpSourceUpdatedAt) : "Not reported by source"}
              />
              <Field label="GMP source" value={gmpSourceLabel(ipo.gmpSource)} />
            </dl>
            <p className="mt-3 text-xs">
              <GmpFreshnessNote freshness={ipo.gmpFreshness} sourceUpdatedAt={ipo.gmpSourceUpdatedAt} status={ipo.status} source={ipo.gmpSource} />
            </p>
            {ipo.gmpHistory.length > 1 ? (
              <div className="mt-5">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">
                  GMP history ({ipo.gmpHistory.length} stored records)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[460px] text-left text-sm">
                    <thead>
                      <tr className="text-xs text-zinc-400">
                        <th className="pb-2 font-medium">Quoted on</th>
                        <th className="pb-2 font-medium">Stored</th>
                        <th className="pb-2 text-right font-medium">GMP</th>
                        <th className="pb-2 text-right font-medium">GMP %</th>
                        <th className="pb-2 text-right font-medium">Est. listing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ipo.gmpHistory.map((entry, index) => (
                        <tr key={index} className="border-t border-zinc-100">
                          <td className="py-1.5 text-zinc-600">
                            {entry.sourceUpdatedAt ? formatDateTime(entry.sourceUpdatedAt) : "Not reported"}
                          </td>
                          <td className="py-1.5 text-zinc-500">{formatDateTime(entry.recordedAt)}</td>
                          <td className={`py-1.5 text-right font-medium tabular-nums ${toneClass(entry.gmp)}`}>
                            {formatSignedCurrency(entry.gmp)}
                          </td>
                          <td className={`py-1.5 text-right tabular-nums ${toneClass(entry.gmpPercentage)}`}>
                            {formatSignedPercent(entry.gmpPercentage)}
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-zinc-700">
                            {formatCurrency(entry.estimatedListingPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-zinc-500">
            No GMP has been reported for this IPO. Estimates are not shown rather than assuming a GMP of zero.
          </p>
        )}
        <p className="mt-3 text-xs text-amber-700">
          Grey Market Premium (GMP) is unofficial and indicative. Actual listing price may differ.
        </p>
      </Section>

      <Section title="Indicative Listing Estimate">
        {hasGmp ? (
          <>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Est. Listing Price" value={formatCurrency(ipo.estimatedListingPrice)} />
              <Field label="Est. Gain/Loss Per Share" value={formatSignedCurrency(ipo.estimatedGainPerShare)} tone={ipo.estimatedGainPerShare} />
              <Field label="Est. Gain/Loss Per Lot" value={formatSignedCurrency(ipo.estimatedGainPerLot)} tone={ipo.estimatedGainPerLot} />
              <Field label="Calculated On" value={formatCurrency(ipo.basisPrice)} />
            </dl>
            <p className="mt-3 text-xs leading-5 text-zinc-500">
              Estimated listing price = {ipo.priceBasis === "UPPER_PRICE_BAND" ? "upper price band" : "issue price"} + GMP.
              {ipo.priceBasis === "UPPER_PRICE_BAND"
                ? " The final issue price is not yet known, so the upper end of the price band is assumed."
                : ""}
              {" "}Per-lot figures use {ipo.lotSize ? `${ipo.lotSize} shares per lot` : "the lot size, which is not available"}.
              Indicative only: not a guaranteed listing price or profit, and excludes brokerage, taxes and charges.
            </p>
          </>
        ) : (
          <p className="text-sm text-zinc-500">
            Estimated listing figures need a GMP value, which is currently unavailable.
          </p>
        )}
      </Section>

      </>
      ) : null}

      <Section title="Subscription">
        {ipo.latestSubscription || research.subscription ? (
          <>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {/* Category figures only alongside the total they belong to. */}
              {subscriptionFromNse && ipo.latestSubscription && ipo.latestSubscription.qib !== null ? (
                <>
                  <Field label="QIB" value={formatSubscriptionTimes(ipo.latestSubscription.qib)} />
                  <Field label="NII" value={formatSubscriptionTimes(ipo.latestSubscription.nii)} />
                  <Field label="Retail" value={formatSubscriptionTimes(ipo.latestSubscription.retail)} />
                </>
              ) : null}
              <Field label="Total subscribed" value={formatSubscriptionTimes(subscriptionMultiple)} />
              {/* Share counts come with the feed's figure; shown only when that figure is the newest. */}
              {!subscriptionFromNse && research.subscription?.sharesOffered != null ? (
                <Field label="Shares offered" value={formatShares(research.subscription.sharesOffered)} />
              ) : null}
              {!subscriptionFromNse && research.subscription?.sharesBid != null ? (
                <Field label="Shares bid" value={formatShares(research.subscription.sharesBid)} />
              ) : null}
            </dl>
            <p className="mt-3 text-xs text-zinc-500">
              Updated {formatDateTime(ipo.subscriptionUpdatedAt)} · source: {sourceLabel(ipo.subscriptionSource)}
            </p>
            {ipo.daywiseSubscription.length > 0 ? (
              <DaywiseSubscription rows={ipo.daywiseSubscription} live={ipo.status === "OPEN"} />
            ) : null}
          </>
        ) : (
          <p className="text-sm text-zinc-500">
            {ipo.status === "UPCOMING"
              ? "Subscription figures appear once bidding opens."
              : "Subscription figures are not available for this issue (SME issues listed only on BSE are not covered yet)."}
          </p>
        )}
      </Section>

      {isListed ? (
        <Section title="Actual Listing Performance">
          {ipo.actualListingPrice !== null ? (
            <>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Field label="Listing Date" value={formatDate(ipo.listingDate)} />
                <Field label="Actual Listing Price" value={formatCurrency(ipo.actualListingPrice)} />
                <Field label="Gain/Loss Per Share" value={formatSignedCurrency(ipo.actualGainPerShare)} tone={ipo.actualGainPerShare} />
                <Field label="Gain/Loss Per Lot" value={formatSignedCurrency(ipo.actualGainPerLot)} tone={ipo.actualGainPerLot} />
                <Field label="Listing Gain/Loss %" value={formatSignedPercent(ipo.actualGainPercentage)} tone={ipo.actualGainPercentage} />
                <Field label="Measured Against" value={formatCurrency(ipo.basisPrice)} />
                <Field label="Lot Size" value={ipo.lotSize ? `${ipo.lotSize} shares` : "Not available"} />
              </dl>
              <p className="mt-3 text-xs leading-5 text-zinc-500">
                Historical result from the reported listing price, compared with the
                {ipo.priceBasis === "UPPER_PRICE_BAND" ? " upper price band (final issue price not reported)" : " issue price"}.
                Excludes brokerage, taxes and charges.
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-500">
              Listed on {formatDate(ipo.listingDate)}. The listing price is not available yet, so
              listing gains are not shown.
            </p>
          )}
        </Section>
      ) : null}

      {(research.strengths.length > 0 || research.risks.length > 0) ? (
        <Section title="Company Strengths & Risks">
          <div className="grid gap-6 md:grid-cols-2">
            {research.strengths.length > 0 ? (
              <InsightList title="Reported strengths" items={research.strengths} tone="positive" />
            ) : null}
            {research.risks.length > 0 ? (
              <InsightList title="Key risks" items={research.risks} tone="caution" />
            ) : null}
          </div>
          <p className="mt-5 text-xs leading-5 text-zinc-500">
            Strengths and risks are summaries supplied by our IPO data provider (IPO Alert), not IPONexa&apos;s
            opinion. Review the offer document for the complete risk factors.
          </p>
        </Section>
      ) : null}

      {sourceLinks.length > 0 || research.mediaCoverageLinks.length > 0 ? (
        <Section title="Documents & Coverage">
          {sourceLinks.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {sourceLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url!}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-[#cfe0d5] px-3 py-2 text-sm font-semibold text-[#1d4a39] transition-colors hover:border-[#9ebba8] hover:bg-[#edf5ef]"
                >
                  {link.label} ↗
                </a>
              ))}
            </div>
          ) : null}
          {research.mediaCoverageLinks.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {research.mediaCoverageLinks.filter(isSafeExternalUrl).map((url, index) => (
                <li key={`${url}-${index}`}>
                  <a href={url} target="_blank" rel="noreferrer" className="break-all text-sm text-[#1d4a39] underline decoration-[#b8cfbf] underline-offset-4 hover:text-[#142820]">
                    Media coverage {index + 1} ↗
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>
      ) : null}

      <p className="mt-2 text-xs text-zinc-500">
        Sources: IPO details from IPO Alert, updated {formatDateTime(ipo.updatedAt)} IST
        {ipo.gmpSource && !isListed ? ` · GMP: ${gmpSourceLabel(ipo.gmpSource)}` : ""}
        {ipo.subscriptionSource ? ` · subscription: ${sourceLabel(ipo.subscriptionSource)}` : ""}
        {ipo.actualListingPrice !== null ? " · listing price: NSE/BSE end-of-day files" : ""}.{" "}
        <Link href="/about" className="underline underline-offset-2">
          About our data
        </Link>
      </p>

      <div className="mt-8">
        <GuideLinks
          title="Understand these numbers"
          links={[
            { href: "/guides/ipo-gmp-explained", label: "What is IPO GMP?", text: "Why GMP is unofficial and how the estimate is calculated." },
            { href: "/guides/ipo-subscription-explained", label: "Subscription explained", text: "QIB, NII and retail figures, and why BSE + NSE are combined." },
            { href: "/guides/ipo-allotment-process", label: "How allotment works", text: "The T+3 timeline, the retail lottery and where to check status." },
            { href: "/guides/listing-gain-calculation", label: "Listing gain calculation", text: "Estimated vs actual listing gain, and why real profit differs." },
          ]}
        />
      </div>

      <p className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
        This page is for informational and educational purposes only. It is not
        investment advice and not a recommendation to buy, sell, or apply for
        this IPO. GMP is unofficial, and estimates are not guaranteed returns.
        Subscription and other figures may change or be delayed. Please make your
        own independent decision.{" "}
        <Link href="/disclaimer" className="font-semibold underline underline-offset-2">
          Disclaimer
        </Link>
      </p>
      </div>
    </div>
  );
}

/** The one schedule fact that matters for the IPO's current stage. */
function scheduleLine(ipo: {
  status: "UPCOMING" | "OPEN" | "CLOSED" | "LISTED";
  openDate: Date | null;
  closeDate: Date | null;
  listingDate: Date | null;
}): string {
  switch (ipo.status) {
    case "UPCOMING":
      return ipo.openDate ? `Opens ${formatDate(ipo.openDate)}` : "Dates not announced yet";
    case "OPEN":
      return `Closes ${formatDate(ipo.closeDate)}`;
    case "CLOSED":
      return `Closed ${formatDate(ipo.closeDate)} · ${ipo.listingDate ? `lists ${formatDate(ipo.listingDate)}` : "listing date not announced"}`;
    case "LISTED":
      return `Listed ${formatDate(ipo.listingDate)}`;
  }
}

function formatShares(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

function isSafeExternalUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function InsightList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "positive" | "caution";
}) {
  const markerClass = tone === "positive" ? "bg-emerald-500" : "bg-amber-500";
  const panelClass = tone === "positive"
    ? "border-emerald-100 bg-emerald-50/70"
    : "border-rose-100 bg-rose-50/60";

  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${panelClass}`}>
      <h3 className="mb-3 text-sm font-bold text-zinc-800">{title}</h3>
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex gap-3 text-sm leading-6 text-zinc-700">
            <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${markerClass}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const daywiseColumns: Array<{ key: keyof DaywiseSubscriptionRow; label: string }> = [
  { key: "qib", label: "QIB (Ex Anchor)" },
  { key: "nii", label: "NII" },
  { key: "niiBig", label: "NII (> ₹10L)" },
  { key: "niiSmall", label: "NII (< ₹10L)" },
  { key: "retail", label: "Retail" },
  { key: "employee", label: "EMP" },
  { key: "shareholders", label: "Shareholders" },
  { key: "total", label: "Total" },
];

const dayLabelFormat = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", month: "short", day: "numeric" });

/**
 * Subscription at the end of each bidding day (the last official figures
 * NSE published that day). Columns with no figures for any day are hidden.
 */
function DaywiseSubscription({ rows, live }: { rows: DaywiseSubscriptionRow[]; live: boolean }) {
  const columns = daywiseColumns.filter((column) => rows.some((row) => row[column.key] !== null));
  const last = rows[rows.length - 1];
  return (
    <div className="mt-6">
      <h3 className="mb-2 text-sm font-bold text-zinc-900">Day-wise subscription (times)</h3>
      <div className="overflow-x-auto rounded-xl border border-zinc-100">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-[#f6faf9]">
            <tr className="text-xs text-zinc-500">
              <th className="px-3 py-2 text-left font-semibold">Date</th>
              {columns.map((column) => (
                <th key={column.key} className="px-3 py-2 text-right font-semibold">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.date} className="border-t border-zinc-100">
                <td className="whitespace-nowrap px-3 py-2 text-zinc-700">
                  {dayLabelFormat.format(new Date(`${row.date}T12:00:00+05:30`))}{" "}
                  <span className="text-xs text-zinc-500">
                    (Day {row.day}
                    {live && row === last ? ", live" : ""})
                  </span>
                </td>
                {columns.map((column) => {
                  const value = row[column.key] as number | null;
                  return (
                    <td
                      key={column.key}
                      className={`px-3 py-2 text-right tabular-nums ${column.key === "total" ? "font-bold text-zinc-900" : "text-zinc-700"}`}
                    >
                      {value === null ? "—" : value.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Each day shows the last figures NSE published that day (Day {last.day}: {formatDateTime(last.updatedAt)}).
        {rows[0].day > 1 ? " Earlier days were not recorded." : ""}
      </p>
    </div>
  );
}

function sourceLabel(source: string | null): string {
  return subscriptionSourceLabel(source);
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 rounded-[20px] border border-[#e0e8e2] bg-white/95 p-5 shadow-[0_8px_24px_rgba(25,45,36,0.045)] sm:p-6">
      <h2 className="mb-5 flex items-center gap-3 text-base font-bold text-zinc-900 sm:text-lg">
        <span aria-hidden="true" className="h-6 w-1.5 rounded-full bg-gradient-to-b from-emerald-500 to-amber-400" />
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Pass `tone` to colour a gain/loss figure green, muted red, or grey when unavailable. */
function Field({ label, value, tone }: { label: string; value: string; tone?: number | null }) {
  const valueClass = tone === undefined ? "text-zinc-900" : toneClass(tone);
  return (
    <div className="min-w-0 border-l border-emerald-100 pl-3">
      <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500">{label}</dt>
      <dd className={`mt-1 break-words text-[15px] font-semibold tabular-nums ${valueClass}`}>{value}</dd>
    </div>
  );
}
