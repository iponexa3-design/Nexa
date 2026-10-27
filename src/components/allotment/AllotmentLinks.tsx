import { allotmentExchanges, findRegistrar, type AllotmentStage } from "@/services/allotment";
import { formatDate } from "@/utils/format";

export const stageStyles: Record<AllotmentStage, { label: string; className: string }> = {
  today: { label: "Allotment today", className: "bg-amber-100 text-amber-900 ring-amber-200" },
  out: { label: "Allotment out", className: "bg-emerald-100 text-emerald-900 ring-emerald-200" },
  due: { label: "Allotment due", className: "bg-violet-100 text-violet-900 ring-violet-200" },
  pending: { label: "Allotment soon", className: "bg-sky-100 text-sky-900 ring-sky-200" },
};

export function StageBadge({ stage, allotmentDate }: { stage: AllotmentStage; allotmentDate: string | null }) {
  const style = stageStyles[stage];
  const label = stage === "pending" && allotmentDate ? `Allotment on ${formatShortDate(allotmentDate)}` : style.label;
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${style.className}`}>
      {label}
    </span>
  );
}

function formatShortDate(value: string): string {
  return formatDate(value).replace(/ \d{4}$/, "");
}

/**
 * Buttons to the official allotment pages for one IPO: its registrar (when
 * known) first, then the exchange check(s). All open in a new tab.
 */
export function AllotmentLinks({
  registrar,
  exchange,
  ipoType,
}: {
  registrar: string | null;
  exchange: string;
  ipoType: "MAINBOARD" | "SME";
}) {
  const site = findRegistrar(registrar);
  return (
    <div className="flex flex-wrap gap-2">
      {site ? (
        <a
          href={site.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#174a52] px-4 py-2.5 text-sm font-bold text-white shadow-[0_6px_16px_rgba(23,74,82,0.18)] transition hover:bg-[#123a41]"
        >
          Check on {site.name}
          <ExternalIcon />
        </a>
      ) : null}
      {allotmentExchanges(exchange, ipoType).map((exchangeSite) => (
        <a
          key={exchangeSite.key}
          href={exchangeSite.url}
          target="_blank"
          rel="noopener noreferrer"
          className={
            site
              ? "inline-flex items-center gap-1.5 rounded-xl border border-[#c6dddc] bg-white px-3.5 py-2.5 text-sm font-bold text-[#174a52] transition hover:bg-[#eef6f5]"
              : "inline-flex items-center gap-1.5 rounded-xl bg-[#174a52] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#123a41]"
          }
        >
          {site ? exchangeSite.name : `Check on ${exchangeSite.name}`}
          <ExternalIcon />
        </a>
      ))}
    </div>
  );
}

export function ExternalIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 opacity-80">
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
