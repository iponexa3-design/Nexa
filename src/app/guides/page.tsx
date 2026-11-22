import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content/ContentPage";
import { allGuides } from "@/content/guides";

export const metadata: Metadata = {
  title: "IPO Guides - GMP, Subscription, Allotment & Listing Gains",
  description:
    "Plain-English guides for Indian retail investors: how to apply for an IPO, SME vs mainboard IPOs, reading an RHP, anchor investors, GMP, subscription, allotment, listing gains and their tax.",
  alternates: { canonical: "/guides" },
};

export default function GuidesPage() {
  return (
    <ContentPage
      eyebrow="Learn"
      title="IPO Guides"
      intro={
        <p>
          Practical guides for Indian retail investors: what the numbers on IPONexa mean and how we calculate them, how to
          apply for an IPO, how to judge one from its offer document, and how listing gains are taxed.
        </p>
      }
    >
      <p className="rounded-2xl bg-[#f6faf9] px-5 py-4 text-sm leading-6">
        <strong className="text-zinc-900">Our research:</strong>{" "}
        <Link href="/ipo-gmp-accuracy" className="font-semibold text-[#174a52] underline underline-offset-4">
          How accurate is IPO GMP?
        </Link>{" "}
        We compare the last grey market premium before listing with the actual listing price of every IPO we track.
      </p>
      <ul className="space-y-4">
        {allGuides.map((guide) => (
          <li key={guide.slug}>
            <Link
              href={`/guides/${guide.slug}`}
              className="block rounded-2xl border border-[#e0e8e6] px-5 py-4 transition hover:border-[#c6dddc] hover:bg-[#f7fbfa]"
            >
              <h2 className="text-lg font-bold text-[#174a52]">{guide.title}</h2>
              <p className="mt-1 text-sm leading-6 text-zinc-600">{guide.description}</p>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm text-zinc-500">
        These guides are general information, not investment, legal or tax advice. Rules referred to can change;
        check the current rules on the SEBI, exchange or Income Tax Department websites.
      </p>
    </ContentPage>
  );
}
