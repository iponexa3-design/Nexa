import { siteConfig } from "@/lib/site-config";

/**
 * Brand mark: ascending bars (IPO listing sizes) with an upward trend line
 * and a dot (GMP-based estimated gain) — ties the icon to the product idea
 * of turning IPO + GMP data into an estimated listing trend.
 */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ipx-logo-grad" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0" stopColor="#4f46e5" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#ipx-logo-grad)" />
      <rect x="6" y="18" width="4" height="8" rx="1.2" fill="#ffffff" fillOpacity="0.55" />
      <rect x="13" y="13" width="4" height="13" rx="1.2" fill="#ffffff" fillOpacity="0.75" />
      <rect x="20" y="7" width="4" height="19" rx="1.2" fill="#ffffff" />
      <path
        d="M6.5 16.5 13 11.5 19.5 6"
        stroke="#ffffff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="20" cy="5.5" r="2" fill="#ffffff" />
    </svg>
  );
}

export function Logo({ iconClassName = "h-8 w-8" }: { iconClassName?: string }) {
  return (
    <span className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
      <LogoMark className={iconClassName} />
      <span className="text-zinc-900">
        IPO
        <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
          Nexa
        </span>
      </span>
      <span className="sr-only">{siteConfig.name}</span>
    </span>
  );
}
