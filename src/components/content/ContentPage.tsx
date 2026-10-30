import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Layout for text pages (guides, About, legal pages): the site's teal header
 * band, then readable prose in a white card.
 */
export function ContentPage({
  eyebrow,
  title,
  intro,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: ReactNode;
  /** e.g. "30 October 2026" */
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-[linear-gradient(180deg,#eaf3f2_0%,#f3f7f6_360px,#f3f7f6_100%)]">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8 rounded-[24px] border border-[#174a52] bg-[linear-gradient(125deg,#123a41_0%,#174a52_62%,#28727b_100%)] px-6 py-7 text-white shadow-[0_20px_50px_rgba(23,74,82,0.16)] sm:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c6e0df]">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">{title}</h1>
          <div className="mt-3 max-w-2xl text-[15px] leading-7 text-[#d7e8e7]">{intro}</div>
          {updated ? <p className="mt-4 text-xs text-[#c6e0df]">Last updated {updated}</p> : null}
        </header>
        <article className="space-y-8 rounded-[22px] border border-[#e0e8e6] bg-white p-6 text-[15px] leading-7 text-zinc-700 shadow-[0_8px_24px_rgba(23,74,82,0.05)] sm:p-8">
          {children}
        </article>
      </div>
    </div>
  );
}

export function ProseSection({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-3 text-xl font-bold text-zinc-900">{title}</h2>
      <div className="space-y-3 [&_a]:font-semibold [&_a]:text-[#174a52] [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_strong]:text-zinc-900 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

export interface FaqItem {
  question: string;
  answer: ReactNode;
}

/** Questions and answers as native expandable elements (no script needed). */
export function Faq({ items, title = "Frequently asked questions" }: { items: FaqItem[]; title?: string }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-bold text-zinc-900">{title}</h2>
      <div className="divide-y divide-zinc-100 rounded-2xl border border-[#e0e8e6] bg-white">
        {items.map((item) => (
          <details key={item.question} className="group px-5 py-4 [&_a]:font-semibold [&_a]:text-[#174a52] [&_a]:underline [&_a]:underline-offset-4">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-semibold text-zinc-900 [&::-webkit-details-marker]:hidden">
              {item.question}
              <span aria-hidden="true" className="mt-0.5 text-[#4f8f93] transition group-open:rotate-45">
                +
              </span>
            </summary>
            <div className="mt-2 text-[15px] leading-7 text-zinc-700">{item.answer}</div>
          </details>
        ))}
      </div>
    </section>
  );
}

/** Short block of links to related guides, used under data pages. */
export function GuideLinks({
  title = "Learn more",
  links,
}: {
  title?: string;
  links: Array<{ href: string; label: string; text: string }>;
}) {
  return (
    <section aria-label={title}>
      <h2 className="mb-3 text-lg font-bold text-zinc-900">{title}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="block h-full rounded-2xl border border-[#e0e8e6] bg-white px-5 py-4 shadow-[0_4px_14px_rgba(23,74,82,0.04)] transition hover:border-[#c6dddc] hover:bg-[#f7fbfa]"
            >
              <span className="block font-bold text-[#174a52]">{link.label}</span>
              <span className="text-sm leading-6 text-zinc-600">{link.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
