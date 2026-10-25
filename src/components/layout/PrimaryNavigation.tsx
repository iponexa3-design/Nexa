"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavigationItem {
  label: string;
  href: string;
}

export function PrimaryNavigation({ items }: { items: NavigationItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="flex w-full flex-wrap items-center gap-1 text-sm font-semibold 2xl:w-auto">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={active
              ? "rounded-lg border border-[#c6dddc] bg-[#e6f0ef] px-3 py-2 text-[#174a52]"
              : "rounded-lg border border-transparent px-3 py-2 text-zinc-600 transition-colors hover:border-[#dce7e5] hover:bg-white hover:text-[#174a52]"}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}