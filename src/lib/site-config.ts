export const siteConfig = {
  name: "IPONexa",
  description:
    "Indian IPO data, GMP, subscription status and estimated listing gains - for informational purposes only.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  nav: [
    { label: "Home", href: "/" },
    { label: "GMP Tracker", href: "/gmp-tracker" },
    { label: "Open IPOs", href: "/open-ipos" },
    { label: "Upcoming IPOs", href: "/upcoming-ipos" },
    { label: "Recently Listed", href: "/recently-listed-ipos" },
    { label: "Compare IPO", href: "/compare" },
  ],
};
