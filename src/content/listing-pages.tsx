import Link from "next/link";
import type { ReactNode } from "react";
import type { FaqItem } from "@/components/content/ContentPage";

export type ListingCategory = "upcoming" | "open" | "recentlyListed";

interface ListingPageContent {
  /** Page <title> (the site name is appended). */
  metaTitle: string;
  metaDescription: string;
  path: string;
  explainerTitle: string;
  explainer: ReactNode;
  faq: FaqItem[];
  guides: Array<{ href: string; label: string; text: string }>;
}

const gmpGuide = { href: "/guides/ipo-gmp-explained", label: "What is IPO GMP?", text: "Why GMP is unofficial and how the estimate is calculated." };
const subscriptionGuide = { href: "/guides/ipo-subscription-explained", label: "Subscription explained", text: "How to read QIB, NII and retail figures." };
const allotmentGuide = { href: "/guides/ipo-allotment-process", label: "How allotment works", text: "The T+3 timeline and the retail lottery." };
const listingGuide = { href: "/guides/listing-gain-calculation", label: "Listing gain calculation", text: "Estimated vs actual gains, and why real profit differs." };

export const listingPageContent: Record<ListingCategory, ListingPageContent> = {
  open: {
    metaTitle: "Open IPOs Today - Price Band, Lot Size, GMP & Live Subscription",
    metaDescription:
      "Indian IPOs open for subscription now: price band, lot size, minimum investment, closing date, unofficial GMP and official BSE + NSE subscription figures updated through the day.",
    path: "/open-ipos",
    explainerTitle: "Applying for an open IPO",
    explainer: (
      <>
        <p>
          The IPOs above are accepting bids now. Each card shows the price band, the lot size and the minimum amount
          you need, the closing date, the latest unofficial GMP and the official subscription so far.
        </p>
        <ul>
          <li>
            Applications are made through your broker&apos;s app or your bank&apos;s net banking using ASBA: the
            money stays in your account and is only blocked until allotment.
          </li>
          <li>
            Retail investors can bid for up to ₹2 lakh. Most bid at the &ldquo;cut-off&rdquo; price, which means
            accepting the final issue price.
          </li>
          <li>
            If you apply with UPI, approve the mandate in your UPI app before the UPI mandate deadline shown on the
            IPO&apos;s page, or the application is not completed.
          </li>
          <li>
            Before applying, read the company&apos;s offer document (RHP), in particular its financials and risk
            factors. GMP is not a substitute for it.
          </li>
        </ul>
      </>
    ),
    faq: [
      {
        question: "What does “minimum application” mean?",
        answer:
          "It is the cost of one lot, the smallest number of shares you can apply for, at the upper end of the price band (or the fixed price). For example, a lot of 100 shares in a ₹140–₹150 band needs ₹15,000.",
      },
      {
        question: "Where do the subscription figures come from?",
        answer: (
          <>
            They are the official figures combining bids on BSE and NSE, as published by NSE, and are updated every 30
            minutes on weekdays while bidding is open. See <Link href="/guides/ipo-subscription-explained">how to read them</Link>.
          </>
        ),
      },
      {
        question: "Can I change or cancel my application?",
        answer:
          "Usually yes, until bidding closes, through the same broker or bank you applied with. After the issue closes, applications cannot be changed.",
      },
    ],
    guides: [subscriptionGuide, gmpGuide, allotmentGuide, listingGuide],
  },
  upcoming: {
    metaTitle: "Upcoming IPOs - Dates, Price Band & Lot Size",
    metaDescription:
      "Upcoming Indian mainboard and SME IPOs with opening and closing dates, price band, lot size and issue size as soon as they are announced.",
    path: "/upcoming-ipos",
    explainerTitle: "Before an IPO opens",
    explainer: (
      <>
        <p>
          These IPOs have been scheduled but are not open yet. Companies often announce the dates first and the
          price band a few days before opening, so some details may still show as &ldquo;Not available&rdquo;.
        </p>
        <p>Useful things to check before an IPO opens:</p>
        <ul>
          <li>
            <strong>The offer document (RHP):</strong> what the company does, its financial results, how it will use
            the money raised, and its risk factors.
          </li>
          <li>
            <strong>Fresh issue or offer for sale:</strong> money from a fresh issue goes to the company; in an offer
            for sale, existing shareholders sell their shares and the company receives nothing.
          </li>
          <li>
            <strong>Price band and lot size:</strong> whether one lot fits your budget, and how the valuation compares
            with listed companies in the same business.
          </li>
          <li>
            <strong>Mainboard or SME:</strong> SME IPOs are smaller companies with larger minimum applications and
            usually lower trading volumes after listing.
          </li>
        </ul>
      </>
    ),
    faq: [
      {
        question: "Why is the price band missing for some upcoming IPOs?",
        answer:
          "Companies usually announce the price band only a few days before the IPO opens. We show it as soon as our data source has it, and never guess it.",
      },
      {
        question: "What is an anchor investor?",
        answer:
          "Anchor investors are institutions allotted shares one working day before the IPO opens, from the QIB portion. Under SEBI rules, half of their shares are locked in for 30 days after allotment and the rest for 90 days.",
      },
      {
        question: "Where are IPOs that have been announced without dates?",
        answer: (
          <>
            Announced IPOs without dates are listed in the <Link href="/gmp-tracker?status=upcoming">GMP tracker&apos;s
            upcoming tab</Link> until their schedule is published.
          </>
        ),
      },
    ],
    guides: [subscriptionGuide, gmpGuide, allotmentGuide, listingGuide],
  },
  recentlyListed: {
    metaTitle: "Recently Listed IPOs - Listing Price & Listing Gains",
    metaDescription:
      "Indian IPOs listed in the last 45 days with the actual listing-day opening price from NSE/BSE and the listing gain or loss per share and per lot.",
    path: "/recently-listed-ipos",
    explainerTitle: "How listing results are measured",
    explainer: (
      <>
        <p>
          These IPOs listed in the last 45 days. Each shows the actual listing price and the listing gain or loss,
          not an estimate.
        </p>
        <ul>
          <li>
            The <strong>listing price</strong> is the opening price on the first day of trading, taken from the
            official end-of-day price files published by NSE and BSE.
          </li>
          <li>
            The <strong>listing gain</strong> compares it with the final issue price. If the final price was not
            reported, the upper end of the price band is used and the IPO&apos;s page says so.
          </li>
          <li>
            Gains per lot use the IPO&apos;s lot size and exclude brokerage, taxes and charges, so they are not the
            profit an investor actually made.
          </li>
        </ul>
      </>
    ),
    faq: [
      {
        question: "Why is the listing gain measured at the opening price?",
        answer:
          "The opening price is the first price at which the shares trade, set in the exchange's pre-open session, and is the usual reference for listing gains. The share can move a lot during the rest of the day.",
      },
      {
        question: "Why does a recently listed IPO show no listing price?",
        answer:
          "Listing prices are added on the evening of the listing day, after the exchanges publish their price files. If an exchange file is late, the price appears at the next update.",
      },
    ],
    guides: [listingGuide, gmpGuide, subscriptionGuide, allotmentGuide],
  },
};
