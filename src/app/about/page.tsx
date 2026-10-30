import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, ProseSection } from "@/components/content/ContentPage";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "About IPONexa - What We Show and Where the Data Comes From",
  description:
    "What IPONexa is, where its IPO, GMP, subscription and listing data comes from, how often it is updated, and what the site is not.",
  alternates: { canonical: "/about" },
};

const sources = [
  {
    data: "IPO details: dates, price band, lot size, issue size, company summary",
    source: "IPO Alert (ipoalerts.in), an IPO data provider",
    when: "Once a day, in the evening (IST)",
  },
  {
    data: "Grey market premium (GMP)",
    source:
      "IPO Alert. Where it has no GMP for an IPO, a figure may be entered manually from another public GMP website, and is labelled \"Entered manually from\" that website. GMP is unofficial grey-market information",
    when: "Once a day, in the evening (IST); manual entries show their own date",
  },
  {
    data: "Subscription figures (QIB, NII, retail, total)",
    source: "NSE public issue information (combined BSE + NSE bids)",
    when: "Every 30 minutes on weekdays while an IPO is open; once a day otherwise",
  },
  {
    data: "Registrar for allotment links",
    source: "NSE public issue information",
    when: "Looked up once per IPO",
  },
  {
    data: "Actual listing price",
    source: "Official end-of-day price files (bhavcopy) published by NSE and BSE",
    when: "The evening of the listing day",
  },
];

export default function AboutPage() {
  return (
    <ContentPage
      eyebrow="About"
      title="About IPONexa"
      intro={
        <p>
          IPONexa brings the information a retail investor looks for about Indian IPOs into one place, and is clear
          about which numbers are official and which are not.
        </p>
      }
    >
      <ProseSection title="What you can find here">
        <ul>
          <li>
            Open, upcoming and recently listed mainboard and SME IPOs, with price band, lot size, minimum investment
            and key dates.
          </li>
          <li>
            The <Link href="/gmp-tracker">GMP tracker</Link>, with indicative listing estimates for IPOs that have not
            listed yet.
          </li>
          <li>Official subscription figures by investor category, including a day-wise table during bidding.</li>
          <li>
            <Link href="/ipo-allotment-status">Allotment status links</Link> to the official registrar and exchange
            pages.
          </li>
          <li>Actual listing prices and listing gains after an IPO lists.</li>
          <li>
            <Link href="/guides">Guides</Link> that explain what these numbers mean.
          </li>
        </ul>
      </ProseSection>

      <ProseSection title="Where the data comes from">
        <p>
          Every figure on IPONexa comes from one of these sources, and the source of each GMP is shown next to it. We
          do not create or estimate IPO figures ourselves.
        </p>
        <div className="overflow-x-auto rounded-xl border border-zinc-100">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-[#f6faf9] text-xs text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Data</th>
                <th className="px-3 py-2 font-semibold">Source</th>
                <th className="px-3 py-2 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((row) => (
                <tr key={row.data} className="border-t border-zinc-100 align-top">
                  <td className="px-3 py-2 font-medium text-zinc-800">{row.data}</td>
                  <td className="px-3 py-2">{row.source}</td>
                  <td className="px-3 py-2">{row.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Company descriptions, strengths and risks shown on IPO pages are summaries supplied by our data provider.
          They are labelled as such; the offer document (RHP) filed with SEBI and the exchanges is the authoritative
          source.
        </p>
      </ProseSection>

      <ProseSection title="How we handle missing or old data">
        <ul>
          <li>A missing figure is shown as &ldquo;Not available&rdquo;. We never fill gaps with guesses or zero.</li>
          <li>Every GMP shows the date it was quoted; GMP older than 48 hours is marked as outdated.</li>
          <li>Subscription figures show the time the exchange last updated them.</li>
          <li>
            Estimates state their assumptions, for example when the upper end of the price band is used because the
            final issue price is not known yet. See{" "}
            <Link href="/guides/listing-gain-calculation">how listing gains are calculated</Link>.
          </li>
        </ul>
      </ProseSection>

      <ProseSection title="What IPONexa is not">
        <p>
          IPONexa is an information website. It is not a SEBI-registered investment adviser, research analyst or
          stockbroker, it does not give buy, sell or apply recommendations, and it does not take IPO applications or
          handle money. Please read the <Link href="/disclaimer">disclaimer</Link>.
        </p>
      </ProseSection>

      <ProseSection title="Advertising">
        <p>
          IPONexa is free to use and shows advertisements served by Google AdSense to cover its running costs.
          Advertisements are not recommendations by IPONexa. See the <Link href="/privacy">privacy policy</Link> for
          how advertising cookies are handled.
        </p>
      </ProseSection>

      {siteConfig.operator ? (
        <ProseSection title="Who runs IPONexa">
          <p>
            IPONexa is run by <strong>{siteConfig.operator.name}</strong>, based in {siteConfig.operator.city}. It
            is an independent website and is not affiliated with any stock exchange, registrar, broker or company
            whose IPO appears on the site.
          </p>
        </ProseSection>
      ) : null}

      <ProseSection title="Contact and corrections">
        <p>
          If you spot a wrong or missing figure, or have a question, please use the{" "}
          <Link href="/contact">contact form</Link>. Corrections to data are checked against the original source
          before anything is changed.
        </p>
      </ProseSection>
    </ContentPage>
  );
}
