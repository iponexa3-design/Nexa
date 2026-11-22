import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentPage, Faq, ProseSection } from "@/components/content/ContentPage";
import { allGuides, findGuide } from "@/content/guides";

export function generateStaticParams() {
  return allGuides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata(props: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const guide = findGuide((await props.params).slug);
  if (!guide) return { title: "Guide not found" };
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: { type: "article", title: guide.title, description: guide.description },
  };
}

export default async function GuidePage(props: PageProps<"/guides/[slug]">) {
  const guide = findGuide((await props.params).slug);
  if (!guide) notFound();
  const others = allGuides.filter((other) => other.slug !== guide.slug);

  return (
    <ContentPage eyebrow="IPO Guide" title={guide.title} intro={guide.intro} updated={guide.updated}>
      <nav aria-label="On this page" className="rounded-2xl bg-[#f6faf9] px-5 py-4 text-sm">
        <p className="mb-2 font-bold text-zinc-900">On this page</p>
        <ol className="list-decimal space-y-1 pl-5">
          {guide.sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="text-[#174a52] underline-offset-4 hover:underline">
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {guide.sections.map((section) => (
        <ProseSection key={section.id} id={section.id} title={section.title}>
          {section.body}
        </ProseSection>
      ))}

      <Faq items={guide.faq} />

      <section>
        <h2 className="mb-3 text-lg font-bold text-zinc-900">More guides</h2>
        <ul className="space-y-2">
          {others.map((other) => (
            <li key={other.slug}>
              <Link href={`/guides/${other.slug}`} className="font-semibold text-[#174a52] underline underline-offset-4">
                {other.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
        General information only, not investment, legal or tax advice. IPONexa is not a SEBI-registered investment
        adviser. Rules referred to can change; check the current rules before acting.{" "}
        <Link href="/disclaimer" className="font-semibold underline">
          Disclaimer
        </Link>
      </p>
    </ContentPage>
  );
}
