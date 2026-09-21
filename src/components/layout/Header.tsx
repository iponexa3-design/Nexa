import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { Logo } from "@/components/layout/Logo";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm font-medium text-zinc-600">
          {siteConfig.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-1.5 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
