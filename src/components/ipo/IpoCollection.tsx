"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ipo/IpoSection";
import { IpoCard } from "@/components/ipo/IpoCard";
import { RecentlyListedIpoCard } from "@/components/ipo/RecentlyListedIpoCard";
import { useViewMode, ViewModeToggle } from "@/components/ipo/view-mode";
import { Figure, IpoTypeBadge, StatusBadge } from "@/components/gmp/indicators";
import type { IpoListItem } from "@/services/ipo-query-service";
import {
  formatCurrency,
  formatPriceBand,
  formatShortDate,
  formatSignedCurrency,
  formatSignedPercent,
  formatSubscriptionTimes,
} from "@/utils/format";

type Accent = "blue" | "emerald" | "amber" | "slate";

/**
 * A set of IPOs shown as cards (grid) or compact rows (list), following the
 * visitor's remembered layout choice. Listed IPOs show listing results;
 * everything else shows pricing, dates and GMP.
 */
export function IpoCollection({
  items,
  listed = false,
  emptyMessage,
  accent = "blue",
}: {
  items: IpoListItem[];
  listed?: boolean;
  emptyMessage: string;
  accent?: Accent;
}) {
  const [mode, setMode] = useViewMode();

  if (items.length === 0) return <EmptyState accent={accent} message={emptyMessage} />;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-zinc-500">
          {items.length} {items.length === 1 ? "IPO" : "IPOs"}
        </p>
        <ViewModeToggle mode={mode} onChange={setMode} />
      </div>

      {mode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((ipo) =>
            listed ? <RecentlyListedIpoCard key={ipo.slug} ipo={ipo} /> : <IpoCard key={ipo.slug} ipo={ipo} />,
          )}
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-[#dce7e5] bg-white shadow-[0_4px_16px_rgba(23,74,82,0.045)]">
          <ListHeader listed={listed} />
          {items.map((ipo) => (
            <li key={ipo.slug} className="border-t border-zinc-100 first:border-t-0">
              {listed ? <ListedRow ipo={ipo} /> : <StandardRow ipo={ipo} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Shared by the header and every row so the columns line up (rows are
// separate grids, so no "auto" tracks).
const STANDARD_COLUMNS =
  "md:grid-cols-[minmax(0,2.2fr)_8.5rem_minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.7fr)_1rem]";
const LISTED_COLUMNS =
  "md:grid-cols-[minmax(0,2.2fr)_minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,0.7fr)_1rem]";

const STANDARD_HEADINGS: Array<[string, boolean]> = [
  ["Company", false],
  ["Status", false],
  ["Price", false],
  ["Dates", false],
  ["GMP", true],
  ["Est. / lot*", true],
  ["Subs.", true],
];
const LISTED_HEADINGS: Array<[string, boolean]> = [
  ["Company", false],
  ["Listed", false],
  ["Issue price", false],
  ["Listing price", true],
  ["Gain", true],
  ["Gain / lot", true],
  ["Subs.", true],
];

/** Column headings for list view (desktop; phones show a label in each cell). */
function ListHeader({ listed }: { listed: boolean }) {
  const headings = listed ? LISTED_HEADINGS : STANDARD_HEADINGS;
  return (
    <li
      aria-hidden="true"
      className={`hidden gap-x-4 bg-[#f4f8f7] px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.07em] text-zinc-500 sm:px-5 md:grid ${listed ? LISTED_COLUMNS : STANDARD_COLUMNS}`}
    >
      {headings.map(([label, right]) => (
        <span key={label} className={right ? "text-right" : undefined}>
          {label}
        </span>
      ))}
      <span />
    </li>
  );
}

const rowLink =
  "group grid items-center gap-x-4 gap-y-2 px-4 py-3 text-sm transition-colors hover:bg-[#f6faf9] sm:px-5";

function NameCell({ ipo }: { ipo: IpoListItem }) {
  return (
    <span className="min-w-0">
      <span className="block truncate font-bold text-zinc-900 group-hover:text-[#174a52]">{ipo.companyName}</span>
      <span className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500">
        <IpoTypeBadge ipoType={ipo.ipoType} />
        {ipo.exchange}
      </span>
    </span>
  );
}

function Cell({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <span className={`min-w-0 ${className}`}>
      <span className="block text-[10px] font-bold uppercase tracking-[0.07em] text-zinc-400 md:hidden">{label}</span>
      <span className="block truncate font-medium text-zinc-800">{children}</span>
    </span>
  );
}

function StandardRow({ ipo }: { ipo: IpoListItem }) {
  const dates =
    ipo.status === "CLOSED"
      ? `Lists ${formatShortDate(ipo.listingDate)}`
      : ipo.openDate
        ? `${formatShortDate(ipo.openDate)} – ${formatShortDate(ipo.closeDate)}`
        : "Dates not announced";

  return (
    <Link
      href={`/ipo/${ipo.slug}`}
      className={`${rowLink} grid-cols-2 ${STANDARD_COLUMNS}`}
    >
      <span className="col-span-2 flex items-start justify-between gap-3 md:col-span-1">
        <NameCell ipo={ipo} />
        <span className="md:hidden"><StatusBadge status={ipo.status} /></span>
      </span>
      <span className="hidden md:block"><StatusBadge status={ipo.status} /></span>
      <Cell label="Price">{formatPriceBand(ipo.issuePrice ?? ipo.priceBandLow, ipo.issuePrice ?? ipo.priceBandHigh)}</Cell>
      <Cell label="Dates">{dates}</Cell>
      <Cell label="GMP" className="md:text-right">
        <Figure value={ipo.gmp} format={formatSignedCurrency} toned className="font-semibold" />{" "}
        <Figure value={ipo.gmpPercentage} format={formatSignedPercent} toned className="text-xs" />
      </Cell>
      <Cell label="Est. / lot*" className="md:text-right">
        <Figure value={ipo.estimatedGainPerLot} format={formatSignedCurrency} toned className="font-semibold" />
      </Cell>
      <Cell label="Subs." className="md:text-right">
        <Figure value={ipo.subscriptionTimes} format={formatSubscriptionTimes} />
      </Cell>
      <span aria-hidden="true" className="hidden text-[#174a52] transition-transform group-hover:translate-x-1 md:block">→</span>
    </Link>
  );
}

function ListedRow({ ipo }: { ipo: IpoListItem }) {
  return (
    <Link
      href={`/ipo/${ipo.slug}`}
      className={`${rowLink} grid-cols-2 ${LISTED_COLUMNS}`}
    >
      <span className="col-span-2 md:col-span-1"><NameCell ipo={ipo} /></span>
      <Cell label="Listed">{formatShortDate(ipo.listingDate)}</Cell>
      <Cell label="Issue price">{formatPriceBand(ipo.issuePrice ?? ipo.priceBandLow, ipo.issuePrice ?? ipo.priceBandHigh)}</Cell>
      <Cell label="Listing price" className="md:text-right">
        {ipo.actualListingPrice !== null ? (
          <span className="font-semibold">{formatCurrency(ipo.actualListingPrice)}</span>
        ) : (
          <span className="text-xs text-zinc-400">Not available yet</span>
        )}
      </Cell>
      <Cell label="Gain" className="md:text-right">
        <Figure value={ipo.actualGainPercentage} format={formatSignedPercent} toned className="font-semibold" />
      </Cell>
      <Cell label="Gain / lot" className="md:text-right">
        <Figure value={ipo.actualGainPerLot} format={formatSignedCurrency} toned className="font-semibold" />
      </Cell>
      <Cell label="Subs." className="md:text-right">
        <Figure value={ipo.subscriptionTimes} format={formatSubscriptionTimes} />
      </Cell>
      <span aria-hidden="true" className="hidden text-[#174a52] transition-transform group-hover:translate-x-1 md:block">→</span>
    </Link>
  );
}
