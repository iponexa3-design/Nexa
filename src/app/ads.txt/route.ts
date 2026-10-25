import { adsenseClient } from "@/components/layout/AdSense";

/**
 * https://iponexa.com/ads.txt: declares Google as an authorised seller of
 * this site's ad space (required by AdSense). f08c47fec0942fa0 is Google's
 * fixed certification authority ID.
 */
export function GET() {
  const client = adsenseClient();
  const body = client
    ? `google.com, ${client.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n`
    : "# No advertising configured.\n";
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" },
  });
}
