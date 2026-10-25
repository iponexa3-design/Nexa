import type { GmpFreshness, PriceBasisKind } from "@/services/calculations";
import type { ComputedIpoStatus } from "@/utils/ipo-status";
import { formatCurrency, formatShortDate } from "@/utils/format";

const statusStyles: Record<ComputedIpoStatus, { label: string; badge: string; dot: string }> = {
  OPEN: {
    label: "Open",
    badge: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  UPCOMING: {
    label: "Upcoming",
    badge: "bg-sky-50 text-sky-800 ring-sky-200",
    dot: "bg-sky-500",
  },
  CLOSED: {
    label: "Awaiting listing",
    badge: "bg-violet-50 text-violet-800 ring-violet-200",
    dot: "bg-violet-500",
  },
  LISTED: {
    label: "Listed",
    badge: "bg-zinc-100 text-zinc-700 ring-zinc-200",
    dot: "bg-zinc-500",
  },
};

/**
 * Status only - a green "Open" badge says the issue is accepting bids, not
 * that it is profitable or recommended. Gains are toned separately.
 */
export function StatusBadge({ status }: { status: ComputedIpoStatus }) {
  const style = statusStyles[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${style.badge}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

export function IpoTypeBadge({ ipoType }: { ipoType: "MAINBOARD" | "SME" }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${
        ipoType === "SME" ? "bg-[#f4efe6] text-[#7a5525]" : "bg-[#e6f0ef] text-[#174a52]"
      }`}
    >
      {ipoType === "MAINBOARD" ? "Mainboard" : "SME"}
    </span>
  );
}

/**
 * Green for gains, muted red for losses, neutral for zero, grey when unknown.
 * The -800 shades keep at least 4.5:1 contrast on the status-tinted rows.
 */
export function toneClass(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "text-zinc-400";
  if (value > 0) return "text-emerald-800";
  if (value < 0) return "text-rose-800";
  return "text-zinc-700";
}

/** Renders a figure, or a grey dash announced as "Not available". */
export function Figure({
  value,
  format,
  toned = false,
  className = "",
}: {
  value: number | null | undefined;
  format: (value: number) => string;
  toned?: boolean;
  className?: string;
}) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return (
      <span className={`text-zinc-400 ${className}`} title="Not available">
        <span aria-hidden="true">—</span>
        <span className="sr-only">Not available</span>
      </span>
    );
  }
  return (
    <span className={`tabular-nums ${toned ? toneClass(value) : "text-zinc-800"} ${className}`}>
      {format(value)}
    </span>
  );
}

export function GmpFreshnessNote({
  freshness,
  sourceUpdatedAt,
  status,
}: {
  freshness: GmpFreshness;
  sourceUpdatedAt: string | Date | null;
  status: ComputedIpoStatus;
}) {
  if (freshness === "UNAVAILABLE") {
    return <span className="text-zinc-400">No GMP reported</span>;
  }
  if (status === "LISTED") {
    return <span className="text-zinc-500">Last pre-listing GMP</span>;
  }
  if (freshness === "UNDATED") {
    return <span className="text-amber-700">Quote date not reported</span>;
  }
  if (freshness === "STALE") {
    return <span className="text-amber-700">Outdated · {formatShortDate(sourceUpdatedAt)}</span>;
  }
  return <span className="text-zinc-500">As of {formatShortDate(sourceUpdatedAt)}</span>;
}

export function PriceBasisNote({
  priceBasis,
  basisPrice,
}: {
  priceBasis: PriceBasisKind | null;
  basisPrice: number | null;
}) {
  if (priceBasis !== "UPPER_PRICE_BAND" || basisPrice === null) return null;
  return <span className="text-zinc-500">Calc. at {formatCurrency(basisPrice)} (upper band)</span>;
}
