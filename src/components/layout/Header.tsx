import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { Logo } from "@/components/layout/Logo";
import { HeaderSearch } from "@/components/layout/HeaderSearch";
import { PrimaryNavigation } from "@/components/layout/PrimaryNavigation";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#dce7e5] bg-[#fbfdfc]/95 shadow-[0_4px_18px_rgba(23,74,82,0.06)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-4 py-3 sm:px-6 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="flex w-full items-center gap-3 2xl:w-auto">
          <Link href="/" aria-label={`${siteConfig.name} home`} className="shrink-0">
            <Logo />
          </Link>
          <HeaderSearch className="ml-auto w-full max-w-[15rem] sm:max-w-xs 2xl:ml-4" />
        </div>
        <PrimaryNavigation items={siteConfig.nav} />
      </div>
    </header>
  );
}
