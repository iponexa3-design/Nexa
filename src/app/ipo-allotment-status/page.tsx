import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AllotmentLinks, ExternalIcon, StageBadge } from "@/components/allotment/AllotmentLinks";
import { IpoTypeBadge } from "@/components/gmp/indicators";
import { EXCHANGE_ALLOTMENT, findRegistrar, REGISTRARS } from "@/services/allotment";
import { getAllotmentData } from "@/services/ipo-query-service";
import { formatDate } from "@/utils/format";

export const metadata: Metadata = {
  title: "IPO Allotment Status - Check Online by PAN",
  description:
    "Check IPO allotment status for current and recent Indian IPOs. Go straight to the registrar (KFin, MUFG Intime, Bigshare and more) or BSE / NSE allotment pages.",
};

// Allotment stages follow the calendar; re-read the database at most every 5 minutes.
export const revalidate = 300;

export default async function AllotmentStatusPage() {
  const { ipos } = await getAllotmentData();

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#eaf3f2_0%,#f3f7f6_360px,#f3f7f6_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8 rounded-[24px] border border-[#174a52] bg-[linear-gradient(125deg,#123a41_0%,#174a52_62%,#28727b_100%)] px-6 py-7 text-white shadow-[0_20px_50px_rgba(23,74,82,0.16)] sm:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c6e0df]">Did you get shares?</p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">IPO Allotment Status</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#d7e8e7]">
            Find your IPO below and open its registrar&apos;s official allotment page, or check on BSE or NSE.
            Keep your PAN or application number ready.
          </p>
        </header>

        <section className="mb-10">
          <SectionHeading
            title="Check allotment by IPO"
            text="Current and recently listed IPOs. Results usually appear on the evening of the allotment date."
          />
          {ipos.length === 0 ? (
            <p className="rounded-2xl border border-[#e0e8e6] bg-white px-5 py-6 text-sm text-zinc-600">
              No IPOs are in the allotment stage right now. Use the registrar or exchange links below for older issues.
            </p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {ipos.map((ipo) => {
                const registrar = findRegistrar(ipo.registrar);
                return (
                  <li
                    key={ipo.slug}
                    className="flex flex-col gap-4 rounded-[20px] border border-[#e0e8e6] bg-white p-5 shadow-[0_8px_24px_rgba(23,74,82,0.05)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/ipo/${ipo.slug}`} className="text-base font-bold text-zinc-900 hover:text-[#174a52] hover:underline">
                          {ipo.companyName}
                        </Link>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                          <IpoTypeBadge ipoType={ipo.ipoType} />
                          <span>{ipo.exchange}</span>
                        </div>
                      </div>
                      <StageBadge stage={ipo.stage} allotmentDate={ipo.allotmentDate} />
                    </div>

                    <dl className="grid grid-cols-3 gap-3 text-sm">
                      <Fact label="Allotment" value={ipo.allotmentDate ? formatDate(ipo.allotmentDate) : "Not announced"} />
                      <Fact label="Listing" value={ipo.listingDate ? formatDate(ipo.listingDate) : "Not announced"} />
                      <Fact label="Registrar" value={registrar?.name ?? shortRegistrar(ipo.registrar) ?? "Not available"} />
                    </dl>

                    <div className="mt-auto">
                      <AllotmentLinks registrar={ipo.registrar} exchange={ipo.exchange} ipoType={ipo.ipoType} />
                      {ipo.stage === "pending" ? (
                        <p className="mt-2 text-xs text-zinc-500">Allotment results are not out yet; the links work once they are.</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="mb-10">
          <SectionHeading
            title="Check on the registrar's website"
            text="Every IPO has a registrar that finalises the allotment. Its name is in the IPO's prospectus and on the IPO page here."
          />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {REGISTRARS.map((registrar) => (
              <li key={registrar.key}>
                <OfficialLink href={registrar.url} title={registrar.name} text="IPO allotment status" />
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <SectionHeading
            title="Check on the exchange"
            text="Works for any IPO listed on that exchange. Select the issue type (equity) and the IPO name, then enter your PAN or application number."
          />
          <ul className="grid gap-3 sm:grid-cols-2">
            <li>
              <OfficialLink href={EXCHANGE_ALLOTMENT.BSE.url} title="BSE" text="Status of issue application" />
            </li>
            <li>
              <OfficialLink href={EXCHANGE_ALLOTMENT.NSE.url} title="NSE" text="Verify IPO bid / allotment" />
            </li>
          </ul>
        </section>

        <section className="mb-8 rounded-[20px] border border-[#e0e8e6] bg-white p-6 shadow-[0_8px_24px_rgba(23,74,82,0.05)]">
          <h2 className="text-lg font-bold text-zinc-900">How to check your allotment</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-zinc-700">
            <li>Find your IPO above and click &ldquo;Check on&rdquo; its registrar (or BSE / NSE).</li>
            <li>On that page, choose the company name from the IPO list.</li>
            <li>Enter your PAN, application number, or DP ID and client ID, then submit.</li>
            <li>
              If shares were allotted, they reach your demat account the day before listing; otherwise the blocked
              amount is released back to your bank account.
            </li>
          </ol>
          <p className="mt-4 text-xs leading-5 text-zinc-500">
            IPONexa never asks for your PAN or application details. These links open the official registrar and
            exchange websites, which show the result.
          </p>
        </section>
      </div>
    </div>
  );
}

/** Registrar name without the company suffix, for registrars we have no link for. */
function shortRegistrar(name: string | null): string | null {
  return name ? name.replace(/\s+(private\s+)?limited\.?$/i, "").trim() : null;
}

function SectionHeading({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-black text-zinc-900">{title}</h2>
      <p className="mt-1 text-sm text-zinc-600">{text}</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500">{label}</dt>
      <dd className="mt-0.5 font-semibold text-zinc-800">{value}</dd>
    </div>
  );
}

function OfficialLink({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-full items-center justify-between gap-3 rounded-2xl border border-[#e0e8e6] bg-white px-4 py-3.5 shadow-[0_4px_14px_rgba(23,74,82,0.04)] transition hover:border-[#c6dddc] hover:bg-[#f7fbfa]"
    >
      <span>
        <span className="block font-bold text-zinc-900">{title}</span>
        <span className="text-xs text-zinc-500">{text}</span>
      </span>
      <span className="text-[#174a52]">
        <ExternalIcon />
      </span>
    </a>
  );
}
