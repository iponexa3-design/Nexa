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
    // Phones: one row that swipes sideways instead of wrapping onto three
    // rows above the content. Larger screens wrap as before.
    <nav
      aria-label="Main navigation"
      className="-mx-4 flex w-[calc(100%+2rem)] items-center gap-1 overflow-x-auto whitespace-nowrap px-4 text-sm font-semibold [scrollbar-width:none] sm:mx-0 sm:w-full sm:flex-wrap sm:overflow-visible sm:px-0 xl:w-auto xl:flex-nowrap [&::-webkit-scrollbar]:hidden"
    >
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={active
              ? "shrink-0 rounded-lg border border-[#c6dddc] bg-[#e6f0ef] px-3 py-2 text-[#174a52]"
              : "shrink-0 rounded-lg border border-transparent px-3 py-2 text-zinc-600 transition-colors hover:border-[#dce7e5] hover:bg-white hover:text-[#174a52]"}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}