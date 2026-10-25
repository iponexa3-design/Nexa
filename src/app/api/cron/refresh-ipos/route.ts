import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { refreshIpoData } from "@/services/ipo-refresh-service";

// Fetching every status plus GMP/subscription per IPO takes a minute or two.
export const maxDuration = 300;

/**
 * Scheduled refresh of all IPO data. Call with
 * `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sends this header
 * automatically when CRON_SECRET is set). Refuses to run without a secret.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (!isAuthorized(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await refreshIpoData();
    for (const path of ["/", "/gmp-tracker", "/open-ipos", "/upcoming-ipos", "/recently-listed-ipos", "/compare"]) {
      revalidatePath(path);
    }
    revalidatePath("/ipo/[slug]", "page");
    return Response.json({ ok: true, ...summary });
  } catch (error) {
    console.error("Scheduled IPO refresh failed", error);
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}

function isAuthorized(header: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header ?? "");
  return received.length === expected.length && timingSafeEqual(received, expected);
}
