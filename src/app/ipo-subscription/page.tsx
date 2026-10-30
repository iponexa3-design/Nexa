import type { Metadata } from "next";
import Link from "next/link";
import { Faq, GuideLinks, ProseSection } from "@/components/content/ContentPage";
import { SubscriptionTracker } from "@/components/subscription/SubscriptionTracker";
import { getSubscriptionTrackerData } from "@/services/ipo-query-service";

export const metadata: Metadata = {
  title: "IPO Subscription Status Today - QIB, NII & Retail for Every IPO",
  description:
    "Live IPO subscription status for all open, closing and recently listed Indian IPOs: QIB, NII (above and below ₹10 lakh), retail, employee and total, from official BSE + NSE figures.",
  alternates: { canonical: "/ipo-subscription" },
};

// Open IPOs' figures are refreshed every 30 minutes during bidding.
export const revalidate = 300;

export default async function SubscriptionPage() {
  const { rows } = await getSubscriptionTrackerData();
  const open = rows.filter((row) => row.status === "OPEN").length;

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#eaf3f2_0%,#f3f7f6_360px,#f3f7f6_100%)]">
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-6 rounded-[24px] border border-[#174a52] bg-[linear-gradient(125deg,#123a41_0%,#174a52_62%,#28727b_100%)] px-6 py-7 text-white shadow-[0_20px_50px_rgba(23,74,82,0.16)] sm:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c6e0df]">Official exchange figures</p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">IPO Subscription Status</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#d7e8e7]">
            How many times each investor category has bid for the shares on offer, for every open, closing and recently
            listed IPO. Figures combine BSE and NSE bids and are refreshed every 30 minutes on weekdays while bidding
            is open. {open > 0 ? `${open} IPO${open === 1 ? " is" : "s are"} open now.` : ""}
          </p>
        </header>

        <SubscriptionTracker rows={rows} />

        <p className="mt-3 text-xs text-zinc-500">
          QIB figures exclude the anchor portion. A dash means the figure is not published for that issue. Figures above
          1x (highlighted) mean the category is oversubscribed. Click an IPO for its day-wise table.
        </p>

        <div className="mt-10 space-y-8 rounded-[22px] border border-[#e0e8e6] bg-white p-6 text-[15px] leading-7 text-zinc-700 shadow-[0_8px_24px_rgba(23,74,82,0.05)] sm:p-8">
          <ProseSection title="Reading the subscription table">
            <ul>
              <li>
                <strong>QIB</strong> are institutions such as mutual funds, foreign investors, banks and insurers.{" "}
                <strong>NII</strong> are individuals and companies applying for more than ₹2 lakh, split into bids above
                ₹10 lakh and bids of ₹2–10 lakh. <strong>Retail</strong> is individuals applying for up to ₹2 lakh.
              </li>
              <li>
                <strong>2.50x</strong> means investors in that category bid for two and a half times the shares reserved
                for it. The more a category is oversubscribed, the lower the chance of allotment in it.
              </li>
              <li>
                Mainboard figures are the official numbers combining BSE and NSE bids, as published by NSE, with the time
                NSE last updated them. For SME issues on NSE only the overall figure is published. SME issues listed only
                on BSE are not covered yet.
              </li>
            </ul>
          </ProseSection>
          <Faq
            items={[
              {
                question: "When are the final subscription figures available?",
                answer:
                  "On the evening the IPO closes, usually by 7 pm. The exchanges can revise them slightly after reconciling the bids.",
              },
              {
                question: "Why do institutions (QIB) often show low figures until the last day?",
                answer:
                  "Institutions usually place their bids on the final day, so a low QIB figure on day 1 or day 2 is common and is not by itself a sign of weak demand.",
              },
              {
                question: "Does high subscription mean the IPO will list at a profit?",
                answer: (
                  <>
                    Not necessarily. Strong demand often goes with a good listing, but listing prices also depend on market
                    conditions on the day. See <Link href="/recently-listed-ipos">how recent IPOs actually listed</Link>.
                  </>
                ),
              },
            ]}
          />
          <GuideLinks
            title="IPO guides"
            links={[
              { href: "/guides/ipo-subscription-explained", label: "Subscription explained", text: "Categories, quotas and why BSE + NSE are combined." },
              { href: "/guides/ipo-allotment-process", label: "How allotment works", text: "The T+3 timeline and the retail lottery." },
            ]}
          />
          <p className="text-xs leading-5 text-zinc-500">Information only, not investment advice.</p>
        </div>
      </div>
    </div>
  );
}
