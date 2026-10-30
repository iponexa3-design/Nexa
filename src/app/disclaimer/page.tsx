import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, ProseSection } from "@/components/content/ContentPage";

export const metadata: Metadata = {
  title: "Disclaimer",
  description:
    "IPONexa provides IPO information only, not investment advice. GMP is unofficial, estimates are not guaranteed, and data can be delayed or incomplete.",
  alternates: { canonical: "/disclaimer" },
};

export default function DisclaimerPage() {
  return (
    <ContentPage
      eyebrow="Legal"
      title="Disclaimer"
      updated="30 October 2026"
      intro={<p>Please read this before using any information on IPONexa.</p>}
    >
      <ProseSection title="Information only, not advice">
        <p>
          All content on IPONexa is provided for general information and education. It is not investment, financial,
          legal or tax advice, and it is not a recommendation to apply for, buy, sell or hold any security. IPONexa is
          not registered with SEBI as an investment adviser or research analyst. Decide for yourself, read the
          company&apos;s offer document, and consult a SEBI-registered adviser if you need advice for your situation.
        </p>
      </ProseSection>

      <ProseSection title="Grey market premium (GMP) is unofficial">
        <p>
          GMP figures come from the unofficial grey market, which is not regulated by SEBI or the stock exchanges.
          They may be inaccurate, inconsistent between sources, delayed or out of date, and they do not predict or
          guarantee the listing price. IPONexa does not deal in the grey market and does not endorse it. See{" "}
          <Link href="/guides/ipo-gmp-explained">what IPO GMP is</Link>.
        </p>
      </ProseSection>

      <ProseSection title="Estimates are not guaranteed returns">
        <p>
          Estimated listing prices and estimated gains per share or per lot are simple calculations from the latest
          GMP and the stated price assumption. Actual listing gains are calculated from the listing-day opening
          price. None of these figures is the profit an investor will make: you may not receive shares, you may sell
          at a different price, and brokerage, taxes and charges are not included. Investing in IPOs and shares
          carries risk, including the loss of capital. See{" "}
          <Link href="/guides/listing-gain-calculation">how listing gains are calculated</Link>.
        </p>
      </ProseSection>

      <ProseSection title="Accuracy and timeliness of data">
        <p>
          IPO details, subscription figures and listing prices are collected from third-party and exchange sources
          that are listed on the <Link href="/about">About page</Link>. They can change after publication, be
          delayed, or contain errors. Always confirm important details with the offer document, the stock exchanges
          (BSE and NSE) or the registrar before making a decision. IPONexa is not responsible for losses arising from
          the use of information on this website.
        </p>
      </ProseSection>

      <ProseSection title="Third-party websites and advertisements">
        <p>
          Links to registrars, exchanges and other websites are provided for convenience; IPONexa does not control
          those websites. Advertisements are served by Google and are not endorsements or recommendations by
          IPONexa.
        </p>
      </ProseSection>

      <ProseSection title="Questions">
        <p>
          If you think something on the site is wrong, please tell us through the{" "}
          <Link href="/contact">contact form</Link>.
        </p>
      </ProseSection>
    </ContentPage>
  );
}
