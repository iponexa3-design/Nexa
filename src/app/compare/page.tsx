import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Figure,
  GmpFreshnessNote,
  IpoTypeBadge,
  PriceBasisNote,
  StatusBadge,
} from "@/components/gmp/indicators";
import { getGmpTrackerData } from "@/services/ipo-query-service";
import {
  COMPARE_MAX,
  COMPARE_MIN,
  type GmpTrackerRow,
  type TrackerCategory,
} from "@/services/gmp-tracker";
import {
  formatCurrency,
  formatDate,
  formatPriceBand,
  formatSignedCurrency,
  formatSignedPercent,
  formatSubscriptionTimes,
} from "@/utils/format";

export const metadata: Metadata = {
  title: "Compare IPO - GMP, Estimates & Listing",
  description: "Compare two or three IPOs side by side: price, lot size, GMP, indicative estimates and actual listing results.",
  // Every selection (?ipos=a,b) is a view of the same page.
  alternates: { canonical: "/compare" },
};

const groupLabels: Record<TrackerCategory, string> = {
  open: "Open",
  closed: "Awaiting listing",
  upcoming: "Upcoming",
  listed: "Listed",
};

function parseSelection(params: Record<string, string | string[] | undefined>): string[] {
  const values = [params.ipos, params.ipo].flatMap((value) =>
    value === undefined ? [] : Array.isArray(value) ? value : [value],
  );
  const slugs = values.flatMap((value) => value.split(",")).map((slug) => slug.trim()).filter(Boolean);
  return [...new Set(slugs)].slice(0, COMPARE_MAX);
}

const plain = (value: number) => formatCurrency(value);
const signed = (value: number) => formatSignedCurrency(value);
const signedPercent = (value: number) => formatSignedPercent(value);

