import Link from "next/link";
import type { Guide } from "@/content/guides";

const UPDATED = "22 November 2026";

/**
 * Guides on applying for and evaluating IPOs (the original guides explain the
 * figures shown on IPONexa). Rules are described as they stood on UPDATED;
 * each guide says where they can change.
 */
export const investingGuides: Guide[] = [
  {
    slug: "how-to-apply-for-ipo",
    title: "How to apply for an IPO in India: UPI, ASBA and bidding at cut-off",
    description:
      "A step-by-step guide to applying for an Indian IPO through your broker or bank: choosing a category, bidding at the cut-off price, approving the UPI mandate in time, and what happens to your money afterwards.",
    updated: UPDATED,
    intro: (
      <p>
        Applying for an IPO takes a few minutes once you have a demat account, but small mistakes, such as missing the
        UPI mandate or bidding below the final price, are the most common reasons applications fail. This guide walks
        through the process and the choices you make along the way.
      </p>
    ),
    sections: [
      {
        id: "before-you-apply",
        title: "What you need before you apply",
        body: (
          <ul>
            <li>
              <strong>A demat and trading account</strong> with a broker. Allotted shares are credited to your demat
              account, so the application must carry its details.
            </li>
            <li>
              <strong>A PAN</strong> linked to that demat account. Each PAN can make only one application in a category;
              duplicates are rejected.
            </li>
            <li>
              <strong>A bank account with UPI</strong>, or net banking with a bank that offers ASBA. The application money
              stays in this account until allotment.
            </li>
            <li>
              <strong>Time to read the offer document.</strong> The Red Herring Prospectus (RHP) describes the business,
              its finances and its risks. Our guide to <Link href="/guides/how-to-read-an-rhp">reading an RHP</Link> shows
              which parts matter most.
            </li>
          </ul>
        ),
      },
      {
        id: "asba-upi",
        title: "How ASBA and UPI payments work",
        body: (
          <>
            <p>
              Every IPO application in India uses <strong>ASBA</strong> (Application Supported by Blocked Amount): the
              bid amount is blocked in your bank account, not debited. You keep earning interest on it, and it is only
              taken if shares are allotted to you.
            </p>
            <p>
              Individual investors applying for up to ₹5 lakh can use <strong>UPI</strong>. You enter your UPI ID in the
              broker&apos;s IPO form, and your UPI app then shows a <strong>mandate request</strong> that you must approve
              to block the money. If you never approve it, your bid is not counted, even though the broker shows it as
              placed. The mandate must be approved before the deadline, normally 5 pm on the day the issue closes. Approve
              it as soon as it arrives rather than on the last evening.
            </p>
            <p>
              Larger applications, and investors who prefer it, use their bank&apos;s net banking ASBA facility instead,
              where the bank blocks the amount directly.
            </p>
          </>
        ),
      },
      {
        id: "category",
        title: "Choosing your category",
        body: (
          <>
            <p>
              Mainboard IPOs reserve shares for different investor categories, and you apply in the one that matches how
              much you bid:
            </p>
            <ul>
              <li>
                <strong>Retail individual investor (RII):</strong> individuals bidding up to ₹2 lakh. Usually 35% of the
                issue (10% for companies that do not meet SEBI&apos;s profitability track record).
              </li>
              <li>
                <strong>Non-institutional investor (NII or HNI):</strong> above ₹2 lakh. One third of this portion is for
                bids of ₹2–10 lakh (small NII) and two thirds for bids above ₹10 lakh (big NII).
              </li>
              <li>
                <strong>Employee and shareholder quotas:</strong> some IPOs reserve shares for the company&apos;s
                employees or for shareholders of a listed parent company. If you qualify, you can apply in that quota as
                well as in the retail category.
              </li>
            </ul>
            <p>
              Institutions (QIBs) bid separately. The{" "}
              <Link href="/guides/ipo-subscription-explained">subscription guide</Link> explains how each category&apos;s
              demand is reported while the issue is open. SME IPOs use different categories and a much larger minimum
              application; see <Link href="/guides/sme-vs-mainboard-ipo">SME vs mainboard IPOs</Link>.
            </p>
          </>
        ),
      },
      {
        id: "cut-off",
        title: "Bidding at the cut-off price",
        body: (
          <>
            <p>
              In a book-built IPO you bid for a number of lots at a price within the band, for example ₹140–₹150. The
              final issue price is set after bidding closes and is usually the top of the band. A bid below the final
              price is not allotted.
            </p>
            <p>
              Retail investors (and employee and shareholder quota applicants) can tick <strong>&ldquo;cut-off&rdquo;</strong>{" "}
              instead of entering a price. This means &ldquo;I will pay whatever the final price is&rdquo;. The amount
              blocked is calculated at the top of the band, and any difference is released after allotment. Bidding at
              cut-off is the simplest way to avoid a rejected bid. Non-institutional investors cannot bid at cut-off and
              must enter a price.
            </p>
          </>
        ),
      },
      {
        id: "how-many-lots",
        title: "How many lots to apply for",
        body: (
          <>
            <p>
              You apply in multiples of the lot size, the minimum number of shares in one application. Every IPO page on
              IPONexa shows the lot size and the minimum amount at the upper price band.
            </p>
            <p>
              In a popular IPO the retail category is often oversubscribed many times over. Retail allotment then works
              like a lottery for <strong>one lot</strong> per successful applicant, so applying for more lots in the
              retail category does not raise your chance of getting shares; it only blocks more money. See{" "}
              <Link href="/guides/ipo-allotment-process">how allotment works</Link> for the details.
            </p>
          </>
        ),
      },
      {
        id: "after-applying",
        title: "After you apply",
        body: (
          <ul>
            <li>
              You can modify or cancel your bid in your broker&apos;s app while the issue is open. After it closes, bids
              cannot be withdrawn.
            </li>
            <li>
              Allotment is finalised on the first working day after the issue closes (T+1). Your blocked money is
              released for the shares you did not get by the next working day.
            </li>
            <li>
              Allotted shares reach your demat account before listing, which is on the third working day after closing
              (T+3). You can sell them from listing day onwards.
            </li>
            <li>
              Check the result on the <Link href="/ipo-allotment-status">allotment status page</Link>, which links to the
              registrar for each current IPO.
            </li>
          </ul>
        ),
      },
    ],
    faq: [
      {
        question: "My broker shows the bid as placed. Is my application complete?",
        answer:
          "Not until the UPI mandate is approved in your UPI app (or the amount is blocked through net banking). A bid without a blocked amount is not considered in the allotment.",
      },
      {
        question: "Can I apply for the same IPO from two broker apps?",
        answer:
          "No. Applications are checked by PAN, and more than one application from the same PAN in the same category is rejected, usually all of them.",
      },
      {
        question: "Do I need money in my account when the IPO lists?",
        answer:
          "No. The money is only needed at the time you approve the mandate. It stays blocked until allotment; if you are allotted shares, that amount is debited, and the rest is released.",
      },
      {
        question: "Is a high GMP a reason to apply?",
        answer: (
          <>
            GMP is an unofficial grey market quote. Our <Link href="/ipo-gmp-accuracy">GMP accuracy study</Link> compares
            it with actual listing prices: the listing often differs from it by several percentage points, and by much
            more for SME IPOs.
          </>
        ),
      },
    ],
  },
  {
    slug: "sme-vs-mainboard-ipo",
    title: "SME IPOs vs mainboard IPOs: what is different and what to watch",
    description:
      "How SME IPOs on NSE Emerge and BSE SME differ from mainboard IPOs: who approves the offer document, minimum application size, market makers, listing-day price limits, liquidity and the extra risks for investors.",
    updated: UPDATED,
    intro: (
      <p>
        More than half the IPOs in India each year are SME issues: small companies listing on the separate SME platforms
        of NSE and BSE. They often show huge subscription numbers and large grey market premiums, but they work quite
        differently from mainboard IPOs and carry more risk. This guide explains the differences.
      </p>
    ),
    sections: [
      {
        id: "what-is-sme",
        title: "What an SME IPO is",
        body: (
          <>
            <p>
              Small and medium enterprises list on dedicated platforms: <strong>NSE Emerge</strong> and{" "}
              <strong>BSE SME</strong>. The rules are designed for smaller companies, with lower requirements on size and
              track record than the main exchange boards. Issue sizes are usually a few crore to around a hundred crore
              rupees, against hundreds or thousands of crores for mainboard IPOs.
            </p>
            <p>
              Every IPO on IPONexa is labelled <strong>SME</strong> or <strong>Mainboard</strong>, and the GMP tracker and
              lists can be filtered by board.
            </p>
          </>
        ),
      },
      {
        id: "approval",
        title: "Who checks the offer document",
        body: (
          <p>
            For a mainboard IPO, the draft offer document is filed with SEBI, which reviews it and issues observations
            before the IPO can open. For an SME IPO, the draft is filed with and approved by the stock exchange&apos;s SME
            platform instead. The disclosures required are also lighter. This does not make SME offer documents
            unreliable, but it does mean that less independent scrutiny has gone into them, so reading the document
            yourself matters more. See <Link href="/guides/how-to-read-an-rhp">how to read an RHP</Link>.
          </p>
        ),
      },
      {
        id: "minimum-application",
        title: "A much larger minimum application",
        body: (
          <>
            <p>
              A mainboard IPO&apos;s minimum application is usually ₹14,000–₹15,000. SME IPOs have large lot sizes, and
              under SEBI rules that took effect in 2025 the minimum application for an individual investor is two lots,
              worth more than ₹2 lakh. In practice an SME application typically ties up ₹2–3 lakh.
            </p>
            <p>
              SME issues also do not have a separate &ldquo;retail&rdquo; category of the mainboard kind. Individual
              investors applying for the minimum size form their own category, and allotment in an oversubscribed SME IPO
              is again by lottery.
            </p>
          </>
        ),
      },
      {
        id: "market-maker",
        title: "Market makers and trading in lots",
        body: (
          <p>
            Every SME IPO must appoint a <strong>market maker</strong>, a broker obliged to quote buy and sell prices for
            the shares for at least three years, so that there is some liquidity. Even so, SME shares trade in lots
            rather than single shares, daily volumes are often small, and selling a holding at a fair price can take time.
            Prices can move very sharply on small amounts of trading.
          </p>
        ),
      },
      {
        id: "listing-day",
        title: "Listing-day price limits",
        body: (
          <>
            <p>
              Because some SME IPOs listed at several times their issue price, the exchanges limit the listing-day
              opening price of an SME IPO to at most 90% above the issue price. Grey market quotes for SME IPOs can still
              imply larger gains than this.
            </p>
            <p>
              SME stocks may also be placed under the exchanges&apos; additional surveillance measures (ASM/GSM) after
              listing if their price or volume moves unusually, which can limit trading.
            </p>
          </>
        ),
      },
      {
        id: "gmp-and-subscription",
        title: "Why SME GMP and subscription figures need extra care",
        body: (
          <>
            <ul>
              <li>
                <strong>GMP is less reliable.</strong> The grey market for a small issue involves very few participants. In
                IPONexa&apos;s <Link href="/ipo-gmp-accuracy">GMP accuracy study</Link>, the gap between the final GMP and
                the actual listing price has been several times larger for SME IPOs than for mainboard ones.
              </li>
              <li>
                <strong>Huge subscription figures are common.</strong> Because the issues are small, a few large bids can
                make an SME IPO look hundreds of times subscribed. Look at the investor category figures, not just the
                total.
              </li>
              <li>
                <strong>Fewer figures are published.</strong> For SME issues on NSE only the overall subscription is
                published in the official feed, and BSE-only SME issues have no automatic feed at all.
              </li>
            </ul>
          </>
        ),
      },
      {
        id: "checklist",
        title: "A checklist before applying for an SME IPO",
        body: (
          <ol>
            <li>Read the business description, the last three years of financials and the risk factors in the offer document.</li>
            <li>Check whether revenue and profit jumped just before the IPO, and whether cash flow from operations supports the profits.</li>
            <li>Look at what the money is for: repaying promoter loans or &ldquo;general corporate purposes&rdquo; deserve more questions than new capacity.</li>
            <li>Compare the valuation (price-to-earnings) with listed peers named in the offer document.</li>
            <li>Check the lead manager&apos;s earlier SME IPOs and how they performed after listing.</li>
            <li>Only apply with money you can leave invested if the share does not list well, since selling may be slow.</li>
          </ol>
        ),
      },
    ],
    faq: [
      {
        question: "Can an SME company move to the main board later?",
        answer:
          "Yes. After a minimum period on the SME platform, and if it meets the main board's requirements such as size and track record, a company can apply to migrate. Many SME companies never do.",
      },
      {
        question: "Are SME IPOs regulated by SEBI?",
        answer:
          "Yes. SEBI sets the rules for SME IPOs and the exchanges, but the exchange's SME platform, not SEBI, approves each individual SME offer document.",
      },
      {
        question: "Why do SME IPOs often show 100x or more subscription?",
        answer:
          "The issues are small, so the number of shares offered to each category is small too. A modest amount of bidding in rupee terms can be many times the shares on offer.",
      },
    ],
  },
  {
    slug: "how-to-read-an-rhp",
    title: "How to read an IPO's RHP (Red Herring Prospectus) in 30 minutes",
    description:
      "Where to find the important parts of an IPO offer document: the objects of the issue, fresh issue vs offer for sale, restated financials, risk factors, promoter holding, litigation and the basis for the issue price.",
    updated: UPDATED,
    intro: (
      <p>
        An IPO&apos;s offer document often runs to 400 pages or more, which is why most investors never open it. You do
        not need to read all of it. This guide lists the sections that answer the questions that matter most, and what to
        look for in each.
      </p>
    ),
    sections: [
      {
        id: "documents",
        title: "DRHP, RHP and prospectus",
        body: (
          <ul>
            <li>
              <strong>DRHP (Draft Red Herring Prospectus):</strong> the first version, filed with SEBI (or the exchange,
              for SME IPOs) months before the IPO. It can change after review.
            </li>
            <li>
              <strong>RHP (Red Herring Prospectus):</strong> the final document published shortly before the IPO opens.
              It has everything except the final price and number of shares. This is the one to read.
            </li>
            <li>
              <strong>Prospectus:</strong> filed after bidding closes, with the final price added.
            </li>
          </ul>
        ),
      },
      {
        id: "where-to-find",
        title: "Where to find it",
        body: (
          <p>
            The RHP is published on the SEBI website, the stock exchanges&apos; websites and the websites of the lead
            managers. Each IPO page on IPONexa links to the prospectus or RHP and to the NSE or BSE issue page when they
            are available, under &ldquo;Documents &amp; Coverage&rdquo;.
          </p>
        ),
      },
      {
        id: "offer-structure",
        title: "1. The offer: fresh issue or offer for sale",
        body: (
          <>
            <p>
              Look for &ldquo;The Offer&rdquo; or &ldquo;Summary of the Offer Document&rdquo; near the start. An IPO can
              have two parts:
            </p>
            <ul>
              <li>
                <strong>Fresh issue:</strong> new shares; the money goes to the company.
              </li>
              <li>
                <strong>Offer for sale (OFS):</strong> existing shareholders (promoters, private equity funds) sell their
                shares; the money goes to them, not the company.
              </li>
            </ul>
            <p>
              A large OFS is not bad in itself, since early investors need to exit at some point, but you should know how
              much of your money is going into the business and how much is buying out existing owners.
            </p>
          </>
        ),
      },
      {
        id: "objects",
        title: "2. Objects of the issue",
        body: (
          <p>
            This section says what the company will do with the fresh issue money. Spending on new plants, capacity or
            technology is easier to judge than repaying debt (sometimes owed to the promoters) or large amounts for
            &ldquo;general corporate purposes&rdquo;, which can be used for almost anything.
          </p>
        ),
      },
      {
        id: "financials",
        title: "3. Restated financial information",
        body: (
          <>
            <p>
              The &ldquo;Financial Information&rdquo; and &ldquo;Management&apos;s Discussion and Analysis&rdquo; sections
              give at least three years of restated results. Check:
            </p>
            <ul>
              <li>Revenue and profit growth, and whether a sudden jump came just before the IPO.</li>
              <li>Cash flow from operations compared with profit. Profits that never turn into cash are a warning sign.</li>
              <li>Debt, and how much of the fresh issue will be used to repay it.</li>
              <li>Receivables (money owed by customers) growing faster than revenue.</li>
            </ul>
          </>
        ),
      },
      {
        id: "risks",
        title: "4. Risk factors",
        body: (
          <p>
            The &ldquo;Risk Factors&rdquo; section lists everything the company and its advisers think could go wrong.
            Much of it is standard wording, so read the first ten or so risks, which tend to be the most specific: reliance
            on a few customers or suppliers, pending regulatory approvals, losses in subsidiaries, or dependence on one
            product or region. The strengths and risks summary on IPONexa&apos;s IPO pages comes from our data provider and
            is no substitute for this section.
          </p>
        ),
      },
      {
        id: "promoters",
        title: "5. Promoters, shareholding and related parties",
        body: (
          <ul>
            <li>
              <strong>Shareholding before and after the IPO:</strong> how much the promoters will still own. A falling but
              still substantial stake is normal.
            </li>
            <li>
              <strong>Recent share allotments:</strong> shares issued to insiders or investors in the last year at prices far
              below the IPO price.
            </li>
            <li>
              <strong>Related party transactions:</strong> large purchases from, sales to or loans with companies owned by
              the promoters.
            </li>
          </ul>
        ),
      },
      {
        id: "litigation",
        title: "6. Outstanding litigation",
        body: (
          <p>
            &ldquo;Outstanding Litigation and Material Developments&rdquo; lists court cases, tax demands and regulatory
            actions involving the company, its promoters and directors. A few tax disputes are common; criminal cases
            against promoters or actions by regulators deserve closer attention.
          </p>
        ),
      },
      {
        id: "price",
        title: "7. Basis for the offer price",
        body: (
          <p>
            This section compares the company&apos;s earnings per share, return on net worth and price-to-earnings ratio
            at the IPO price with listed peers chosen by the company. Check whether the peers really are comparable, and
            whether the IPO is priced well above them. Note that the peer list is chosen by the company and its bankers.
          </p>
        ),
      },
    ],
    faq: [
      {
        question: "Do I need to read the whole RHP?",
        answer:
          "No. The seven sections above answer most investors' questions. The rest is largely legal and regulatory detail.",
      },
      {
        question: "Where are the anchor investors listed?",
        answer: (
          <>
            Anchor allocations are announced by the exchanges the day before the IPO opens, not in the RHP. See{" "}
            <Link href="/guides/anchor-investors-and-lock-in">anchor investors and lock-in</Link>.
          </>
        ),
      },
      {
        question: "Is the company overview on IPONexa taken from the RHP?",
        answer:
          "It is a summary supplied by our IPO data provider. The RHP is the authoritative description of the company and should be read for any decision.",
      },
    ],
  },
  {
    slug: "anchor-investors-and-lock-in",
    title: "Anchor investors in IPOs and when their lock-in ends",
    description:
      "Who anchor investors are, how much of an IPO they can take, why they bid a day early, how their lock-in works (30 and 90 days) and why lock-in expiry dates can matter for a newly listed share.",
    updated: UPDATED,
    intro: (
      <p>
        A day before most mainboard IPOs open, the company announces that it has raised a large sum from
        &ldquo;anchor investors&rdquo;. This guide explains what that means, what it does and does not tell you, and why
        the end of their lock-in period is a date worth knowing.
      </p>
    ),
    sections: [
      {
        id: "who",
        title: "Who anchor investors are",
        body: (
          <p>
            Anchor investors are qualified institutional buyers (QIBs) such as mutual funds, insurance companies, foreign
            portfolio investors and pension funds. They commit to buy shares in the IPO one working day before it opens to
            the public, at a price within the price band. Each anchor must apply for at least ₹10 crore.
          </p>
        ),
      },
      {
        id: "how-much",
        title: "How much of the IPO they take",
        body: (
          <>
            <p>
              Up to 60% of the QIB portion of a mainboard IPO can be allotted to anchor investors. Since the QIB portion
              is usually half the issue, anchors can take up to about 30% of the IPO. Part of the anchor portion is reserved
              for domestic mutual funds, and SEBI has more recently extended that reservation to insurers and pension
              funds.
            </p>
            <p>
              The anchor shares come out of the QIB portion, which is why the QIB subscription figures published during
              bidding are shown &ldquo;excluding anchor&rdquo;.
            </p>
          </>
        ),
      },
      {
        id: "price",
        title: "The anchor price",
        body: (
          <p>
            Anchors are allotted at the anchor price, which cannot be below the final issue price. If the final issue price
            turns out higher than the anchor price, anchors pay the difference. In practice the anchor price is usually the
            top of the price band.
          </p>
        ),
      },
      {
        id: "lock-in",
        title: "The lock-in period",
        body: (
          <>
            <p>Anchor investors cannot sell their shares straight after listing:</p>
            <ul>
              <li>
                <strong>50% of their shares</strong> are locked in for <strong>30 days</strong> from the date of allotment.
              </li>
              <li>
                <strong>The remaining 50%</strong> are locked in for <strong>90 days</strong>.
              </li>
            </ul>
            <p>
              Promoters&apos; shares are locked in for longer, generally 18 months for the minimum promoter contribution
              and 6 months for the rest of their pre-IPO holding, with longer periods in some cases.
            </p>
          </>
        ),
      },
      {
        id: "why-it-matters",
        title: "Why lock-in expiry can matter",
        body: (
          <p>
            When a lock-in ends, a large block of shares becomes free to sell. If many anchors decide to take profits,
            the share price can come under pressure around those dates, especially if it has risen well above the issue
            price. It is not a rule that prices fall: if anchors want to hold, nothing happens. But it is a known date on
            which supply can rise, and worth noting if you hold a newly listed share.
          </p>
        ),
      },
      {
        id: "reading-anchors",
        title: "What the anchor list tells you, and what it does not",
        body: (
          <ul>
            <li>
              A long list of well-known long-term investors suggests institutions have studied the company and are willing
              to commit before the public.
            </li>
            <li>
              It is not a guarantee. Anchors are allotted their shares in full, while public applicants are often heavily
              oversubscribed, and anchors can sell once their lock-in ends.
            </li>
            <li>
              Look at who the anchors are, not just the amount. Allocations concentrated in a few little-known funds say
              less than allocations to large domestic mutual funds and insurers.
            </li>
          </ul>
        ),
      },
    ],
    faq: [
      {
        question: "Do SME IPOs have anchor investors?",
        answer:
          "They can, under similar rules, but anchor portions in SME IPOs are small and often come from a few investors, so they say less about demand.",
      },
      {
        question: "Where can I find an IPO's anchor investors?",
        answer:
          "The company files the list of anchor allocations with the stock exchanges on the anchor bidding day, one working day before the issue opens. It is published on the NSE and BSE websites.",
      },
      {
        question: "When does the 30-day lock-in end for a particular IPO?",
        answer:
          "Thirty days from the anchor allotment date, which is stated in the anchor allocation filing; the 90-day lock-in ends 90 days from the same date.",
      },
    ],
  },
  {
    slug: "ipo-listing-gains-tax",
    title: "How IPO listing gains are taxed in India",
    description:
      "Tax on selling IPO shares in India: short-term capital gains at 20% if sold within 12 months, long-term gains at 12.5% above ₹1.25 lakh, how the holding period is counted from allotment, setting off losses, and when gains can be business income.",
    updated: UPDATED,
    intro: (
      <p>
        If you sell IPO shares at a profit, on listing day or later, the gain is taxable. This guide explains the rates
        that apply to listed equity shares, how the holding period is counted and how losses can be used. Tax rules
        change in Union Budgets; check the rates for the year in which you sell.
      </p>
    ),
    sections: [
      {
        id: "short-term",
        title: "Selling within 12 months: short-term capital gains",
        body: (
          <>
            <p>
              Listed equity shares held for 12 months or less give rise to <strong>short-term capital gains (STCG)</strong>.
              Since 23 July 2024 these are taxed at <strong>20%</strong>, plus any surcharge and 4% health and education
              cess, as long as securities transaction tax (STT) is paid on the sale. Selling on a stock exchange always
              includes STT.
            </p>
            <p>
              Selling allotted shares on listing day is a short-term capital gain like any other: the shares were acquired
              at allotment and sold a few days later.
            </p>
          </>
        ),
      },
      {
        id: "long-term",
        title: "Selling after 12 months: long-term capital gains",
        body: (
          <p>
            Shares held for more than 12 months give <strong>long-term capital gains (LTCG)</strong>. Since 23 July 2024,
            the first <strong>₹1.25 lakh</strong> of such gains from listed equity in a financial year is exempt, and the
            rest is taxed at <strong>12.5%</strong> (plus surcharge and cess), without indexation.
          </p>
        ),
      },
      {
        id: "holding-period",
        title: "How the holding period and cost are counted",
        body: (
          <>
            <ul>
              <li>
                The holding period starts on the <strong>date of allotment</strong> (when the shares are credited), not the
                date you applied or the listing date.
              </li>
              <li>
                Your <strong>cost</strong> is the issue price you paid. Brokerage and charges on the sale can be deducted;
                STT cannot.
              </li>
            </ul>
            <p>
              Example with made-up numbers: 100 shares allotted at ₹150 and sold on listing day at ₹186. The gain is ₹3,600
              before charges. At 20%, the tax is ₹720 plus cess. The{" "}
              <Link href="/guides/listing-gain-calculation">listing gain guide</Link> explains why the gain shown on IPO
              pages differs from your own result.
            </p>
          </>
        ),
      },
      {
        id: "losses",
        title: "If you make a loss",
        body: (
          <ul>
            <li>
              A <strong>short-term capital loss</strong> can be set off against both short-term and long-term capital gains
              in the same year.
            </li>
            <li>A long-term capital loss can be set off only against long-term capital gains.</li>
            <li>
              Losses not used can be carried forward for eight years, but only if you file your income tax return by the
              due date.
            </li>
          </ul>
        ),
      },
      {
        id: "business-income",
        title: "When gains can be business income instead",
        body: (
          <p>
            If you trade shares frequently and in large volumes, the tax department may treat your gains as business income,
            taxed at your slab rate, rather than capital gains. Applying for IPOs and selling on listing day as an occasional
            investor is normally treated as capital gains. If share trading is a substantial activity for you, ask a
            chartered accountant how to report it.
          </p>
        ),
      },
      {
        id: "reporting",
        title: "Reporting in your tax return",
        body: (
          <>
            <p>
              Capital gains from shares are reported in the capital gains schedule of your income tax return. Short-term
              gains mean you cannot use the simplest return form (ITR-1). Your broker&apos;s capital gains statement
              and the Annual Information Statement (AIS) on the income tax portal list your sales.
            </p>
            <p>
              The Income-tax Act, 2025 replaced the Income-tax Act, 1961 from 1 April 2026. The rates above are those set in
              2024; check whether a later Budget has changed them for the year of your sale.
            </p>
          </>
        ),
      },
    ],
    faq: [
      {
        question: "Is there tax if I do not get an allotment?",
        answer: "No. If no shares are allotted, nothing is bought or sold, and the blocked money is simply released.",
      },
      {
        question: "Is the ₹1.25 lakh exemption available for short-term gains?",
        answer:
          "No. It applies only to long-term capital gains on listed equity shares and equity mutual funds. Short-term gains are taxed from the first rupee, although individuals whose total income is below the basic exemption limit may still have no tax to pay.",
      },
      {
        question: "Is TDS deducted when I sell shares?",
        answer:
          "Not for resident individuals selling listed shares on an exchange. You pay the tax yourself through advance tax or when filing your return.",
      },
    ],
  },
];
