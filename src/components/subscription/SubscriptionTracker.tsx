"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { IpoTypeBadge } from "@/components/gmp/indicators";
import { nameMatches } from "@/components/search/PageSearch";
import { rowsForTab, type SubscriptionTab, type SubscriptionTrackerRow } from "@/services/subscription-tracker";
import type { SubscriptionFigures } from "@/services/subscription-history";
import { formatDateTime, formatShortDate } from "@/utils/format";
import { subscriptionSourceLabel } from "@/utils/subscription-source";

const tabs: Array<{ key: SubscriptionTab; label: string }> = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "closed", label: "Awaiting listing" },
  { key: "listed", label: "Listed" },
];

// Same colours as the GMP tracker's status tabs.
const tabStyles: Record<SubscriptionTab, { idle: string; active: string; count: string }> = {
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

const statusBadge: Record<SubscriptionTrackerRow["status"], { label: string; className: string }> = {
  OPEN: { label: "Open", className: "bg-emerald-100 text-emerald-800" },
  CLOSED: { label: "Awaiting listing", className: "bg-violet-100 text-violet-800" },
  LISTED: { label: "Listed", className: "bg-amber-100 text-amber-800" },
};

const columns: Array<{ key: keyof SubscriptionFigures; label: string; short: string }> = [
  { key: "qib", label: "QIB", short: "QIB" },
  { key: "nii", label: "NII", short: "NII" },
  { key: "niiBig", label: "NII > ₹10L", short: "bNII" },
  { key: "niiSmall", label: "NII < ₹10L", short: "sNII" },
  { key: "retail", label: "Retail", short: "Retail" },
  { key: "employee", label: "Employees", short: "Emp." },
  { key: "shareholders", label: "Shareholders", short: "Share-h." },
];

/** "12.34x"; oversubscribed figures (1x and above) are highlighted. */
function Times({ value, strong = false }: { value: number | null | undefined; strong?: boolean }) {
  if (value === null || value === undefined) return <span className="text-zinc-500">—</span>;
  const over = value >= 1;
  return (
    <span className={`tabular-nums ${over ? "font-semibold text-emerald-800" : "text-zinc-600"} ${strong ? "text-[15px] font-black" : ""}`}>
      {value.toFixed(2)}x
    </span>
  );
}

function updatedText(row: SubscriptionTrackerRow): string {
  return row.updatedAt ? formatDateTime(row.updatedAt) : "Not available";
}

function dateText(row: SubscriptionTrackerRow): string {
  if (row.status === "OPEN") return row.closeDate ? `Closes ${formatShortDate(row.closeDate)}` : "Open";
  if (row.status === "CLOSED") return row.listingDate ? `Lists ${formatShortDate(row.listingDate)}` : "Closed";
  return row.listingDate ? `Listed ${formatShortDate(row.listingDate)}` : "Listed";
}

export function SubscriptionTracker({ rows }: { rows: SubscriptionTrackerRow[] }) {
  const [tab, setTab] = useState<SubscriptionTab>("all");
  const [query, setQuery] = useState("");

  const searched = useMemo(() => rows.filter((row) => nameMatches(row.companyName, query)), [rows, query]);
  const visible = useMemo(() => rowsForTab(searched, tab), [searched, tab]);
  const counts = useMemo(
    () => Object.fromEntries(tabs.map((item) => [item.key, rowsForTab(searched, item.key).length])) as Record<SubscriptionTab, number>,
    [searched],
  );

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="IPO status" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {tabs.map((item) => {
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.key)}
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors ${
                  active ? tabStyles[item.key].active : tabStyles[item.key].idle
                }`}
              >
                {item.label}
                <span className={`rounded-md px-1.5 py-0.5 text-[11px] tabular-nums ${active ? "bg-white/20 text-white" : tabStyles[item.key].count}`}>
                  {counts[item.key]}
                </span>
              </button>
            );
          })}
        </div>
        <label className="relative block w-full lg:max-w-xs">
          <span className="sr-only">Search IPOs</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500">
            <path d="m20 20-4.2-4.2M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search IPOs"
            maxLength={80}
            className="w-full rounded-xl border border-[#dce7e5] bg-white py-2.5 pl-10 pr-3 text-sm text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-[#4f8f93] focus:ring-2 focus:ring-[#cfe4e3]"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#dce7e5] bg-white/70 px-5 py-6 text-sm text-zinc-600">
          {query.trim() ? `No IPOs match “${query.trim()}”.` : "No IPOs in this tab right now."}
        </p>
      ) : (
        <>
          {/* Desktop: one table, every category side by side. */}
          <div className="hidden overflow-x-auto rounded-2xl border border-[#dce7e5] bg-white shadow-[0_4px_16px_rgba(23,74,82,0.045)] md:block">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-[#f6faf9] text-xs text-zinc-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">IPO</th>
                  {columns.map((column) => (
                    <th key={column.key} className="px-3 py-3 text-right font-semibold">
                      {column.label}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right font-semibold text-zinc-800">Total</th>
                  <th className="px-4 py-3 text-right font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.slug} className="border-t border-zinc-100 align-top hover:bg-[#fafcfc]">
                    <td className="px-4 py-3">
                      <Link href={`/ipo/${row.slug}`} className="font-semibold text-zinc-900 hover:text-[#174a52] hover:underline">
                        {row.companyName}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
                        <IpoTypeBadge ipoType={row.ipoType} />
                        <span className={`rounded-full px-2 py-0.5 font-bold ${statusBadge[row.status].className}`}>{statusBadge[row.status].label}</span>
                        <span>{dateText(row)}</span>
                      </div>
                    </td>
                    {columns.map((column) => (
                      <td key={column.key} className="px-3 py-3 text-right">
                        <Times value={row.breakdown?.[column.key]} />
                      </td>
                    ))}
                    <td className="px-3 py-3 text-right">
                      <Times value={row.total} strong />
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-zinc-500">
                      {updatedText(row)}
                      {row.source ? (
                        <span className="block text-[11px] text-zinc-500">{subscriptionSourceLabel(row.source, true)}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones: a card per IPO. */}
          <ul className="space-y-3 md:hidden">
            {visible.map((row) => (
              <li key={row.slug} className="rounded-2xl border border-[#dce7e5] bg-white p-4 shadow-[0_4px_16px_rgba(23,74,82,0.045)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/ipo/${row.slug}`} className="font-bold text-zinc-900">
                      {row.companyName}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
                      <IpoTypeBadge ipoType={row.ipoType} />
                      <span className={`rounded-full px-2 py-0.5 font-bold ${statusBadge[row.status].className}`}>{statusBadge[row.status].label}</span>
                      <span>{dateText(row)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Total</p>
                    <Times value={row.total} strong />
                  </div>
                </div>
                {row.breakdown && row.breakdown.qib !== null ? (
                  <dl className="mt-3 grid grid-cols-4 gap-2 border-t border-zinc-100 pt-3 text-xs">
                    {columns
                      .filter((column) => row.breakdown?.[column.key] !== null)
                      .map((column) => (
                        <div key={column.key}>
                          <dt className="text-[10px] font-semibold uppercase text-zinc-500">{column.short}</dt>
                          <dd>
                            <Times value={row.breakdown?.[column.key]} />
                          </dd>
                        </div>
                      ))}
                  </dl>
                ) : null}
                <p className="mt-2 text-[11px] text-zinc-500">
                  {row.total === null ? "Not available for this issue" : `Updated ${updatedText(row)} · ${subscriptionSourceLabel(row.source, true)}`}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