export default async function ComparePage(props: PageProps<"/compare">) {
  const [data, params] = await Promise.all([getGmpTrackerData(), props.searchParams]);
  const requested = parseSelection(params);
  const bySlug = new Map(data.rows.map((row) => [row.slug, row]));
  const chosen = requested.flatMap((slug) => {
    const row = bySlug.get(slug);
    return row ? [row] : [];
  });
  const missing = requested.filter((slug) => !bySlug.has(slug));
  const ready = chosen.length >= COMPARE_MIN;

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#eaf3f2_0%,#f3f7f6_360px,#f3f7f6_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-6 rounded-[24px] border border-[#174a52] bg-[linear-gradient(125deg,#123a41_0%,#174a52_62%,#28727b_100%)] px-6 py-7 text-white shadow-[0_20px_50px_rgba(23,74,82,0.16)] sm:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c6e0df]">Side by side</p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">Compare IPO</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#d7e8e7]">
            Pick two or three IPOs to compare pricing, GMP, indicative estimates and actual listing results.
          </p>
        </header>

        <form method="get" className="mb-6 rounded-[20px] border border-[#e0e8e6] bg-white p-4 shadow-[0_8px_24px_rgba(23,74,82,0.05)] sm:p-5">
          <div className="grid gap-3 md:grid-cols-[repeat(3,minmax(0,1fr))_auto] md:items-end">
            {Array.from({ length: COMPARE_MAX }, (_, index) => (
              <label key={index} className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-500">
                  IPO {index + 1}{index >= COMPARE_MIN ? " (optional)" : ""}
                </span>
                <select
                  name="ipo"
                  required={index < COMPARE_MIN}
                  defaultValue={chosen[index]?.slug ?? ""}
                  className="w-full rounded-xl border border-[#dce7e5] bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-[#4f8f93] focus:ring-2 focus:ring-[#cfe4e3]"
                >
                  {/* Optional slots keep this choice selectable to clear them. */}
                  <option value="" disabled={index < COMPARE_MIN}>
                    Select an IPO
                  </option>
                  {(Object.keys(groupLabels) as TrackerCategory[]).map((category) => {
                    const options = data.rows.filter((row) => row.category === category);
                    if (options.length === 0) return null;
                    return (
                      <optgroup key={category} label={groupLabels[category]}>
                        {options.map((row) => (
                          <option key={row.slug} value={row.slug}>
                            {row.companyName} ({row.ipoType === "SME" ? "SME" : "Mainboard"})
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </label>
            ))}
            <button
              type="submit"
              disabled={data.rows.length < COMPARE_MIN}
              className="rounded-xl bg-[#174a52] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#123a41] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Compare
            </button>
          </div>
          {data.rows.length < COMPARE_MIN ? (
            <p className="mt-3 text-sm text-zinc-600">
              At least {COMPARE_MIN} IPO records are needed to compare; {data.rows.length} available right now.
            </p>
          ) : null}
          {missing.length > 0 || (requested.length > 0 && !ready) ? (
            <p role="alert" className="mt-3 text-sm text-amber-800">
              {missing.length > 0
                ? `Not found: ${missing.join(", ")}. `
                : ""}
              {ready ? "" : `Choose at least ${COMPARE_MIN} different IPOs (up to ${COMPARE_MAX}) to see the comparison.`}
            </p>
          ) : null}
        </form>

        {ready ? <ComparisonTable rows={chosen} /> : null}

        <p className="mt-6 text-xs leading-5 text-zinc-500">
          *Estimates use issue price + latest GMP (upper price band where the final price is not known) and
          exclude brokerage, taxes and charges. GMP is unofficial and indicative; this comparison is not
          investment advice. Browse all records in the{" "}
          <Link href="/gmp-tracker" className="font-semibold text-[#174a52] underline underline-offset-4">GMP Tracker</Link>.
        </p>
      </div>
    </div>
  );
}

function ComparisonTable({ rows }: { rows: GmpTrackerRow[] }) {
  const metric = (label: string, render: (row: GmpTrackerRow) => ReactNode) => ({ label, render });
  // Grey-market figures stop mattering once an IPO has listed.
  const preListing = (label: string, render: (row: GmpTrackerRow) => ReactNode) =>
    metric(label, (row) =>
      row.status === "LISTED" ? <span className="text-xs font-normal text-zinc-500">Listed: not applicable</span> : render(row),
    );
  const groups: Array<{ title: string; metrics: ReturnType<typeof metric>[] }> = [
    {
      title: "Issue",
      metrics: [
        metric("Category", (row) => <IpoTypeBadge ipoType={row.ipoType} />),
        metric("Status", (row) => <StatusBadge status={row.status} />),
        metric("Exchange", (row) => row.exchange),
        metric("Open date", (row) => formatDate(row.openDate)),
        metric("Close date", (row) => formatDate(row.closeDate)),
        metric("Issue price", (row) => (
          <>
            {formatPriceBand(row.issuePrice ?? row.priceBandLow, row.issuePrice ?? row.priceBandHigh)}
            <span className="block text-[11px] font-normal">
              <PriceBasisNote priceBasis={row.priceBasis} basisPrice={row.basisPrice} />
            </span>
          </>
        )),
        metric("Lot size", (row) => <Figure value={row.lotSize} format={(value) => `${value} shares`} />),
        metric("Min. application", (row) => <Figure value={row.minimumInvestment} format={plain} />),
        metric("Subscription", (row) => <Figure value={row.subscriptionTimes} format={formatSubscriptionTimes} />),
      ],
    },
    {
      title: "GMP estimate (indicative)*",
      metrics: [
        preListing("Latest GMP", (row) => (
          <>
            <Figure value={row.gmp} format={signed} toned />
            <span className="block text-[11px] font-normal">
              <GmpFreshnessNote freshness={row.gmpFreshness} sourceUpdatedAt={row.gmpSourceUpdatedAt} status={row.status} source={row.gmpSource} />
            </span>
          </>
        )),
        preListing("GMP %", (row) => <Figure value={row.gmpPercentage} format={signedPercent} toned />),
        preListing("Est. listing price", (row) => <Figure value={row.estimatedListingPrice} format={plain} />),
        preListing("Est. P/L per share", (row) => <Figure value={row.estimatedGainPerShare} format={signed} toned />),
        preListing("Est. P/L per lot", (row) => <Figure value={row.estimatedGainPerLot} format={signed} toned />),
      ],
    },
    {
      title: "Actual listing (historical)",
      metrics: [
        metric("Listing date", (row) => formatDate(row.listingDate)),
        metric("Actual listing price", (row) =>
          row.status !== "LISTED" ? (
            <span className="text-zinc-500">Not listed yet</span>
          ) : row.actualListingPrice === null ? (
            <span className="text-xs font-normal text-zinc-500">Not available yet</span>
          ) : (
            <Figure value={row.actualListingPrice} format={plain} />
          ),
        ),
        metric("Actual gain/loss per share", (row) => <Figure value={row.actualGainPerShare} format={signed} toned />),
        metric("Actual gain/loss per lot", (row) => <Figure value={row.actualGainPerLot} format={signed} toned />),
        metric("Actual gain/loss %", (row) => <Figure value={row.actualGainPercentage} format={signedPercent} toned />),
      ],
    },
  ];

  return (
    <div className="overflow-hidden rounded-[20px] border border-[#e0e8e6] bg-white shadow-[0_10px_30px_rgba(23,74,82,0.06)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-[160px] sm:w-[200px]" />
            {rows.map((row) => <col key={row.slug} />)}
          </colgroup>
          <thead>
            <tr className="border-b border-zinc-100">
              <th scope="col" className="sticky left-0 bg-white px-4 py-4"><span className="sr-only">Metric</span></th>
              {rows.map((row) => (
                <th key={row.slug} scope="col" className="px-4 py-4 align-top">
                  <Link href={`/ipo/${row.slug}`} className="font-bold leading-5 text-zinc-900 hover:text-[#174a52]">
                    {row.companyName}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          {groups.map((group) => (
            <tbody key={group.title}>
              <tr>
                <th colSpan={rows.length + 1} scope="colgroup" className="bg-[#f4f8f7] px-4 py-2 text-[10.5px] font-bold uppercase tracking-[0.08em] text-zinc-500">
                  {group.title}
                </th>
              </tr>
              {group.metrics.map((item) => (
                <tr key={item.label} className="border-t border-zinc-100">
                  <th scope="row" className="sticky left-0 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-500">
                    {item.label}
                  </th>
                  {rows.map((row) => (
                    <td key={row.slug} className="px-4 py-2.5 font-semibold text-zinc-800">
                      {item.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
}
