import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export function Footer() {
  return (
    <footer className="border-t border-[#153d44] bg-[#153840]">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-[#c4d6d7] sm:px-6">
        <div className="mb-6 rounded-xl border border-[#c48245]/30 bg-[#c48245]/10 px-4 py-3 text-[#ead4be]">
          <strong className="text-[#f2dfcb]">Disclaimer:</strong> Grey Market
          Premium (GMP) figures shown on {siteConfig.name} are unofficial and
          indicative only. The actual listing price may differ from any
          estimate shown here. Subscription and other IPO data may change and
          may be delayed. All information on this website is provided for
          informational and educational purposes only and does not constitute
          investment advice or a recommendation to buy, sell, or apply for any
          IPO. Please make your own independent decisions.
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>
            &copy; {new Date().getFullYear()}{" "}
            <span className="font-semibold text-white">{siteConfig.name}</span>.
            All rights reserved.
          </p>
          <Link href="/privacy" className="font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
            Privacy policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
