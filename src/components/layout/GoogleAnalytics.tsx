import Script from "next/script";

export const ANALYTICS_CONSENT_KEY = "iponexa:analytics-consent";

/** The GA4 measurement ID, or null when analytics is not configured. */
export function analyticsId(): string | null {
  const id = process.env.NEXT_PUBLIC_GA_ID?.trim();
  return id && /^G-[A-Z0-9]+$/.test(id) ? id : null;
}

/**
 * Google Consent Mode defaults, set before any Google script loads: analytics
 * and ad cookies stay off until the visitor clicks "Accept" in the cookie
 * notice (choice kept in localStorage). Without consent, Analytics gets only
 * cookieless signals and AdSense shows non-personalised ads.
 */
export function ConsentDefaults() {
  return (
    <Script id="google-consent-defaults" strategy="beforeInteractive">
      {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
var consent = null;
try { consent = localStorage.getItem('${ANALYTICS_CONSENT_KEY}'); } catch (e) {}
var state = consent === 'granted' ? 'granted' : 'denied';
gtag('consent', 'default', {
  analytics_storage: state,
  ad_storage: state,
  ad_user_data: state,
  ad_personalization: state
});`}
    </Script>
  );
}

/** Google Analytics 4. Renders nothing unless NEXT_PUBLIC_GA_ID is set. */
export function GoogleAnalytics() {
  const id = analyticsId();
  if (!id) return null;

  return (
    <>
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');`}
      </Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
    </>
  );
}
