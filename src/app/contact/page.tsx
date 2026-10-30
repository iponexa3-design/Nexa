import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Send a message to the IPONexa team: questions, corrections or feedback about IPO data.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="bg-[linear-gradient(180deg,#eaf3f2_0%,#f3f7f6_360px,#f3f7f6_100%)]">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-black text-zinc-900">Contact Us</h1>
        <p className="mt-2 max-w-xl text-[15px] leading-7 text-zinc-600">
          Questions, a correction to an IPO&apos;s data, or feedback about the site? Send us a message and
          we will reply by email.
        </p>

        <div className="relative mt-8 rounded-[22px] border border-[#e0e8e6] bg-white p-6 shadow-[0_8px_24px_rgba(23,74,82,0.05)] sm:p-8">
          <ContactForm />
        </div>

        <div className="mt-8 space-y-5 text-[15px] leading-7 text-zinc-700">
          <section>
            <h2 className="mb-1 text-lg font-bold text-zinc-900">Reporting a data error</h2>
            <p>
              Please include the IPO name, the figure that looks wrong, and where you saw the correct value (for
              example the offer document or an exchange notice). We check every correction against the original
              source before changing anything. You can see where each figure comes from on the{" "}
              <Link href="/about" className="font-semibold text-[#174a52] underline underline-offset-4">
                About page
              </Link>
              .
            </p>
          </section>
          <section>
            <h2 className="mb-1 text-lg font-bold text-zinc-900">What we cannot help with</h2>
            <p>
              We cannot give investment advice or tell you whether to apply for an IPO, and we cannot check or change
              an IPO application or allotment. For allotment questions, contact the IPO&apos;s registrar or your
              broker; the{" "}
              <Link href="/ipo-allotment-status" className="font-semibold text-[#174a52] underline underline-offset-4">
                allotment status page
              </Link>{" "}
              links to the registrars.
            </p>
          </section>
          <section>
            <h2 className="mb-1 text-lg font-bold text-zinc-900">Stay safe</h2>
            <p>
              IPONexa never asks for your PAN, demat details, passwords, OTPs or payments, and does not offer paid
              tips. Treat any message claiming otherwise as fraudulent.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
