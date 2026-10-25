"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useViewMode, ViewModeToggle } from "@/components/ipo/view-mode";
import {
  Figure,
  GmpFreshnessNote,
  IpoTypeBadge,
  PriceBasisNote,
  StatusBadge,
} from "@/components/gmp/indicators";
import {
  COMPARE_MAX,
  COMPARE_MIN,
  filterTrackerRows,
  LISTED_HISTORY_DAYS,
  listedWithin,
  summarizeListedRows,
  type GmpTrackerRow,
  type TrackerCategory,
  type TrackerFilters,
} from "@/services/gmp-tracker";
import {
  formatCurrency,
  formatPriceBand,
  formatShortDate,
  formatSignedCurrency,
  formatSignedPercent,
  formatSubscriptionTimes,
} from "@/utils/format";

const tabs: Array<{ key: TrackerFilters["category"]; label: string }> = [
  { key: "all", label: "All IPOs" },
  { key: "open", label: "Open" },
  { key: "upcoming", label: "Upcoming" },
  { key: "closed", label: "Awaiting listing" },
  { key: "listed", label: "Listed" },
];

// Status colours: tabs get a tinted background; rows and cards get a pale
// tint plus a stronger left stripe. Tints stay pale so the green/red gain
// and loss figures remain the strongest colour in each row.
const tabStyles: Record<TrackerFilters["category"], { idle: string; active: string; count: string }> = {
  all: {
    idle: "border-[#dce7e5] bg-white text-zinc-700 hover:border-[#9bc2c2]",
    active: "border-[#174a52] bg-[#174a52] text-white shadow-[0_6px_16px_rgba(23,74,82,0.22)]",
    count: "bg-[#eef4f3] text-zinc-600",
  },
  open: {
    idle: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400",
    active: "border-emerald-600 bg-emerald-600 text-white shadow-[0_6px_16px_rgba(5,150,105,0.28)]",
    count: "bg-emerald-100 text-emerald-800",
  },
  upcoming: {
    idle: "border-sky-200 bg-sky-50 text-sky-800 hover:border-sky-400",
    active: "border-sky-600 bg-sky-600 text-white shadow-[0_6px_16px_rgba(2,132,199,0.28)]",
    count: "bg-sky-100 text-sky-800",
  },
  closed: {
    idle: "border-violet-200 bg-violet-50 text-violet-800 hover:border-violet-400",
    active: "border-violet-600 bg-violet-600 text-white shadow-[0_6px_16px_rgba(124,58,237,0.28)]",
    count: "bg-violet-100 text-violet-800",
  },
  listed: {
    idle: "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-400",
    active: "border-amber-600 bg-amber-600 text-white shadow-[0_6px_16px_rgba(217,119,6,0.28)]",
    count: "bg-amber-100 text-amber-800",
  },
};

const rowStripe: Record<GmpTrackerRow["category"], string> = {
  open: "shadow-[inset_4px_0_0_#059669]",
  upcoming: "shadow-[inset_4px_0_0_#0284c7]",
  closed: "shadow-[inset_4px_0_0_#7c3aed]",
  listed: "shadow-[inset_4px_0_0_#d97706]",
};

// Opaque colours: the sticky company cell must cover columns scrolling under it.
const rowTint: Record<GmpTrackerRow["category"], { base: string; strong: string; hover: string; cellHover: string }> = {
  open: { base: "bg-[#dcf3e7]", strong: "bg-[#bfe8d2]", hover: "hover:bg-[#cdeedd]", cellHover: "group-hover:bg-[#cdeedd]" },
  upcoming: { base: "bg-[#dcecf9]", strong: "bg-[#bcd9f2]", hover: "hover:bg-[#cde3f6]", cellHover: "group-hover:bg-[#cde3f6]" },
  closed: { base: "bg-[#ebe5fa]", strong: "bg-[#d4c8f3]", hover: "hover:bg-[#e0d7f7]", cellHover: "group-hover:bg-[#e0d7f7]" },
  listed: { base: "bg-[#fcefcf]", strong: "bg-[#f7dca0]", hover: "hover:bg-[#fae6b8]", cellHover: "group-hover:bg-[#fae6b8]" },
};

