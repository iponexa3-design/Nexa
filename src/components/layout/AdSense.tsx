/** The AdSense publisher ID ("ca-pub-…"), or null when ads are not configured. */
export function adsenseClient(): string | null {
  const id = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();
  return id && /^ca-pub-\d{10,20}$/.test(id) ? id : null;
}

/**
 * Google AdSense loader for Auto ads (placements are chosen in the AdSense
 * dashboard). A plain script tag so it is in the server HTML, where AdSense's
 * site verification looks for it. `defer` (not `async`) keeps it in place
 * instead of being hoisted into <head>, so it always runs after the Consent
 * Mode defaults at the top of <body>.
 */
export function AdSense() {
  const client = adsenseClient();
  if (!client) return null;
  return (
    <script
      id="google-adsense"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      defer
      crossOrigin="anonymous"
    />
  );
}
