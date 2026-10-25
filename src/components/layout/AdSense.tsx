import Script from "next/script";

/** The AdSense publisher ID ("ca-pub-…"), or null when ads are not configured. */
export function adsenseClient(): string | null {
  const id = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();
  return id && /^ca-pub-\d{10,20}$/.test(id) ? id : null;
}

/**
 * Google AdSense loader for Auto ads (placements are chosen in the AdSense
 * dashboard). Loaded after hydration so the Consent Mode defaults at the top
 * of <body> always run first; site ownership is verified through the
 * "google-adsense-account" meta tag in the root layout metadata.
 */
export function AdSense() {
  const client = adsenseClient();
  if (!client) return null;
  return (
    <Script
      id="google-adsense"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      strategy="afterInteractive"
      crossOrigin="anonymous"
    />
  );
}
