/** The AdSense publisher ID ("ca-pub-…"), or null when ads are not configured. */
export function adsenseClient(): string | null {
  const id = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();
  return id && /^ca-pub-\d{10,20}$/.test(id) ? id : null;
}

/**
 * Google AdSense loader for Auto ads (placements are chosen in the AdSense
 * dashboard). React hoists this async script into <head>, where AdSense
 * looks for it during site review. Ad personalisation follows the visitor's
 * cookie choice through Google Consent Mode (see GoogleAnalytics/CookieNotice).
 */
export function AdSense() {
  const client = adsenseClient();
  if (!client) return null;
  return (
    <script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      crossOrigin="anonymous"
    />
  );
}
