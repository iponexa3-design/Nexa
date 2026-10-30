import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content/ContentPage";
import { guides } from "@/content/guides";

export const metadata: Metadata = {
  title: "IPO Guides - GMP, Subscription, Allotment & Listing Gains",
  description:
    "Plain-English guides for Indian retail investors: what IPO GMP means, how to read subscription figures, how allotment works and how listing gains are calculated.",
  alternates: { canonical: "/guides" },
};

export default function GuidesPage() {
  return (
    <ContentPage
      eyebrow="Learn"
      title="IPO Guides"
      intro={
        <p>
          Short, practical explanations of the numbers you see on IPONexa, written for Indian retail investors. They
          explain what each figure means, how we calculate it, and its limits.
        </p>
      }
    >
      <ul className="space-y-4">
        {guides.map((guide) => (
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
