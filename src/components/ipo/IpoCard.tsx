import Link from "next/link";
import type { IpoListItem } from "@/services/ipo-query-service";
import { GmpFreshnessNote, IpoTypeBadge, StatusBadge, toneClass } from "@/components/gmp/indicators";
import {
  formatCurrency,
  formatDate,
  formatPriceBand,
  formatSignedCurrency,
  formatSignedPercent,
  formatSubscriptionTimes,
} from "@/utils/format";

const accentBar: Record<IpoListItem["status"], string> = {
  OPEN: "bg-emerald-500",
  UPCOMING: "bg-sky-500",
  CLOSED: "bg-violet-500",
  LISTED: "bg-amber-500",
};

/** Card for a not-yet-listed IPO: GMP and indicative estimate first, then issue details. */
export function IpoCard({ ipo }: { ipo: IpoListItem }) {
  const hasGmp = ipo.gmp !== null;

  return (
    <Link
      href={`/ipo/${ipo.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#dce7e5] bg-white p-5 shadow-[0_4px_16px_rgba(23,74,82,0.045)] transition duration-200 hover:-translate-y-0.5 hover:border-[#9bc2c2] hover:shadow-[0_14px_32px_rgba(23,74,82,0.1)]"
    >
      <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${accentBar[ipo.status]}`} />
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold leading-5 text-zinc-900 transition-colors group-hover:text-[#174a52]">{ipo.companyName}</h3>
          <span className="mt-1.5 flex items-center gap-2 text-xs text-zinc-500">
            <IpoTypeBadge ipoType={ipo.ipoType} />
            {ipo.exchange}
          </span>
        </div>
        <StatusBadge status={ipo.status} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl bg-[#f6faf9] px-3 py-2.5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-zinc-500">GMP</p>
          <p className={`whitespace-nowrap text-lg font-black tabular-nums ${toneClass(ipo.gmp)}`}>
            {hasGmp ? formatSignedCurrency(ipo.gmp) : "—"}
          </p>
          {hasGmp && ipo.gmpPercentage !== null ? (
            <p className={`text-xs font-semibold tabular-nums ${toneClass(ipo.gmpPercentage)}`}>
              {formatSignedPercent(ipo.gmpPercentage)}
            </p>
          ) : null}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-zinc-500">Est. gain / lot*</p>
          <p className={`whitespace-nowrap text-lg font-black tabular-nums ${toneClass(ipo.estimatedGainPerLot)}`}>
            {ipo.estimatedGainPerLot !== null ? formatSignedCurrency(ipo.estimatedGainPerLot) : "—"}
          </p>
        </div>
        <p className="col-span-2 -mt-1 text-[11px]">
          <GmpFreshnessNote freshness={ipo.gmpFreshness} sourceUpdatedAt={ipo.gmpSourceUpdatedAt} status={ipo.status} source={ipo.gmpSource} />
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Field label="Price" value={formatPriceBand(ipo.issuePrice ?? ipo.priceBandLow, ipo.issuePrice ?? ipo.priceBandHigh)} />
        <Field label="Lot size" value={ipo.lotSize ? `${ipo.lotSize} shares` : "Not available"} />
        <Field label="Min. application" value={formatCurrency(ipo.minimumInvestment)} />
        {ipo.status === "CLOSED" ? (
          <Field label="Lists on" value={formatDate(ipo.listingDate)} />
        ) : ipo.status === "UPCOMING" ? (
          <Field label="Opens" value={formatDate(ipo.openDate)} />
        ) : (
          <Field label="Closes" value={formatDate(ipo.closeDate)} />
        )}
        <Field label="Subscription" value={formatSubscriptionTimes(ipo.subscriptionTimes)} />
        <Field label="Issue size" value={ipo.issueSize ? `₹${ipo.issueSize} Cr` : "Not available"} />
      </dl>

      <span aria-hidden="true" className="min-h-4 flex-1" />

      <span className="flex items-center justify-between border-t border-zinc-100 pt-4 text-sm font-bold text-[#174a52]">
        View IPO details <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
      </span>
    </Link>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  const missing = value === "Not available";
  return (
    <div className="min-w-0">
      <dt className="text-xs text-zinc-400">{label}</dt>
      <dd className={`truncate font-medium ${missing ? "text-zinc-400" : "text-zinc-800"}`}>{value}</dd>
    </div>
  );
}
