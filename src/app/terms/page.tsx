import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, ProseSection } from "@/components/content/ContentPage";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms that apply when you use the IPONexa website.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <ContentPage
      eyebrow="Legal"
      title="Terms of Use"
      updated="30 October 2026"
      intro={<p>By using IPONexa you agree to these terms. If you do not agree, please do not use the website.</p>}
    >
      <ProseSection title="1. The service">
        <p>
          IPONexa is a free website that publishes information about Indian IPOs. It does not provide investment
          advice, accept IPO applications, or handle money or securities. The website may change, be unavailable, or
          stop at any time.
        </p>
      </ProseSection>

      <ProseSection title="2. No advice and no guarantee">
        <p>
          Information on IPONexa is provided &ldquo;as is&rdquo; for general information only, without any
          guarantee that it is accurate, complete or up to date. Grey market premium (GMP) figures are unofficial and
          all estimates are indicative. You are responsible for your own investment decisions. Please read the{" "}
          <Link href="/disclaimer">disclaimer</Link>.
        </p>
      </ProseSection>

      <ProseSection title="3. Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>use the website for anything unlawful or misleading;</li>
          <li>attempt to disrupt, overload or gain unauthorised access to the website or its systems;</li>
          <li>
            copy or republish substantial parts of the website, or collect its data automatically in bulk, without
            permission;
          </li>
          <li>send spam or abusive messages through the contact form.</li>
        </ul>
      </ProseSection>

      <ProseSection title="4. Content and trademarks">
        <p>
          The website&apos;s design, text and guides belong to IPONexa. IPO data, company names and trademarks belong
          to their respective owners and data sources, and are shown for information.
        </p>
      </ProseSection>

      <ProseSection title="5. Links and advertisements">
        <p>
          The website links to third-party websites such as registrars and stock exchanges and shows advertisements
          served by Google. IPONexa is not responsible for the content, products or services of third parties.
        </p>
      </ProseSection>

      <ProseSection title="6. Limitation of liability">
        <p>
          To the extent permitted by law, IPONexa is not liable for any loss or damage arising from the use of, or
          reliance on, the website or its information, including investment losses.
        </p>
      </ProseSection>

      <ProseSection title="7. Privacy">
        <p>
          How we handle data, cookies and advertising is described in the <Link href="/privacy">privacy policy</Link>.
        </p>
      </ProseSection>

      <ProseSection title="8. Changes and contact">
        <p>
          These terms may be updated; the date at the top shows the latest version. Questions can be sent through the{" "}
          <Link href="/contact">contact form</Link>.
        </p>
      </ProseSection>
    </ContentPage>
  );
}
