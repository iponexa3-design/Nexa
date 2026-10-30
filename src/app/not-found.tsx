import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

const links = [
  { href: "/", label: "Home", text: "Open, upcoming and recently listed IPOs" },
  { href: "/gmp-tracker", label: "GMP Tracker", text: "Every IPO with GMP, estimates and listing results" },
  { href: "/ipo-allotment-status", label: "Allotment Status", text: "Links to the official allotment pages" },
  { href: "/guides", label: "IPO Guides", text: "GMP, subscription, allotment and listing gains explained" },
];

export default function NotFound() {
  return (
    <div className="bg-[linear-gradient(180deg,#eaf3f2_0%,#f3f7f6_360px,#f3f7f6_100%)]">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#4f8f93]">Error 404</p>
        <h1 className="mt-2 text-3xl font-black text-zinc-900">This page could not be found</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-7 text-zinc-600">
          The address may be mistyped, or the IPO may no longer be in our records. These pages may help:
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block rounded-2xl border border-[#e0e8e6] bg-white px-5 py-4 shadow-[0_4px_14px_rgba(23,74,82,0.04)] transition hover:border-[#c6dddc] hover:bg-[#f7fbfa]"
              >
                <span className="block font-bold text-[#174a52]">{link.label}</span>
                <span className="text-sm text-zinc-600">{link.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