function rowClasses(category: GmpTrackerRow["category"], selected: boolean) {
  const tint = rowTint[category];
  return `group align-top transition-colors ${selected ? tint.strong : `${tint.base} ${tint.hover}`}`;
}

function stickyCellClasses(category: GmpTrackerRow["category"], selected: boolean) {
  const tint = rowTint[category];
  return `sticky left-0 z-10 px-4 py-3 ${rowStripe[category]} ${selected ? tint.strong : `${tint.base} ${tint.cellHover}`}`;
}

const cardStripe: Record<GmpTrackerRow["category"], string> = {
  open: "border-l-emerald-600",
  upcoming: "border-l-sky-600",
  closed: "border-l-violet-600",
  listed: "border-l-amber-600",
};

const typeOptions: Array<{ key: TrackerFilters["ipoType"]; label: string }> = [
  { key: "all", label: "All" },
  { key: "MAINBOARD", label: "Mainboard" },
  { key: "SME", label: "SME" },
];

const plain = (value: number) => formatCurrency(value);
const signed = (value: number) => formatSignedCurrency(value);
const signedPercent = (value: number) => formatSignedPercent(value);

const LISTED_WINDOWS = [
  { days: 30, label: "30 days" },
  { days: LISTED_HISTORY_DAYS, label: `${LISTED_HISTORY_DAYS} days` },
] as const;

