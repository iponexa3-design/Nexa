import Script from "next/script";

export const ANALYTICS_CONSENT_KEY = "iponexa:analytics-consent";

/** The GA4 measurement ID, or null when analytics is not configured. */
export function analyticsId(): string | null {
  const id = process.env.NEXT_PUBLIC_GA_ID?.trim();
  return id && /^G-[A-Z0-9]+$/.test(id) ? id : null;
}

/**
 * Google Analytics 4 with Consent Mode: analytics cookies stay off until the
 * visitor accepts in the cookie notice (stored in localStorage). Without
 * consent GA receives only cookieless signals. Renders nothing unless
 * NEXT_PUBLIC_GA_ID is set.
 */
export function GoogleAnalytics() {
  const id = analyticsId();
  if (!id) return null;

  return (
    <>
      <Script id="google-analytics-consent" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
var consent = null;
try { consent = localStorage.getItem('${ANALYTICS_CONSENT_KEY}'); } catch (e) {}
gtag('consent', 'default', {
  analytics_storage: consent === 'granted' ? 'granted' : 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied'
});
gtag('js', new Date());
gtag('config', '${id}');`}
      </Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
    </>
  );
}
