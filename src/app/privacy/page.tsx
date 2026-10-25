import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How IPONexa handles visitor data, cookies, analytics and advertising.",
};

const LAST_UPDATED = "25 October 2026";

export default function PrivacyPage() {
  return (
    <div className="bg-[linear-gradient(180deg,#eaf3f2_0%,#f3f7f6_360px,#f3f7f6_100%)]">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-black text-zinc-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-zinc-500">Last updated {LAST_UPDATED}</p>

        <div className="mt-8 space-y-7 rounded-[22px] border border-[#e0e8e6] bg-white p-6 text-[15px] leading-7 text-zinc-700 shadow-[0_8px_24px_rgba(23,74,82,0.05)] sm:p-8">
          <Section title="Summary">
            IPONexa is an information website about Indian IPOs. You can use it without an account,
            and we do not ask for your name, phone number, PAN or any financial details. We do not sell
            or rent any data. The site is free and is supported by advertising from Google AdSense.
          </Section>

          <Section title="What we collect">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Visitor statistics (only if you accept cookies):</strong> we use Google Analytics to
                count visits and see which pages are used, such as pages viewed, approximate location
                (city or country), device and browser type, and how you arrived at the site. Google
                Analytics sets cookies for this. If you decline, analytics cookies are not set, and
                Google receives only basic signals without cookies.
              </li>
              <li>
                <strong>Server logs:</strong> like nearly every website, our server automatically records
                technical details of each request (IP address, time, page requested, browser) to keep the
                site secure and working. These logs are kept for a limited time and not used to identify you.
              </li>
              <li>
                <strong>Settings in your browser:</strong> preferences such as grid or list view and your
                cookie choice are stored only in your own browser (local storage), not on our servers.
              </li>
            </ul>
          </Section>

          <Section title="Advertising">
            We show ads through Google AdSense. Google and its partners may use cookies to serve ads based
            on your visits to this and other websites, but only if you accept cookies in the notice shown
            on your first visit. If you decline, Google shows non-personalised ads, which rely on the page
            you are viewing rather than on a profile of you. You can manage or turn off ad personalisation at{" "}
            <a href="https://adssettings.google.com" target="_blank" rel="noreferrer" className="font-semibold text-[#174a52] underline underline-offset-4">
              Google Ad Settings
            </a>
            , and learn how Google uses data at{" "}
            <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noreferrer" className="font-semibold text-[#174a52] underline underline-offset-4">
              How Google uses information from sites that use its services
            </a>
            . Ads are provided by Google and are not recommendations from IPONexa.
          </Section>

          <Section title="How we use it">
            Only to run, secure and improve the website: for example, to see which IPO pages are useful
            and to detect technical problems. We do not use it to contact you, and we do not build
            advertising profiles ourselves.
          </Section>

          <Section title="Third parties">
            Visitor statistics and advertising are processed by Google (Google Analytics and Google
            AdSense) under{" "}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="font-semibold text-[#174a52] underline underline-offset-4">
              Google&apos;s privacy policy
            </a>
            . The website is hosted on servers in India. IPO data shown on the site comes from public and
            licensed market data sources; no visitor data is shared with them.
          </Section>

          <Section title="Your choices">
            You can accept or decline analytics and advertising cookies in the notice shown on your first visit. To change
            your choice later, clear this site&apos;s data in your browser settings and the notice will
            appear again. You can also block cookies in your browser or use Google&apos;s{" "}
            <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noreferrer" className="font-semibold text-[#174a52] underline underline-offset-4">
              Analytics opt-out add-on
            </a>
            .
          </Section>

          <Section title="Changes">
            We may update this policy when the website changes. The date at the top shows the latest version.
          </Section>
        </div>

        <p className="mt-6 text-sm text-zinc-500">
          <Link href="/" className="font-semibold text-[#174a52] underline underline-offset-4">Back to IPONexa</Link>
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-bold text-zinc-900">{title}</h2>
      <div>{children}</div>
    </section>
  );
}
