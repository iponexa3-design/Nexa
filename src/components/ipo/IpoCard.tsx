import Link from "next/link";
import type { IpoListItem } from "@/services/ipo-query-service";
import {
  formatCurrency,
  formatPercent,
  formatPriceBand,
} from "@/utils/format";

const statusStyles: Record<IpoListItem["status"], string> = {
  UPCOMING: "bg-blue-50 text-blue-700",
  OPEN: "bg-emerald-50 text-emerald-700",
  CLOSED: "bg-zinc-100 text-zinc-600",
  LISTED: "bg-violet-50 text-violet-700",
};

const statusLabels: Record<IpoListItem["status"], string> = {
  UPCOMING: "Upcoming",
  OPEN: "Open",
  CLOSED: "Closed",
  LISTED: "Listed",
};

export function IpoCard({ ipo }: { ipo: IpoListItem }) {
  const hasGmp = ipo.gmp !== null;

  return (
    <Link
      href={`/ipo/${ipo.slug}`}
      className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-zinc-900">{ipo.companyName}</h3>
          <span className="text-xs font-medium text-zinc-500">
            {ipo.ipoType === "MAINBOARD" ? "Mainboard" : "SME"}
          </span>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[ipo.status]}`}
        >
          {statusLabels[ipo.status]}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <Field label="Price" value={formatPriceBand(ipo.priceBandLow, ipo.priceBandHigh)} />
        <Field label="Lot Size" value={ipo.lotSize ? String(ipo.lotSize) : "Not available"} />
        <Field
          label="GMP"
          value={hasGmp ? formatCurrency(ipo.gmp) : "GMP data currently unavailable"}
        />
        <Field label="GMP %" value={hasGmp ? formatPercent(ipo.gmpPercentage) : "-"} />
        <Field
          label="Estimated Listing"
          value={hasGmp ? formatCurrency(ipo.estimatedListingPrice) : "-"}
        />
        <Field
          label="Estimated Gain/Lot"
          value={hasGmp ? formatCurrency(ipo.estimatedGainPerLot) : "-"}
        />
      </dl>

      <span className="mt-4 text-sm font-semibold text-indigo-600 group-hover:text-indigo-700">
        View IPO Details &rarr;
      </span>
    </Link>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-400">{label}</dt>
      <dd className="font-medium text-zinc-800">{value}</dd>
    </div>
  );
}
