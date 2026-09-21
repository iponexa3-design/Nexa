import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getIpoBySlug } from "@/services/ipo-query-service";
import { calculateListingDifference } from "@/services/calculations";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPercent,
  formatPriceBand,
} from "@/utils/format";

const statusLabels = {
  UPCOMING: "Upcoming",
  OPEN: "Open for subscription",
  CLOSED: "Closed - awaiting listing",
  LISTED: "Listed",
} as const;

export async function generateMetadata(
  props: PageProps<"/ipo/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const ipo = await getIpoBySlug(slug);
  if (!ipo) return { title: "IPO not found" };
  return { title: `${ipo.companyName} IPO - GMP, Price, Subscription & Listing` };
}

export default async function IpoDetailsPage(props: PageProps<"/ipo/[slug]">) {
  const { slug } = await props.params;
  const ipo = await getIpoBySlug(slug);
  if (!ipo) notFound();

  const hasGmp = ipo.gmp !== null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
            {ipo.ipoType === "MAINBOARD" ? "Mainboard" : "SME"}
          </span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600">
            {statusLabels[ipo.status]}
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-zinc-900 sm:text-3xl">
          {ipo.companyName}
        </h1>
        <p className="text-sm text-zinc-500">{ipo.exchange}</p>
      </div>

      <Section title="Price Band &amp; Lot Size">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Price Band" value={formatPriceBand(ipo.priceBandLow, ipo.priceBandHigh)} />
          <Field label="Lot Size" value={ipo.lotSize ? String(ipo.lotSize) : "Not available"} />
          <Field label="Issue Size" value={ipo.issueSize ? `Rs. ${ipo.issueSize} Cr` : "Not available"} />
          <Field label="Face Value" value={formatCurrency(ipo.faceValue)} />
          {ipo.issuePrice ? <Field label="Issue Price" value={formatCurrency(ipo.issuePrice)} /> : null}
          {ipo.symbol ? <Field label="Symbol" value={ipo.symbol} /> : null}
        </dl>
      </Section>

      <Section title="Important Dates">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Open Date" value={formatDate(ipo.openDate)} />
          <Field label="Close Date" value={formatDate(ipo.closeDate)} />
          <Field label="Allotment Date" value={formatDate(ipo.allotmentDate)} />
          <Field label="Listing Date" value={formatDate(ipo.listingDate)} />
        </dl>
      </Section>

      <Section title="Grey Market Premium (GMP)">
        {hasGmp ? (
          <>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Current GMP" value={formatCurrency(ipo.gmp)} />
              <Field label="GMP %" value={formatPercent(ipo.gmpPercentage)} />
              <Field label="Updated" value={formatDateTime(ipo.gmpUpdatedTime)} />
              <Field label="Source" value={ipo.gmpSource ?? "Not available"} />
            </dl>
            {ipo.gmpHistory.length > 1 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[400px] text-left text-sm">
                  <thead>
                    <tr className="text-xs text-zinc-400">
                      <th className="pb-2 font-medium">Recorded</th>
                      <th className="pb-2 font-medium">GMP</th>
                      <th className="pb-2 font-medium">GMP %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ipo.gmpHistory.map((entry, index) => (
                      <tr key={index} className="border-t border-zinc-100">
                        <td className="py-1.5 text-zinc-600">{formatDateTime(entry.recordedAt)}</td>
                        <td className="py-1.5 font-medium text-zinc-800">{formatCurrency(entry.gmp)}</td>
                        <td className="py-1.5 text-zinc-600">{formatPercent(entry.gmpPercentage)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-zinc-500">GMP data currently unavailable.</p>
        )}
        <p className="mt-3 text-xs text-amber-700">
          Grey Market Premium (GMP) is unofficial and indicative. Actual listing price may differ.
        </p>
      </Section>

      <Section title="Estimated Listing Calculation">
        {hasGmp ? (
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Estimated Listing Price" value={formatCurrency(ipo.estimatedListingPrice)} />
            <Field label="Estimated Gain Per Share" value={formatCurrency(ipo.estimatedGainPerShare)} />
            <Field label="Estimated Gain Per Lot" value={formatCurrency(ipo.estimatedGainPerLot)} />
          </dl>
        ) : (
          <p className="text-sm text-zinc-500">
            Estimated listing figures need a GMP value, which is currently unavailable.
          </p>
        )}
      </Section>

      <Section title="Subscription">
        {ipo.latestSubscription ? (
          <>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="QIB" value={formatSubscriptionTimes(ipo.latestSubscription.qib)} />
              <Field label="NII" value={formatSubscriptionTimes(ipo.latestSubscription.nii)} />
              <Field label="Retail" value={formatSubscriptionTimes(ipo.latestSubscription.retail)} />
              <Field label="Total" value={formatSubscriptionTimes(ipo.latestSubscription.total)} />
            </dl>
            <p className="mt-3 text-xs text-zinc-500">
              Updated {formatDateTime(ipo.latestSubscription.sourceUpdatedAt)} - source:{" "}
              {ipo.latestSubscription.source}
            </p>
          </>
        ) : (
          <p className="text-sm text-zinc-500">Subscription data not available yet.</p>
        )}
      </Section>

      {ipo.status === "LISTED" && ipo.actualListingPrice !== null ? (
        <Section title="Estimated vs Actual Listing">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Estimated Listing Price" value={formatCurrency(ipo.estimatedListingPrice)} />
            <Field label="Actual Listing Price" value={formatCurrency(ipo.actualListingPrice)} />
            <Field
              label="Difference"
              value={formatSignedDifference(
                calculateListingDifference(ipo.estimatedListingPrice, ipo.actualListingPrice),
              )}
            />
          </dl>
          <p className="mt-3 text-xs text-zinc-500">
            This is a factual comparison only, shown for reference.
          </p>
        </Section>
      ) : null}

      <Section title="Risk Factors">
        <p className="text-sm text-zinc-500">
          Every IPO carries risk. Please refer to the company&apos;s official offer
          document (DRHP/RHP) filed with SEBI and the exchanges for detailed,
          company-specific risk factors before making any decision.
        </p>
      </Section>

      <Section title="Data Sources &amp; Last Updated">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="IPO Data Last Updated" value={formatDateTime(ipo.updatedAt)} />
          {ipo.gmpSource ? <Field label="GMP Source" value={ipo.gmpSource} /> : null}
          {ipo.latestSubscription ? (
            <Field label="Subscription Source" value={ipo.latestSubscription.source} />
          ) : null}
        </dl>
      </Section>

      <p className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
        This page is for informational and educational purposes only. It is not
        investment advice and not a recommendation to buy, sell, or apply for
        this IPO. GMP and subscription figures are unofficial/may change. Please
        make your own independent decision.
      </p>
    </div>
  );
}

function formatSubscriptionTimes(value: number | null): string {
  if (value === null) return "Not available";
  return `${value.toFixed(2)}x`;
}

function formatSignedDifference(value: number | null): string {
  if (value === null) return "Not available";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatCurrency(Math.abs(value))}`;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="mb-4 text-base font-bold text-zinc-900">{title}</h2>
      {children}
    </section>
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
