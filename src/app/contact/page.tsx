import type { Metadata } from "next";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Send a message to the IPONexa team: questions, corrections or feedback about IPO data.",
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

        <p className="mt-6 text-sm leading-6 text-zinc-500">
          We cannot give investment advice or tell you whether to apply for an IPO.
        </p>
      </div>
    </div>
  );
}