export function GmpTracker({
  rows,
  initialFilters,
  nowIso,
}: {
  rows: GmpTrackerRow[];
  initialFilters: TrackerFilters;
  /** Server render time, so the listing window matches on server and client. */
  nowIso: string;
}) {
  const [filters, setFilters] = useState<TrackerFilters>(initialFilters);
  const [selected, setSelected] = useState<string[]>([]);
  const [layout, setLayout] = useViewMode("iponexa:tracker-view", "list");
  const [listedWindowDays, setListedWindowDays] = useState<number>(LISTED_WINDOWS[0].days);

  const counts = useMemo(() => {
    const byCategory: Record<TrackerCategory | "all", number> = {
      all: 0,
      open: 0,
      upcoming: 0,
      closed: 0,
      listed: 0,
    };
    for (const row of filterTrackerRows(rows, { ...filters, category: "all" })) {
      byCategory.all++;
      byCategory[row.category]++;
    }
    return byCategory;
  }, [rows, filters]);

  const visibleRows = useMemo(() => {
    const filtered = filterTrackerRows(rows, filters);
    // The Listed tab shows one listing window at a time; its summary uses the same rows.
    if (filters.category !== "listed") return filtered;
    const now = new Date(nowIso);
    return filtered.filter((row) => listedWithin(row, now, listedWindowDays));
  }, [rows, filters, nowIso, listedWindowDays]);

  function updateFilters(next: Partial<TrackerFilters>) {
    const merged = { ...filters, ...next };
    setFilters(merged);
    // Keep the view shareable/bookmarkable without a server round trip.
    const params = new URLSearchParams();
    if (merged.category !== "all") params.set("status", merged.category);
    if (merged.ipoType !== "all") params.set("type", merged.ipoType.toLowerCase());
    if (merged.query.trim()) params.set("q", merged.query.trim());
    const search = params.toString();
    window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
  }

  function toggleSelected(slug: string) {
    setSelected((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : current.length >= COMPARE_MAX
          ? current
          : [...current, slug],
    );
  }

  const selectionFull = selected.length >= COMPARE_MAX;
  const canCompare = selected.length >= COMPARE_MIN;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label="IPO status"
          className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
        >
          {tabs
            .filter((tab) => tab.key !== "closed" || counts.closed > 0 || filters.category === "closed")
            .map((tab) => {
              const active = filters.category === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => updateFilters({ category: tab.key })}
                  className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors ${
                    active ? tabStyles[tab.key].active : tabStyles[tab.key].idle
                  }`}
                >
                  {tab.label}
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[11px] tabular-nums ${
                      active ? "bg-white/20 text-white" : tabStyles[tab.key].count
                    }`}
                  >
                    {counts[tab.key]}
                  </span>
                </button>
              );
            })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative block sm:w-64">
            <span className="sr-only">Search company</span>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            >
              <path d="m20 20-4.2-4.2M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={filters.query}
              onChange={(event) => updateFilters({ query: event.target.value })}
              placeholder="Search company"
              className="w-full rounded-xl border border-[#dce7e5] bg-white py-2 pl-9 pr-3 text-sm text-zinc-800 outline-none transition-colors placeholder:text-zinc-400 focus:border-[#4f8f93] focus:ring-2 focus:ring-[#cfe4e3]"
            />
          </label>
          <div className="hidden lg:block">
            <ViewModeToggle mode={layout} onChange={setLayout} />
          </div>
          <div role="group" aria-label="IPO category" className="inline-flex rounded-xl border border-[#dce7e5] bg-white p-1">
            {typeOptions.map((option) => {
              const active = filters.ipoType === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => updateFilters({ ipoType: option.key })}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors sm:flex-none ${
                    active ? "bg-[#e6f0ef] text-[#174a52]" : "text-zinc-500 hover:text-[#174a52]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {filters.category === "listed" ? (
        <ListedSummaryStrip
          rows={visibleRows}
          windowDays={listedWindowDays}
          onWindowChange={setListedWindowDays}
          filtered={filters.ipoType !== "all" || filters.query.trim() !== ""}
        />
      ) : null}

      {visibleRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#b9d4d2] bg-white/70 px-6 py-12 text-center">
          <h2 className="text-base font-bold text-zinc-900">No IPOs match this view</h2>
          <p className="mt-2 text-sm text-zinc-600">
            {rows.length === 0
              ? "IPO records will appear here once the data feed has been ingested."
              : "Try another status tab, category or search term."}
          </p>
        </div>
      ) : (
        <>
          {layout === "grid" ? null : filters.category === "listed" ? (
            <ListedTable rows={visibleRows} selected={selected} selectionFull={selectionFull} onToggle={toggleSelected} />
          ) : filters.category === "all" ? (
            <GroupedTables rows={visibleRows} selected={selected} selectionFull={selectionFull} onToggle={toggleSelected} />
          ) : (
            <PreListingTable rows={visibleRows} selected={selected} selectionFull={selectionFull} onToggle={toggleSelected} />
          )}

          <ul className={layout === "grid" ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3" : "space-y-3 lg:hidden"}>
            {visibleRows.map((row) => (
              <MobileCard
                key={row.slug}
                row={row}
                checked={selected.includes(row.slug)}
                disabled={!selected.includes(row.slug) && selectionFull}
                onToggle={toggleSelected}
              />
            ))}
          </ul>
        </>
      )}

      {selected.length > 0 ? (
        <div className="sticky bottom-4 z-20 mt-5 flex flex-col gap-3 rounded-2xl border border-[#174a52] bg-[#123a41] px-4 py-3 text-white shadow-[0_18px_40px_rgba(18,58,65,0.3)] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            <span className="font-bold tabular-nums">{selected.length} of {COMPARE_MAX}</span> selected
            <span className="text-[#c6e0df]">
              {canCompare
                ? selectionFull ? " · maximum reached" : ` · you can add ${COMPARE_MAX - selected.length} more`
                : ` · pick at least ${COMPARE_MIN - selected.length} more`}
            </span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelected([])}
              className="rounded-lg border border-white/20 px-3 py-2 text-xs font-bold text-white hover:bg-white/10"
            >
              Clear
            </button>
            {canCompare ? (
              <Link
                href={`/compare?ipos=${selected.map(encodeURIComponent).join(",")}`}
                className="rounded-lg bg-white px-4 py-2 text-xs font-bold text-[#123a41] hover:bg-[#e6f0ef]"
              >
                Compare IPO ({selected.length}) →
              </Link>
            ) : (
              <span aria-disabled="true" className="cursor-not-allowed rounded-lg bg-white/20 px-4 py-2 text-xs font-bold text-white/70">
                Compare IPO
              </span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CompareCheckbox({
  row,
  checked,
  disabled,
  onToggle,
}: {
  row: GmpTrackerRow;
  checked: boolean;
  disabled: boolean;
  onToggle: (slug: string) => void;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={() => onToggle(row.slug)}
      aria-label={`Select ${row.companyName} to compare`}
      title={disabled ? `You can compare up to ${COMPARE_MAX} IPOs` : "Select to compare"}
      className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-zinc-300 accent-[#174a52] disabled:cursor-not-allowed disabled:opacity-40"
    />
  );
}

/** Expected listing date for an IPO that has not listed yet. */
function ListingCell({ row }: { row: GmpTrackerRow }) {
  return (
    <span className="text-zinc-500">
      {row.listingDate ? `Expected ${formatShortDate(row.listingDate)}` : "Date not announced"}
    </span>
  );
}

function ListedSummaryStrip({
  rows,
  windowDays,
  onWindowChange,
  filtered,
}: {
  rows: GmpTrackerRow[];
  windowDays: number;
  onWindowChange: (days: number) => void;
  filtered: boolean;
}) {
  const summary = summarizeListedRows(rows);
  const period = LISTED_WINDOWS.find((option) => option.days === windowDays)?.label ?? `${windowDays} days`;

  return (
    <section
      aria-label="Listing results summary"
      className="mb-4 rounded-[20px] border border-[#e0e8e6] bg-white p-4 shadow-[0_8px_24px_rgba(23,74,82,0.05)] sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">
          <span className="font-bold text-zinc-900">Listing results, last {period}</span>
          {filtered ? " · matching your filters" : ""}
          {summary.total > summary.withResult
            ? ` · ${summary.total - summary.withResult} without a listing price yet`
            : ""}
        </p>
        <div role="group" aria-label="Listing period" className="inline-flex rounded-xl border border-[#dce7e5] bg-white p-1">
          {LISTED_WINDOWS.map((option) => {
            const active = option.days === windowDays;
            return (
              <button
                key={option.days}
                type="button"
                aria-pressed={active}
                onClick={() => onWindowChange(option.days)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  active ? "bg-[#e6f0ef] text-[#174a52]" : "text-zinc-500 hover:text-[#174a52]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {summary.withResult === 0 ? (
        <p className="text-sm text-zinc-500">No listing results in this period.</p>
      ) : (
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryStat label="Average listing gain">
            <Figure value={summary.averageGainPercentage} format={signedPercent} toned />
          </SummaryStat>
          <SummaryStat label={summary.unchanged > 0 ? "Higher / lower / unchanged" : "Listed higher / lower"}>
            <span className="text-zinc-900">
              <span className="text-emerald-800">{summary.higher}</span>
              <span className="text-zinc-400"> / </span>
              <span className="text-rose-800">{summary.lower}</span>
              {summary.unchanged > 0 ? (
                <>
                  <span className="text-zinc-400"> / </span>
                  <span className="text-zinc-700">{summary.unchanged}</span>
                </>
              ) : null}
              <span className="ml-1 text-xs font-semibold text-zinc-500">of {summary.withResult}</span>
            </span>
          </SummaryStat>
          <SummaryStat label="Best listing">
            {summary.best ? <ExtremeListing result={summary.best} ties={summary.bestTies} /> : "—"}
          </SummaryStat>
          <SummaryStat label="Worst listing">
            {summary.worst ? (
              <ExtremeListing result={summary.worst} ties={summary.worstTies} />
            ) : (
              <span className="text-zinc-400">—</span>
            )}
          </SummaryStat>
        </dl>
      )}
    </section>
  );
}

function SummaryStat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col-reverse rounded-xl bg-[#f6faf9] px-3 py-2.5">
      <dt className="text-[10px] font-bold uppercase tracking-[0.07em] text-zinc-500">{label}</dt>
      <dd className="truncate text-lg font-black tabular-nums">{children}</dd>
    </div>
  );
}

function ExtremeListing({
  result,
  ties,
}: {
  result: { slug: string; companyName: string; gainPercentage: number };
  ties: number;
}) {
  return (
    <span className="flex min-w-0 items-baseline gap-2">
      <Figure value={result.gainPercentage} format={signedPercent} toned />
      <Link
        href={`/ipo/${result.slug}`}
        title={result.companyName}
        className="min-w-0 truncate text-xs font-semibold text-zinc-600 hover:text-[#174a52] hover:underline"
      >
        {result.companyName.replace(/s+(Limited|Ltd.?)$/i, "")}
      </Link>
      {ties > 0 ? <span className="shrink-0 text-xs font-semibold text-zinc-500">+{ties} more</span> : null}
    </span>
  );
}

// Column widths (px) shared by every table of each kind; the company column
// takes what is left. Pre-listing totals 1390px, the tracker's desktop width.
const PRE_LISTING_COLUMNS = [
  "auto", "136px", "80px", "140px", "100px", "72px", "80px", "80px", "56px", "96px", "60px", "112px", "96px",
];
const LISTED_COLUMNS = ["auto", "104px", "160px", "112px", "112px", "112px", "64px", "120px", "72px", "96px"];

/** Table for IPOs that have not listed yet: GMP and indicative estimates. */
function PreListingTable({
  rows,
  selected,
  selectionFull,
  onToggle,
}: {
  rows: GmpTrackerRow[];
  selected: string[];
  selectionFull: boolean;
  onToggle: (slug: string) => void;
}) {
  return (
    <div className="hidden overflow-hidden rounded-[20px] border border-[#e0e8e6] bg-white shadow-[0_10px_30px_rgba(23,74,82,0.06)] lg:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1390px] table-fixed border-collapse text-left text-[13px]">
          <colgroup>
            {PRE_LISTING_COLUMNS.map((width, index) => (
              <col key={index} style={{ width }} />
            ))}
          </colgroup>
          <thead className="bg-[#f4f8f7] text-[10.5px] font-bold uppercase tracking-[0.07em] text-zinc-500">
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-[#f4f8f7] px-4 py-3">Company</th>
              <th scope="col" className="px-3 py-3">Status</th>
              <th scope="col" className="px-3 py-3">Open / Close</th>
              <th scope="col" className="px-3 py-3">Issue price</th>
              <th scope="col" className="px-3 py-3 text-right">Latest GMP</th>
              <th scope="col" className="px-3 py-3 text-right">GMP %</th>
              <th scope="col" className="px-3 py-3 text-right">Est. listing*</th>
              <th scope="col" className="px-3 py-3 text-right">Est. P/L share*</th>
              <th scope="col" className="px-3 py-3 text-right">Lot</th>
              <th scope="col" className="px-3 py-3 text-right">Est. P/L lot*</th>
              <th scope="col" className="px-3 py-3 text-right">Subs.</th>
              <th scope="col" className="px-3 py-3">Listing date</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">Details</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white [&_.text-zinc-400]:text-zinc-600 [&_.text-zinc-500]:text-zinc-700">
            {rows.map((row) => {
              const isSelected = selected.includes(row.slug);
              return (
                <tr key={row.slug} className={rowClasses(row.category, isSelected)}>
                  <td className={stickyCellClasses(row.category, isSelected)}>
                    <div className="flex items-start gap-3">
                      <CompareCheckbox
                        row={row}
                        checked={isSelected}
                        disabled={!isSelected && selectionFull}
                        onToggle={onToggle}
                      />
                      <div className="min-w-0">
                        <Link href={`/ipo/${row.slug}`} className="font-bold leading-5 text-zinc-900 hover:text-[#174a52]">
                          {row.companyName}
                        </Link>
                        <p className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500"><IpoTypeBadge ipoType={row.ipoType} />{row.exchange}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3"><StatusBadge status={row.status} /></td>
                  <td className="whitespace-nowrap px-3 py-3 text-zinc-700">
                    {row.openDate || row.closeDate ? (
                      <>
                        <span className="block">{row.openDate ? formatShortDate(row.openDate) : "—"}</span>
                        <span className="block text-zinc-500">{row.closeDate ? formatShortDate(row.closeDate) : "—"}</span>
                      </>
                    ) : (
                      <span className="text-zinc-400" title="Dates not announced">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className="block whitespace-nowrap font-medium text-zinc-800">
                      {formatPriceBand(row.issuePrice ?? row.priceBandLow, row.issuePrice ?? row.priceBandHigh)}
                    </span>
                    <span className="block text-[11px]">
                      <PriceBasisNote priceBasis={row.priceBasis} basisPrice={row.basisPrice} />
                    </span>
                  </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        <Figure value={row.gmp} format={signed} toned className="block font-bold" />
                        <span className="block text-[11px]">
                          <GmpFreshnessNote freshness={row.gmpFreshness} sourceUpdatedAt={row.gmpSourceUpdatedAt} status={row.status} />
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold">
                        <Figure value={row.gmpPercentage} format={signedPercent} toned />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        <Figure value={row.estimatedListingPrice} format={plain} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold">
                        <Figure value={row.estimatedGainPerShare} format={signed} toned />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right text-zinc-700">
                        <Figure value={row.lotSize} format={(value) => `${value}`} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold">
                        <Figure value={row.estimatedGainPerLot} format={signed} toned />
                      </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-zinc-700">
                    <Figure value={row.subscriptionTimes} format={formatSubscriptionTimes} />
                  </td>
                  <td className="px-3 py-3">
                    <ListingCell row={row} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      href={`/ipo/${row.slug}`}
                      aria-label={`View ${row.companyName} details`}
                      className="inline-flex whitespace-nowrap rounded-lg border border-[#c6dddc] px-3 py-1.5 text-xs font-bold text-[#174a52] transition-colors hover:border-[#8ab8ba] hover:bg-[#e6f0ef]"
                    >
                      Details
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const groupOrder: Array<{ category: GmpTrackerRow["category"]; label: string; dot: string }> = [
  { category: "open", label: "Open", dot: "bg-emerald-600" },
  { category: "closed", label: "Awaiting listing", dot: "bg-violet-600" },
  { category: "upcoming", label: "Upcoming", dot: "bg-sky-600" },
  { category: "listed", label: "Listed", dot: "bg-amber-600" },
];

/**
 * "All IPOs" on desktop: one table per status. Listed IPOs have different
 * columns (listing results, not GMP), so mixing them into one table would
 * put values under the wrong headings.
 */
function GroupedTables({
  rows,
  selected,
  selectionFull,
  onToggle,
}: {
  rows: GmpTrackerRow[];
  selected: string[];
  selectionFull: boolean;
  onToggle: (slug: string) => void;
}) {
  return (
    <div className="hidden space-y-6 lg:block">
      {groupOrder.map((group) => {
        const groupRows = rows.filter((row) => row.category === group.category);
        if (groupRows.length === 0) return null;
        const Table = group.category === "listed" ? ListedTable : PreListingTable;
        return (
          <section key={group.category} aria-label={`${group.label} IPOs`}>
            <h2 className="mb-2.5 flex items-center gap-2 text-sm font-bold text-zinc-900">
              <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${group.dot}`} />
              {group.label}
              <span className="rounded-md bg-white px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-600 ring-1 ring-[#dce7e5]">
                {groupRows.length}
              </span>
            </h2>
            <Table rows={groupRows} selected={selected} selectionFull={selectionFull} onToggle={onToggle} />
          </section>
        );
      })}
    </div>
  );
}

function ListedTable({
  rows,
  selected,
  selectionFull,
  onToggle,
}: {
  rows: GmpTrackerRow[];
  selected: string[];
  selectionFull: boolean;
  onToggle: (slug: string) => void;
}) {
  return (
    <div className="hidden overflow-hidden rounded-[20px] border border-[#e0e8e6] bg-white shadow-[0_10px_30px_rgba(23,74,82,0.06)] lg:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] table-fixed border-collapse text-left text-[13px]">
          <colgroup>
            {LISTED_COLUMNS.map((width, index) => (
              <col key={index} style={{ width }} />
            ))}
          </colgroup>
          <thead className="bg-[#f4f8f7] text-[10.5px] font-bold uppercase tracking-[0.07em] text-zinc-500">
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-[#f4f8f7] px-4 py-3">Company</th>
              <th scope="col" className="px-3 py-3">Listing date</th>
              <th scope="col" className="px-3 py-3">Issue price</th>
              <th scope="col" className="px-3 py-3 text-right">Listing price</th>
              <th scope="col" className="px-3 py-3 text-right">Listing gain %</th>
              <th scope="col" className="px-3 py-3 text-right">Gain / share</th>
              <th scope="col" className="px-3 py-3 text-right">Lot</th>
              <th scope="col" className="px-3 py-3 text-right">Gain / lot</th>
              <th scope="col" className="px-3 py-3 text-right">Subs.</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">Details</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white [&_.text-zinc-400]:text-zinc-600 [&_.text-zinc-500]:text-zinc-700">
            {rows.map((row) => {
              const isSelected = selected.includes(row.slug);
              return (
                <tr key={row.slug} className={rowClasses(row.category, isSelected)}>
                  <td className={stickyCellClasses(row.category, isSelected)}>
                    <div className="flex items-start gap-3">
                      <CompareCheckbox row={row} checked={isSelected} disabled={!isSelected && selectionFull} onToggle={onToggle} />
                      <div className="min-w-0">
                        <Link href={`/ipo/${row.slug}`} className="font-bold leading-5 text-zinc-900 hover:text-[#174a52]">
                          {row.companyName}
                        </Link>
                        <p className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500"><IpoTypeBadge ipoType={row.ipoType} />{row.exchange}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-zinc-700">{formatShortDate(row.listingDate)}</td>
                  <td className="px-3 py-3">
                    <span className="block whitespace-nowrap font-medium text-zinc-800">
                      {formatPriceBand(row.issuePrice ?? row.priceBandLow, row.issuePrice ?? row.priceBandHigh)}
                    </span>
                    <span className="block text-[11px]">
                      <PriceBasisNote priceBasis={row.priceBasis} basisPrice={row.basisPrice} />
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-bold">
                    {row.actualListingPrice !== null ? (
                      <Figure value={row.actualListingPrice} format={plain} />
                    ) : (
                      <span className="text-[11px] font-normal text-zinc-400">Not available yet</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-semibold">
                    <Figure value={row.actualGainPercentage} format={signedPercent} toned />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-semibold">
                    <Figure value={row.actualGainPerShare} format={signed} toned />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-zinc-700">
                    <Figure value={row.lotSize} format={(value) => `${value}`} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-semibold">
                    <Figure value={row.actualGainPerLot} format={signed} toned />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-zinc-700">
                    <Figure value={row.subscriptionTimes} format={formatSubscriptionTimes} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      href={`/ipo/${row.slug}`}
                      aria-label={`View ${row.companyName} details`}
                      className="inline-flex whitespace-nowrap rounded-lg border border-[#c6dddc] px-3 py-1.5 text-xs font-bold text-[#174a52] transition-colors hover:border-[#8ab8ba] hover:bg-[#e6f0ef]"
                    >
                      Details
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MobileCard({
  row,
  checked,
  disabled,
  onToggle,
}: {
  row: GmpTrackerRow;
  checked: boolean;
  disabled: boolean;
  onToggle: (slug: string) => void;
}) {
  const listed = row.status === "LISTED";

  return (
    <li className={`rounded-2xl border border-l-4 p-4 shadow-[0_4px_16px_rgba(23,74,82,0.05)] [&_.text-zinc-400]:text-zinc-600 [&_.text-zinc-500]:text-zinc-700 ${checked ? `border-[#4f8f93] ${rowTint[row.category].strong}` : `border-[#e0e8e6] ${rowTint[row.category].base}`} ${cardStripe[row.category]}`}>
      <div className="flex items-start gap-3">
        <CompareCheckbox row={row} checked={checked} disabled={disabled} onToggle={onToggle} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/ipo/${row.slug}`} className="font-bold leading-5 text-zinc-900">
              {row.companyName}
            </Link>
            <StatusBadge status={row.status} />
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-zinc-500">
            <IpoTypeBadge ipoType={row.ipoType} />
            <span>{row.exchange}</span>
          </div>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-[#f6faf9] p-3">
        {listed ? (
          <>
            <KeyMetric label="Listed at">
              <Figure value={row.actualListingPrice} format={plain} />
            </KeyMetric>
            <KeyMetric label="Listing gain">
              <Figure value={row.actualGainPercentage} format={signedPercent} toned />
            </KeyMetric>
            <KeyMetric label="Gain / lot">
              <Figure value={row.actualGainPerLot} format={signed} toned />
            </KeyMetric>
          </>
        ) : (
          <>
            <KeyMetric label="GMP">
              <Figure value={row.gmp} format={signed} toned />
            </KeyMetric>
            <KeyMetric label="GMP %">
              <Figure value={row.gmpPercentage} format={signedPercent} toned />
            </KeyMetric>
            <KeyMetric label="Est. / lot*">
              <Figure value={row.estimatedGainPerLot} format={signed} toned />
            </KeyMetric>
          </>
        )}
      </dl>
      <p className="mt-2 text-[11px]">
        {listed ? (
          <span className="text-zinc-500">
            Listed {formatShortDate(row.listingDate)}
            {row.actualListingPrice === null ? " · listing price not available yet" : ""}
          </span>
        ) : (
          <GmpFreshnessNote freshness={row.gmpFreshness} sourceUpdatedAt={row.gmpSourceUpdatedAt} status={row.status} />
        )}
      </p>

      <details className="group mt-3 border-t border-zinc-100 pt-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-bold text-[#174a52]">
          More figures
          <span aria-hidden="true" className="text-base leading-none transition-transform group-open:rotate-180">▾</span>
        </summary>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Secondary label="Issue price">
            {formatPriceBand(row.issuePrice ?? row.priceBandLow, row.issuePrice ?? row.priceBandHigh)}
          </Secondary>
          <Secondary label="Lot size">
            <Figure value={row.lotSize} format={(value) => `${value} shares`} />
          </Secondary>
          <Secondary label="Open / Close">
            {formatShortDate(row.openDate)} – {formatShortDate(row.closeDate)}
          </Secondary>
          <Secondary label={listed ? "Listed on" : "Expected listing"}>
            {formatShortDate(row.listingDate)}
          </Secondary>
          {listed ? (
            <Secondary label="Gain / share">
              <Figure value={row.actualGainPerShare} format={signed} toned />
            </Secondary>
          ) : (
            <>
              <Secondary label="Est. listing*">
                <Figure value={row.estimatedListingPrice} format={plain} />
              </Secondary>
              <Secondary label="Est. P/L per share*">
                <Figure value={row.estimatedGainPerShare} format={signed} toned />
              </Secondary>
            </>
          )}
          <Secondary label="Subscription">
            <Figure value={row.subscriptionTimes} format={formatSubscriptionTimes} />
          </Secondary>
          {listed ? null : <Secondary label="GMP source">{row.gmpSource ?? "Not available"}</Secondary>}
        </dl>
        {row.priceBasis === "UPPER_PRICE_BAND" ? (
          <p className="mt-3 text-[11px]">
            <PriceBasisNote priceBasis={row.priceBasis} basisPrice={row.basisPrice} />
          </p>
        ) : null}
      </details>

      <Link
        href={`/ipo/${row.slug}`}
        className="mt-3 flex items-center justify-between rounded-xl border border-[#c6dddc] px-3 py-2 text-xs font-bold text-[#174a52]"
      >
        View details <span aria-hidden="true">→</span>
      </Link>
    </li>
  );
}

function KeyMetric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-[0.07em] text-zinc-500">{label}</dt>
      <dd className="mt-1 truncate text-[15px] font-bold">{children}</dd>
    </div>
  );
}

function Secondary({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-[0.07em] text-zinc-500">{label}</dt>
      <dd className="mt-0.5 break-words font-medium text-zinc-800">{children}</dd>
    </div>
  );
}
