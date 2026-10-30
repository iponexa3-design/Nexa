import Link from "next/link";
import type { IpoListItem } from "@/services/ipo-query-service";
import { toneClass } from "@/components/gmp/indicators";
import {
  formatCurrency,
  formatDate,
  formatPriceBand,
  formatSignedCurrency,
  formatSignedPercent,
} from "@/utils/format";

/** Listed IPOs show the actual listing-day result; GMP no longer applies. */
export function RecentlyListedIpoCard({ ipo }: { ipo: IpoListItem }) {
  const hasListingPrice = ipo.actualListingPrice !== null;

  return (
    <Link
      href={`/ipo/${ipo.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#dce7e5] bg-white p-5 shadow-[0_4px_16px_rgba(23,74,82,0.045)] transition duration-200 hover:-translate-y-0.5 hover:border-[#9bc2c2] hover:shadow-[0_14px_32px_rgba(23,74,82,0.1)]"
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-amber-500" />
      <div className="mb-4">
        <h3 className="font-bold leading-5 text-zinc-900 transition-colors group-hover:text-[#174a52]">{ipo.companyName}</h3>
        <span className="text-xs font-medium text-zinc-500">
          {ipo.ipoType === "MAINBOARD" ? "Mainboard" : "SME"} - {ipo.exchange} - Listed {formatDate(ipo.listingDate)}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Field
          label="Issue Price"
          value={formatPriceBand(ipo.issuePrice ?? ipo.priceBandLow, ipo.issuePrice ?? ipo.priceBandHigh)}
        />
        <Field
          label="Listing Price"
          value={hasListingPrice ? formatCurrency(ipo.actualListingPrice) : "Not available yet"}
        />
        <Field
          label="Listing Gain"
          value={formatSignedPercent(ipo.actualGainPercentage)}
          className={toneClass(ipo.actualGainPercentage)}
        />
        <Field
          label="Gain / Lot"
          value={formatSignedCurrency(ipo.actualGainPerLot)}
          className={toneClass(ipo.actualGainPerLot)}
        />
      </dl>

      <span aria-hidden="true" className="min-h-4 flex-1" />

      <span className="flex items-center justify-between border-t border-zinc-100 pt-4 text-sm font-bold text-[#174a52]">
        View IPO details <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
      </span>
    </Link>
  );
}

function Field({ label, value, className = "text-zinc-800" }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className={`font-medium ${className}`}>{value}</dd>
    </div>
  );
}
