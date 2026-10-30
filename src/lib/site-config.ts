export const siteConfig = {
  name: "IPONexa",
  description:
    "Indian IPO data in one place: open and upcoming issues, grey market premium (GMP), official subscription figures, allotment links and actual listing results. Information only, not investment advice.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  nav: [
    { label: "Home", href: "/" },
    { label: "GMP Tracker", href: "/gmp-tracker" },
    { label: "Subscription", href: "/ipo-subscription" },
    { label: "Open IPOs", href: "/open-ipos" },
    { label: "Upcoming IPOs", href: "/upcoming-ipos" },
    { label: "Recently Listed", href: "/recently-listed-ipos" },
    { label: "Compare IPO", href: "/compare" },
    { label: "Allotment Status", href: "/ipo-allotment-status" },
  ],
  /** Footer links: learning material and the trust/legal pages. */
  footerNav: [
    { label: "IPO Guides", href: "/guides" },
    { label: "About", href: "/about" },
    { label: "Contact us", href: "/contact" },
    { label: "Disclaimer", href: "/disclaimer" },
    { label: "Terms of use", href: "/terms" },
    { label: "Privacy policy", href: "/privacy" },
  ],
  /**
   * Who runs the site, shown on the About page. Left empty on purpose: fill
   * in real details only (e.g. "Operated by <name>, <city>, India").
   */
  operator: null as string | null,
};
