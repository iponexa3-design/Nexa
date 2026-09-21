import { siteConfig } from "@/lib/site-config";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-zinc-500 sm:px-6">
        <p className="mb-3">
          <strong className="text-zinc-700">Disclaimer:</strong> Grey Market
          Premium (GMP) figures shown on {siteConfig.name} are unofficial and
          indicative only. The actual listing price may differ from any
          estimate shown here. Subscription and other IPO data may change and
          may be delayed. All information on this website is provided for
          informational and educational purposes only and does not constitute
          investment advice or a recommendation to buy, sell, or apply for any
          IPO. Please make your own independent decisions.
        </p>
        <p>
          &copy; {new Date().getFullYear()} {siteConfig.name}. All rights
          reserved.
        </p>
      </div>
    </footer>
  );
}
