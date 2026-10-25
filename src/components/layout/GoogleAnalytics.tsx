import Script from "next/script";

/**
 * Google Analytics 4 visitor statistics. Renders nothing unless
 * NEXT_PUBLIC_GA_ID holds a measurement ID ("G-…"), so local development
 * and builds without an ID send no data. GA4's enhanced measurement counts
 * client-side page changes automatically.
 */
export function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID?.trim();
  if (!id || !/^G-[A-Z0-9]+$/.test(id)) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');`}
      </Script>
    </>
  );
}
