import Link from "next/link";
import type { ReactNode } from "react";
import type { FaqItem } from "@/components/content/ContentPage";

export interface Guide {
  slug: string;
  title: string;
  /** Meta description and card text. */
  description: string;
  updated: string;
  intro: ReactNode;
  sections: Array<{ id: string; title: string; body: ReactNode }>;
  faq: FaqItem[];
}

const GUIDES_UPDATED = "30 October 2026";

export const guides: Guide[] = [
  {
    slug: "ipo-gmp-explained",
    title: "What is IPO GMP (grey market premium)?",
    description:
      "What the grey market premium of an IPO means, where the number comes from, how IPONexa turns it into an estimated listing price, and why it is not a reliable forecast.",
    updated: GUIDES_UPDATED,
    intro: (
      <p>
        GMP is the number most people check before applying for an IPO. This guide explains what it actually
        measures, how the estimates on IPONexa are calculated from it, and its limits.
      </p>
    ),
    sections: [
      {
        id: "meaning",
        title: "What GMP means",
        body: (
          <>
            <p>
              Before an IPO lists on the stock exchange, some people informally buy and sell rights to its shares in
              what is called the <strong>grey market</strong>. The <strong>grey market premium (GMP)</strong> is
              the amount above the issue price at which those informal deals are quoted.
            </p>
            <p>
              For example, if an IPO&apos;s price band is ₹140 to ₹150 and the GMP is ₹40, the grey market is
              suggesting the share might trade around ₹190 (₹150 + ₹40) on listing day. A negative GMP suggests the
              share might list below its issue price.
            </p>
          </>
        ),
      },
      {
        id: "unofficial",
        title: "GMP is unofficial",
        body: (
          <>
            <p>
              The grey market is not part of the regulated stock market. It is not run or supervised by SEBI, BSE
              or NSE, there is no official record of its prices, and anyone dealing in it has no investor
              protection. Different sources often quote different GMPs for the same IPO on the same day, and a GMP
              can be pushed up or down by a small number of participants, especially for small SME issues.
            </p>
            <p>
              Because of this, IPONexa shows GMP as an <strong>indicative, unofficial figure</strong> and keeps it
              clearly separate from official data such as the price band, subscription figures and the actual
              listing price.
            </p>
          </>
        ),
      },
      {
        id: "how-we-show-it",
        title: "How IPONexa shows GMP",
        body: (
          <ul>
            <li>
              GMP figures come from our IPO data provider and are refreshed once a day, in the evening (Indian
              time). Each figure shows the date it was quoted.
            </li>
            <li>
              A GMP quoted more than 48 hours ago is marked <strong>Outdated</strong>, so an old number is never
              presented as current.
            </li>
            <li>
              If no GMP has been reported, we show &ldquo;No GMP reported&rdquo; instead of ₹0. A missing GMP does
              not mean the market expects a flat listing.
            </li>
            <li>
              Once an IPO lists, we stop showing GMP and show the actual listing price and gain from the stock
              exchanges instead.
            </li>
          </ul>
        ),
      },
      {
        id: "estimate",
        title: "How the estimated listing price is calculated",
        body: (
          <>
            <p>The estimates on IPONexa use simple arithmetic on the latest GMP:</p>
            <ul>
              <li>
                <strong>Estimated listing price</strong> = issue price + GMP. Until the final issue price is
                announced, we use the <strong>upper end of the price band</strong>, because that is the price most
                IPOs are finally priced at and the price retail investors usually bid at (the &ldquo;cut-off&rdquo;
                price).
              </li>
              <li>
                <strong>GMP %</strong> = GMP ÷ that price × 100.
              </li>
              <li>
                <strong>Estimated gain per lot</strong> = GMP × number of shares in one lot.
              </li>
            </ul>
            <p>
              Example with made-up numbers: price band ₹140–₹150, GMP ₹40, lot of 100 shares. Estimated listing
              price ₹190, GMP % 26.67%, estimated gain per lot ₹4,000. These are indicative figures only; see{" "}
              <Link href="/guides/listing-gain-calculation">how listing gains are calculated</Link> for why your
              actual result can be very different.
            </p>
          </>
        ),
      },
      {
        id: "using-gmp",
        title: "Using GMP sensibly",
        body: (
          <ul>
            <li>Treat GMP as market gossip with a number attached, not as a forecast.</li>
            <li>
              Compare it with official information: the company&apos;s financials and risks in the offer document
              (RHP), the price band, and the official subscription figures published by the exchanges.
            </li>
            <li>
              Look at how past IPOs actually listed. The <Link href="/recently-listed-ipos">recently listed IPOs</Link>{" "}
              page shows real listing-day results.
            </li>
            <li>Do not deal in the grey market itself; trades there are informal and unprotected.</li>
          </ul>
        ),
      },
    ],
    faq: [
      {
        question: "Does a high GMP guarantee listing gains?",
        answer:
          "No. GMP can fall sharply in the days before listing, and the opening price on listing day is set by the exchange's pre-open session, not by the grey market. IPOs with a high GMP have listed lower than expected, and some have listed below the issue price.",
      },
      {
        question: "Why does the GMP on different websites differ?",
        answer:
          "There is no official source. Each website or dealer collects quotes from its own contacts at different times of the day, so the numbers rarely match exactly. IPONexa shows the date of every GMP figure so you can see how recent it is.",
      },
      {
        question: "Why do some IPOs have no GMP?",
        answer:
          "Grey market dealers do not quote every IPO, especially small SME issues. When our data provider has no GMP for an IPO, we say so instead of showing zero.",
      },
      {
        question: "Is GMP shown after the IPO lists?",
        answer:
          "No. After listing, the actual listing price is known, so IPONexa shows the real listing price and gain instead of a GMP-based estimate.",
      },
    ],
  },
  {
    slug: "ipo-subscription-explained",
    title: "IPO subscription status explained: QIB, NII and retail",
    description:
      "What 'subscribed 22 times' means, who QIB, NII and retail investors are, why the official figure combines BSE and NSE bids, and how to read day-wise subscription.",
    updated: GUIDES_UPDATED,
    intro: (
      <p>
        Subscription figures are the most reliable demand signal for an IPO, because they come from the stock
        exchanges. This guide explains how to read them.
      </p>
    ),
    sections: [
      {
        id: "times-subscribed",
        title: "What “times subscribed” means",
        body: (
          <>
            <p>
              During the bidding days, investors apply for shares. <strong>Times subscribed</strong> is the number
              of shares applied for divided by the number of shares on offer. &ldquo;Subscribed 22 times&rdquo;
              means investors bid for 22 times more shares than were available.
            </p>
            <p>
              The figures shown during bidding exclude the anchor portion, which is allotted to selected
              institutions one working day before the IPO opens.
            </p>
          </>
        ),
      },
      {
        id: "categories",
        title: "The investor categories",
        body: (
          <>
            <p>The shares in a mainboard IPO are divided between groups of investors, each with its own quota:</p>
            <ul>
              <li>
                <strong>QIB (qualified institutional buyers):</strong> mutual funds, foreign portfolio investors,
                banks, insurance companies and similar institutions.
              </li>
              <li>
                <strong>NII (non-institutional investors), also called HNIs:</strong> individuals and companies
                applying for more than ₹2 lakh. The NII quota is split: one-third for applications between ₹2 lakh
                and ₹10 lakh (&ldquo;small NII&rdquo;) and two-thirds for applications above ₹10 lakh (&ldquo;big
                NII&rdquo;).
              </li>
              <li>
                <strong>Retail (RII):</strong> individuals applying for up to ₹2 lakh.
              </li>
              <li>
                Some IPOs also reserve shares for <strong>employees</strong> or for <strong>shareholders</strong>{" "}
                of a listed parent company.
              </li>
            </ul>
            <p>
              Under SEBI&apos;s rules, a company with the required profit track record must keep at least 35% of the
              net offer for retail investors, at least 15% for NIIs and not more than 50% for QIBs. A company that
              does not meet those conditions must give at least 75% to QIBs, with not more than 15% for NIIs and
              10% for retail investors. The exact split for each IPO is in its offer document.
            </p>
          </>
        ),
      },
      {
        id: "bse-nse",
        title: "Why the official figure combines BSE and NSE",
        body: (
          <>
            <p>
              Bids for an IPO are collected through both BSE and NSE. The official subscription figure combines
              the bids received on both exchanges. Figures that count only one exchange&apos;s bids can be far lower:
              for a large IPO, the NSE-only figure can be roughly half of the combined one.
            </p>
            <p>
              IPONexa shows the <strong>combined BSE + NSE figures</strong> as published by NSE, with the time NSE
              last updated them. During bidding we refresh them every 30 minutes on weekdays.
            </p>
          </>
        ),
      },
      {
        id: "day-wise",
        title: "Reading day-wise subscription",
        body: (
          <>
            <p>
              Most IPOs are open for three working days. The day-wise table on each IPO page shows the cumulative
              figures at the end of each bidding day (Day 1, Day 2, Day 3). Institutions often bid on the last
              day, so a low QIB figure on Day 1 or Day 2 is common and does not by itself mean weak demand.
            </p>
            <p>
              Final figures are usually published on the evening the IPO closes and can be revised slightly after
              the exchanges reconcile the bids, which is why websites sometimes show small differences.
            </p>
          </>
        ),
      },
      {
        id: "sme",
        title: "SME IPOs",
        body: (
          <p>
            SME IPOs list on NSE Emerge or BSE SME and follow separate rules, including larger minimum application
            sizes. For SME issues on NSE, the exchange publishes only an overall subscription figure, which is what
            IPONexa shows. For SME issues listed only on BSE, we do not currently have subscription figures and say
            so on the IPO page.
          </p>
        ),
      },
    ],
    faq: [
      {
        question: "Does heavy oversubscription mean I will get shares?",
        answer: (
          <>
            The opposite: the more an IPO is oversubscribed, the lower your chance of allotment. In an
            oversubscribed IPO, retail allotment is decided by a lottery. See{" "}
            <Link href="/guides/ipo-allotment-process">how IPO allotment works</Link>.
          </>
        ),
      },
      {
        question: "Does high subscription mean the share will list at a profit?",
        answer:
          "Strong demand often goes with a good listing, but it is not a guarantee. Listing prices also depend on market conditions on the listing day and on how many allotted investors decide to sell.",
      },
      {
        question: "Why do subscription numbers change during the day?",
        answer:
          "The exchanges update the bid totals several times during the bidding hours. IPONexa shows the time of the figures it displays, and records the last figures of each day in the day-wise table.",
      },
    ],
  },
  {
    slug: "ipo-allotment-process",
    title: "How IPO allotment works and how to check your status",
    description:
      "The T+3 IPO timeline, how shares are allotted when an IPO is oversubscribed, where to check your allotment status safely, and what happens to your money if you do not get shares.",
    updated: GUIDES_UPDATED,
    intro: (
      <p>
        After bidding closes, the registrar decides who gets shares. This guide explains the timeline, the
        allotment rules for retail investors, and where to check the result.
      </p>
    ),
    sections: [
      {
        id: "timeline",
        title: "The timeline after an IPO closes",
        body: (
          <>
            <p>
              For public issues opening on or after 1 December 2023, SEBI requires listing within three working
              days of the issue closing (the &ldquo;T+3&rdquo; timeline). Counting the closing day as T:
            </p>
            <ul>
              <li>
                <strong>T+1:</strong> the basis of allotment is finalised and allotment results become available.
              </li>
              <li>
                <strong>T+2:</strong> shares are credited to the demat accounts of successful applicants, and the
                money blocked for unsuccessful applications is released.
              </li>
              <li>
                <strong>T+3:</strong> the shares list on the exchange and trading begins.
              </li>
            </ul>
            <p>
              Weekends and exchange holidays are not counted. Each IPO&apos;s exact dates are in its offer document
              and on its IPONexa page.
            </p>
          </>
        ),
      },
      {
        id: "retail-allotment",
        title: "How retail investors are allotted shares",
        body: (
          <>
            <p>
              If an IPO is not oversubscribed in the retail category, every valid retail application receives the
              shares applied for. If it is oversubscribed, SEBI&apos;s rules aim to give the minimum application
              size (one lot) to as many retail applicants as possible. When there are more applicants than lots
              available, the allottees are chosen by a computerised lottery.
            </p>
            <p>
              In practice, this means that in a heavily oversubscribed IPO, applying for several lots does not
              improve a retail applicant&apos;s chance of getting one lot. Applications in the NII category are also
              allotted their minimum application size by lottery when that category is oversubscribed.
            </p>
          </>
        ),
      },
      {
        id: "check-status",
        title: "Where to check your allotment status",
        body: (
          <>
            <ul>
              <li>
                <strong>The registrar&apos;s website.</strong> Every IPO has a registrar (for example KFin
                Technologies, MUFG Intime or Bigshare Services) that runs the allotment. Select the IPO and enter
                your PAN, application number or demat details.
              </li>
              <li>
                <strong>BSE or NSE.</strong> Both exchanges offer an application status check for IPOs listed on
                them.
              </li>
              <li>Your broker&apos;s app or your bank (for the UPI mandate or blocked amount) will also show the outcome.</li>
            </ul>
            <p>
              The <Link href="/ipo-allotment-status">IPO allotment status</Link> page lists current IPOs with links to
              the right registrar and exchange pages. Results usually appear on the evening of the allotment date.
            </p>
          </>
        ),
      },
      {
        id: "not-allotted",
        title: "If you do not get shares",
        body: (
          <p>
            IPO applications use ASBA: your money stays in your bank account and is only blocked, through a UPI
            mandate or your bank. If you are not allotted shares, the block is released, normally by the T+2 day.
            If it is not released on time, contact your bank or broker and the registrar.
          </p>
        ),
      },
    ],
    faq: [
      {
        question: "Is it safe to enter my PAN on allotment websites?",
        answer:
          "Use only the official registrar and exchange websites, which you can reach from our allotment page. Checking allotment never requires your password, OTP, card or bank details; never share those with anyone. IPONexa itself never asks for your PAN.",
      },
      {
        question: "Why does the registrar's website not show my status yet?",
        answer:
          "Results appear only after the basis of allotment is finalised, usually on the evening of the allotment date. Make sure you have selected the correct IPO name in the registrar's list.",
      },
      {
        question: "Does applying through more family members' accounts help?",
        answer:
          "Each PAN can submit only one application per category; multiple applications with the same PAN are rejected. Applications from different eligible family members, each with their own PAN and demat account, are treated separately in the lottery.",
      },
    ],
  },
  {
    slug: "listing-gain-calculation",
    title: "How IPO listing gains are calculated",
    description:
      "The difference between estimated listing price, actual listing price and the profit you actually make, with the exact formulas IPONexa uses and the costs and taxes that reduce real returns.",
    updated: GUIDES_UPDATED,
    intro: (
      <p>
        IPONexa shows two kinds of gain figures: <strong>estimates</strong> before listing, based on GMP, and{" "}
        <strong>actual listing results</strong> after listing, based on exchange data. Neither is the profit you
        personally make. This guide explains why.
      </p>
    ),
    sections: [
      {
        id: "terms",
        title: "The prices involved",
        body: (
          <ul>
            <li>
              <strong>Price band:</strong> the range within which investors bid, for example ₹140–₹150.
            </li>
            <li>
              <strong>Issue price:</strong> the final price at which shares are allotted, usually the upper end of
              the band.
            </li>
            <li>
              <strong>Listing price:</strong> the opening price of the share on its first trading day, set in the
              exchange&apos;s pre-open session. IPONexa takes it from the official end-of-day price files published
              by NSE and BSE.
            </li>
          </ul>
        ),
      },
      {
        id: "formulas",
        title: "The formulas IPONexa uses",
        body: (
          <>
            <p>
              <strong>Before listing (estimate):</strong>
            </p>
            <ul>
              <li>Estimated listing price = issue price (or the upper price band if not yet final) + GMP</li>
              <li>Estimated gain per share = GMP</li>
              <li>Estimated gain per lot = GMP × shares per lot</li>
            </ul>
            <p>
              <strong>After listing (actual result):</strong>
            </p>
            <ul>
              <li>Listing gain per share = listing price − issue price</li>
              <li>Listing gain per lot = listing gain per share × shares per lot</li>
              <li>Listing gain % = listing gain per share ÷ issue price × 100</li>
            </ul>
            <p>
              Example with made-up numbers: issue price ₹150, 100 shares per lot. If the GMP was ₹40, the estimated
              gain per lot was ₹4,000. If the share then opened at ₹186, the actual listing gain is ₹36 per share,
              ₹3,600 per lot, or 24%.
            </p>
          </>
        ),
      },
      {
        id: "real-profit",
        title: "Why your real profit is different",
        body: (
          <ul>
            <li>
              <strong>You may not get shares at all.</strong> In oversubscribed IPOs most applicants receive
              nothing.
            </li>
            <li>
              <strong>You may sell at a different price.</strong> The listing price is only the opening price; the
              share can move sharply during the first minutes and days of trading.
            </li>
            <li>
              <strong>Charges.</strong> Selling involves brokerage, securities transaction tax (STT), exchange and
              SEBI fees, GST and demat (DP) charges. They are small on a single lot but not zero.
            </li>
            <li>
              <strong>Tax.</strong> Gains on listed shares sold within 12 months are short-term capital gains. For
              transfers on or after 23 July 2024 these are taxed at 20% (plus applicable surcharge and cess). Tax
              rules change; check the current rules or ask a tax adviser for your situation.
            </li>
          </ul>
        ),
      },
      {
        id: "assumptions",
        title: "Assumptions we state on every page",
        body: (
          <p>
            Where an estimate uses the upper price band instead of the final issue price, the IPO page says so. All
            figures exclude brokerage, taxes and charges. Estimates are indicative only and are not a prediction or a
            promise of any return.
          </p>
        ),
      },
    ],
    faq: [
      {
        question: "Why does IPONexa use the upper price band before the final price is known?",
        answer:
          "Most book-built IPOs are priced at the upper end of the band, and retail investors usually bid at the cut-off price. The page labels the estimate as using the upper band so the assumption is clear.",
      },
      {
        question: "Is the listing gain on IPONexa the same as the closing price gain?",
        answer:
          "No. IPONexa measures the gain at the listing-day opening price. The share's closing price on the first day can be higher or lower.",
      },
    ],
  },
];

export function findGuide(slug: string): Guide | undefined {
  return guides.find((guide) => guide.slug === slug);
}
