import Link from "next/link";
import type { IpoListItem } from "@/services/ipo-query-service";
import { calculateListingDifference } from "@/services/calculations";
import { formatCurrency } from "@/utils/format";

export function RecentlyListedIpoCard({ ipo }: { ipo: IpoListItem }) {
  const difference = calculateListingDifference(
    ipo.estimatedListingPrice,
    ipo.actualListingPrice,
  );

  return (
    <Link
      href={`/ipo/${ipo.slug}`}
      className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-3">
        <h3 className="font-bold text-zinc-900">{ipo.companyName}</h3>
        <span className="text-xs font-medium text-zinc-500">
          {ipo.ipoType === "MAINBOARD" ? "Mainboard" : "SME"} - {ipo.exchange}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <Field label="Issue Price" value={formatCurrency(ipo.issuePrice)} />
        <Field label="Estimated Listing" value={formatCurrency(ipo.estimatedListingPrice)} />
        <Field label="Actual Listing" value={formatCurrency(ipo.actualListingPrice)} />
        <Field
          label="Difference"
          value={difference !== null ? formatSignedCurrency(difference) : "Not available"}
        />
      </dl>

      <span className="mt-4 text-sm font-semibold text-indigo-600 group-hover:text-indigo-700">
        View IPO Details &rarr;
      </span>
    </Link>
  );
}

function formatSignedCurrency(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatCurrency(Math.abs(value))}`;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-400">{label}</dt>
      <dd className="font-medium text-zinc-800">{value}</dd>
    </div>
  );
}
